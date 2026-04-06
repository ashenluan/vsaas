import { BadRequestException, Injectable } from '@nestjs/common';
import type { DigitalHumanDriveModeId, DigitalHumanEngineId } from './digital-human-capabilities';

type AssetKind = 'video' | 'audio' | 'image';

type AssetProbeResult = {
  url: string;
  extension: string;
  contentType?: string;
  contentLength?: number;
  accessible: boolean;
};

type PreflightInput = {
  engine: DigitalHumanEngineId;
  driveMode: DigitalHumanDriveModeId;
  resolution: string;
  videoUrl?: string;
  audioUrl?: string;
  refImageUrl?: string;
};

const VIDEORETALK_EXTENSIONS: Record<AssetKind, string[]> = {
  video: ['mp4', 'avi', 'mov'],
  audio: ['wav', 'mp3', 'aac'],
  image: ['jpeg', 'jpg', 'png', 'bmp', 'webp'],
};

@Injectable()
export class MediaPreflightService {
  async preflightCreateVideo(input: PreflightInput): Promise<{
    status: 'passed' | 'warning';
    warnings: string[];
    assets: {
      video?: AssetProbeResult;
      audio?: AssetProbeResult;
      refImage?: AssetProbeResult;
    };
  }> {
    const assets: {
      video?: AssetProbeResult;
      audio?: AssetProbeResult;
      refImage?: AssetProbeResult;
    } = {};

    if (input.engine === 'videoretalk') {
      if (input.videoUrl) {
        assets.video = await this.probeRemoteAsset(input.videoUrl, 'video', 'videoretalk');
      }
      if (input.audioUrl) {
        assets.audio = await this.probeRemoteAsset(input.audioUrl, 'audio', 'videoretalk');
      }
      if (input.refImageUrl) {
        assets.refImage = await this.probeRemoteAsset(input.refImageUrl, 'image', 'videoretalk');
      }

      return {
        status: 'warning',
        warnings: ['当前环境未启用深度媒体探测，已跳过时长、帧率和编码校验'],
        assets,
      };
    }

    return {
      status: 'passed',
      warnings: [],
      assets,
    };
  }

  private async probeRemoteAsset(
    url: string,
    kind: AssetKind,
    engine: DigitalHumanEngineId,
  ): Promise<AssetProbeResult> {
    const extension = this.getExtension(url);

    if (engine === 'videoretalk' && !VIDEORETALK_EXTENSIONS[kind].includes(extension)) {
      throw new BadRequestException(this.buildUnsupportedExtensionMessage(kind));
    }

    const response = await fetch(url, {
      method: 'HEAD',
    });

    if (!response.ok) {
      throw new BadRequestException(`${this.assetLabel(kind)}无法访问，请检查公网链接是否可用`);
    }

    const contentLength = response.headers.get('content-length');

    return {
      url,
      extension,
      contentType: response.headers.get('content-type') || undefined,
      contentLength: contentLength ? Number(contentLength) : undefined,
      accessible: true,
    };
  }

  private getExtension(url: string) {
    try {
      const pathname = new URL(url).pathname;
      const lastSegment = pathname.split('/').pop() || '';
      return lastSegment.includes('.') ? lastSegment.split('.').pop()!.toLowerCase() : '';
    } catch {
      throw new BadRequestException('媒体链接格式不正确');
    }
  }

  private assetLabel(kind: AssetKind) {
    if (kind === 'video') return '源视频';
    if (kind === 'audio') return '音频';
    return '参考图';
  }

  private buildUnsupportedExtensionMessage(kind: AssetKind) {
    if (kind === 'video') {
      return 'VideoRetalk 仅支持 mp4、avi、mov 源视频';
    }
    if (kind === 'audio') {
      return 'VideoRetalk 仅支持 wav、mp3、aac 音频';
    }
    return 'VideoRetalk 仅支持 jpeg、jpg、png、bmp、webp 参考图';
  }
}
