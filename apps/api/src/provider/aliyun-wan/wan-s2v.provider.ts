import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DigitalHumanProvider {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  detectImage(imageUrl: string): Promise<{ valid: boolean; result: any }>;
  generateVideo(imageUrl: string, audioUrl: string, resolution?: string): Promise<{ taskId: string; status: string }>;
  checkTaskStatus(taskId: string): Promise<{ status: string; videoUrl?: string; progress?: number }>;
}

@Injectable()
export class WanS2VProvider implements DigitalHumanProvider {
  readonly providerId = 'aliyun-wan';
  readonly displayName = '万相数字人 S2V';
  private readonly logger = new Logger(WanS2VProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('DASHSCOPE_API_KEY');
  }

  async detectImage(imageUrl: string): Promise<{ valid: boolean; result: any }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY');

    this.logger.log(`Detecting image for S2V: ${imageUrl.slice(0, 80)}`);

    // Use synchronous mode for detect (fast enough, no need for async)
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/image-synthesis', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'wan2.2-s2v-detect',
        input: { image_url: imageUrl },
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`S2V detect error: ${data.message || response.statusText}`);
    }

    // If API returns task_id (async mode fallback), poll for result
    if (data.output?.task_id && !data.output?.result) {
      return this.pollDetectResult(apiKey!, data.output.task_id);
    }

    return {
      valid: data.output?.result === 'pass',
      result: data.output,
    };
  }

  private async pollDetectResult(apiKey: string, taskId: string): Promise<{ valid: boolean; result: any }> {
    const maxAttempts = 30;
    const interval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      const data: any = await response.json();
      const status = data.output?.task_status;

      if (status === 'SUCCEEDED') {
        return {
          valid: data.output?.result === 'pass',
          result: data.output,
        };
      }
      if (status === 'FAILED') {
        throw new Error(`S2V detect failed: ${data.output?.message || 'Unknown error'}`);
      }
    }

    throw new Error('S2V detect timed out');
  }

  async generateVideo(imageUrl: string, audioUrl: string, resolution: string = '720P'): Promise<{ taskId: string; status: string }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY');

    this.logger.log(`Generating S2V video: image=${imageUrl.slice(0, 50)}`);

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/image-synthesis', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wan2.2-s2v',
        input: {
          image_url: imageUrl,
          audio_url: audioUrl,
        },
        parameters: {
          resolution,
        },
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`S2V generate error: ${data.message || response.statusText}`);
    }

    return {
      taskId: data.output?.task_id,
      status: data.output?.task_status || 'PENDING',
    };
  }

  async checkTaskStatus(taskId: string): Promise<{ status: string; videoUrl?: string; progress?: number }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY');

    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data: any = await response.json();

    return {
      status: data.output?.task_status || 'UNKNOWN',
      videoUrl: data.output?.video_url,
      progress: data.output?.progress,
    };
  }
}
