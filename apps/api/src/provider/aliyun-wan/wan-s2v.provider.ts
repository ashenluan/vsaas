import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { retryFetch } from '../retry-fetch';

export interface DigitalHumanProvider {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  detectImage(imageUrl: string): Promise<{ valid: boolean; result: any }>;
  generateVideo(imageUrl: string, audioUrl: string, resolution?: string): Promise<{ taskId: string; status: string }>;
  checkTaskStatus(taskId: string): Promise<{ status: string; videoUrl?: string; progress?: number; errorCode?: string; errorMessage?: string }>;
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
    const response = await retryFetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/face-detect', {
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

    if (!response.ok || data.code) {
      const msg = data.message || response.statusText;
      throw new Error(this.translateDetectError(msg));
    }

    return {
      valid: data.output?.check_pass === true,
      result: data.output,
    };
  }

  private translateDetectError(msg: string): string {
    if (msg.includes('image resolution is invalid')) {
      return '图片分辨率不符合要求：宽度和高度需在400~7000像素之间。支持格式：jpg、jpeg、png、bmp、webp。';
    }
    if (msg.includes('url error')) {
      return '图片地址无法访问，请确保图片为公网可访问的HTTP/HTTPS链接。';
    }
    if (msg.includes('image download') || msg.includes('fetch image')) {
      return '图片下载失败，请检查图片链接是否有效。';
    }
    if (msg.includes('face') && msg.includes('not found')) {
      return '未检测到人脸，请上传包含清晰人脸的正面照片。';
    }
    return `人脸检测失败: ${msg}`;
  }

  private async pollDetectResult(apiKey: string, taskId: string): Promise<{ valid: boolean; result: any }> {
    const maxAttempts = 30;
    const interval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      const response = await retryFetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
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

    const response = await retryFetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis', {
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

  async checkTaskStatus(taskId: string): Promise<{ status: string; videoUrl?: string; progress?: number; errorCode?: string; errorMessage?: string }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY');

    const response = await retryFetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data: any = await response.json();

    // S2V returns video_url at output.results.video_url (results is an object, not array)
    const videoUrl = data.output?.video_url
      || data.output?.results?.video_url
      || data.output?.results?.[0]?.video_url;

    return {
      status: data.output?.task_status || 'UNKNOWN',
      videoUrl,
      progress: data.output?.progress,
      errorCode: data.output?.code,
      errorMessage: data.output?.message,
    };
  }
}
