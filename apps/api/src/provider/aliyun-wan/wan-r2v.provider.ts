import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { retryFetch } from '../retry-fetch';

export interface R2VMediaItem {
  type: 'reference_image' | 'reference_video' | 'first_frame';
  url: string;
  reference_voice?: string;
}

export interface R2VGenerateInput {
  prompt: string;
  media: R2VMediaItem[];
  negativePrompt?: string;
  resolution?: string;   // '720P' | '1080P'
  duration?: number;     // 2-10
  ratio?: string;        // '16:9' | '9:16' | '1:1' | '4:3' | '3:4'
  promptExtend?: boolean;
  watermark?: boolean;
  seed?: number;
}

@Injectable()
export class WanR2VProvider {
  readonly providerId = 'aliyun-r2v';
  readonly displayName = '万相参考生视频';
  private readonly logger = new Logger(WanR2VProvider.name);

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('DASHSCOPE_API_KEY');
  }

  estimateCost(input: { duration?: number; resolution?: string }): number {
    const duration = input.duration || 5;
    // 720P: ~0.3元/秒, 1080P: ~0.6元/秒 → 积分换算
    const isHD = input.resolution === '1080P' || input.resolution === '1080p';
    return duration * (isHD ? 10 : 5);
  }

  async generateVideo(input: R2VGenerateInput): Promise<{ taskId: string; status: string }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY');

    this.logger.log(`Generating R2V video: prompt=${input.prompt.slice(0, 60)}, media=${input.media.length} items`);

    const body: any = {
      model: 'wan2.7-r2v',
      input: {
        prompt: input.prompt,
        media: input.media.map(m => {
          const item: any = { type: m.type, url: m.url };
          if (m.reference_voice) item.reference_voice = m.reference_voice;
          return item;
        }),
      },
      parameters: {
        resolution: input.resolution || '720P',
        duration: input.duration || 5,
        prompt_extend: input.promptExtend ?? false,
        watermark: input.watermark ?? false,
      },
    };

    if (input.negativePrompt) {
      body.input.negative_prompt = input.negativePrompt;
    }
    if (input.ratio) {
      body.parameters.ratio = input.ratio;
    }
    if (input.seed !== undefined) {
      body.parameters.seed = input.seed;
    }

    const response = await retryFetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!response.ok || data.code) {
      throw new Error(this.translateError(data.code || '', data.message || response.statusText));
    }

    return {
      taskId: data.output?.task_id,
      status: data.output?.task_status || 'PENDING',
    };
  }

  async checkTaskStatus(taskId: string): Promise<{
    status: string;
    videoUrl?: string;
    progress?: number;
    errorCode?: string;
    errorMessage?: string;
    usage?: any;
  }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY');

    const response = await retryFetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data: any = await response.json();
    const rawStatus = data.output?.task_status || 'UNKNOWN';
    const errorCode = data.output?.code || '';
    const errorMessage = data.output?.message || '';

    const translatedError = (rawStatus === 'FAILED' || rawStatus === 'CANCELED')
      ? this.translateError(errorCode, errorMessage)
      : errorMessage;

    return {
      status: rawStatus,
      videoUrl: data.output?.video_url,
      progress: data.output?.progress,
      errorCode,
      errorMessage: translatedError,
      usage: data.usage,
    };
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY');
    try {
      const response = await retryFetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}/cancel`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        },
        { maxRetries: 1 },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private translateError(code: string, message: string): string {
    if (code === 'DataInspectionFailed' || message.includes('DataInspectionFailed')) {
      return '内容审核未通过，请检查输入的图片/视频/音频是否合规后重试。';
    }
    if (code === 'Throttling' || message.includes('Throttling')) {
      return '请求过于频繁，请稍后再试。';
    }
    if (code === 'Arrearage' || message.includes('Arrearage')) {
      return '阿里云账户余额不足，请充值后重试。';
    }
    if (code === 'BadRequest.TooLarge' || message.includes('TooLarge')) {
      return '文件过大，请压缩后重试。';
    }
    if (code === 'InvalidParameter' || message.includes('InvalidParameter')) {
      return `参数错误: ${message}`;
    }
    if (message.includes('size is not match')) {
      return '素材分辨率不符合要求，请检查图片/视频尺寸。';
    }
    return message || code || '未知错误';
  }
}
