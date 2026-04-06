import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { retryFetch } from '../retry-fetch';

@Injectable()
export class VideoRetalkProvider {
  readonly providerId = 'aliyun-videoretalk';
  readonly displayName = 'Aliyun VideoRetalk';

  constructor(private readonly config: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('DASHSCOPE_API_KEY');
  }

  async submitVideoRetalkJob(input: {
    videoUrl: string;
    audioUrl: string;
    refImageUrl?: string;
    videoExtension?: boolean;
    queryFaceThreshold?: number;
  }): Promise<{ taskId: string; status: string; requestId?: string }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY');
    const response = await retryFetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: 'videoretalk',
          input: {
            video_url: input.videoUrl,
            audio_url: input.audioUrl,
            ...(input.refImageUrl ? { ref_image_url: input.refImageUrl } : {}),
          },
          parameters: {
            ...(input.videoExtension !== undefined ? { video_extension: input.videoExtension } : {}),
            ...(input.queryFaceThreshold !== undefined ? { query_face_threshold: input.queryFaceThreshold } : {}),
          },
        }),
      },
    );

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(this.translateError(data?.output?.code || data?.code, data?.output?.message || data?.message || response.statusText));
    }

    return {
      taskId: data.output?.task_id,
      status: data.output?.task_status || 'PENDING',
      requestId: data.request_id,
    };
  }

  async checkTaskStatus(taskId: string): Promise<{
    status: string;
    videoUrl?: string;
    requestId?: string;
    errorCode?: string;
    errorMessage?: string;
    usage?: {
      videoDuration?: number;
      videoRatio?: string;
      size?: string;
      fps?: number;
    };
  }> {
    const apiKey = this.config.get<string>('DASHSCOPE_API_KEY');
    const response = await retryFetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const data: any = await response.json();
    const usage = data.usage
      ? {
          videoDuration: data.usage.video_duration,
          videoRatio: data.usage.video_ratio,
          size: data.usage.size,
          fps: data.usage.fps,
        }
      : undefined;

    return {
      status: data.output?.task_status || 'UNKNOWN',
      videoUrl: data.output?.video_url,
      requestId: data.request_id,
      errorCode: data.output?.code,
      errorMessage: data.output?.code
        ? this.translateError(data.output?.code, data.output?.message)
        : undefined,
      usage,
    };
  }

  private translateError(code?: string, message?: string) {
    if (code === 'InvalidFile.FPS') {
      return '输入视频帧率需在 15 到 60fps 之间';
    }
    if (code === 'InvalidFile.Resolution') {
      return '输入视频边长需在 640 到 2048 像素之间';
    }
    if (code === 'InvalidFile.Duration') {
      return '输入视频或音频时长需在 2 到 120 秒之间';
    }
    if (code === 'InvalidFile.FaceNotMatch') {
      return '参考图与视频中的目标人脸不匹配';
    }
    if (code === 'InvalidURL.ConnectionRefused' || code === 'InvalidURL.Timeout') {
      return '媒体下载失败，请检查公网链接可访问性';
    }
    return message || code || 'VideoRetalk 调用失败';
  }
}
