import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaPreflightService } from './media-preflight.service';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeHeadResponse(status: number, headers: Record<string, string>): Response {
  return new Response(null, { status, headers });
}

describe('MediaPreflightService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('collects remote asset metadata for videoretalk inputs and returns warnings when deep probe is unavailable', async () => {
    mockFetch
      .mockResolvedValueOnce(makeHeadResponse(200, {
        'content-type': 'video/mp4',
        'content-length': '1048576',
      }))
      .mockResolvedValueOnce(makeHeadResponse(200, {
        'content-type': 'audio/wav',
        'content-length': '2048',
      }))
      .mockResolvedValueOnce(makeHeadResponse(200, {
        'content-type': 'image/png',
        'content-length': '1024',
      }));

    const service = new MediaPreflightService();
    const result = await service.preflightCreateVideo({
      engine: 'videoretalk',
      driveMode: 'audio',
      resolution: 'source',
      videoUrl: 'https://example.com/source.mp4',
      audioUrl: 'https://example.com/voice.wav',
      refImageUrl: 'https://example.com/ref.png',
    });

    expect(result).toEqual({
      status: 'warning',
      warnings: ['当前环境未启用深度媒体探测，已跳过时长、帧率和编码校验'],
      assets: {
        video: expect.objectContaining({
          url: 'https://example.com/source.mp4',
          extension: 'mp4',
          contentType: 'video/mp4',
          contentLength: 1048576,
          accessible: true,
        }),
        audio: expect.objectContaining({
          url: 'https://example.com/voice.wav',
          extension: 'wav',
          contentType: 'audio/wav',
          contentLength: 2048,
          accessible: true,
        }),
        refImage: expect.objectContaining({
          url: 'https://example.com/ref.png',
          extension: 'png',
          contentType: 'image/png',
          contentLength: 1024,
          accessible: true,
        }),
      },
    });
  });

  it('rejects unsupported videoretalk video extensions before remote submission', async () => {
    const service = new MediaPreflightService();

    await expect(
      service.preflightCreateVideo({
        engine: 'videoretalk',
        driveMode: 'audio',
        resolution: 'source',
        videoUrl: 'https://example.com/source.webm',
        audioUrl: 'https://example.com/voice.wav',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects inaccessible remote assets', async () => {
    mockFetch.mockResolvedValueOnce(makeHeadResponse(404, {
      'content-type': 'text/plain',
    }));

    const service = new MediaPreflightService();

    await expect(
      service.preflightCreateVideo({
        engine: 'videoretalk',
        driveMode: 'audio',
        resolution: 'source',
        videoUrl: 'https://example.com/missing.mp4',
        audioUrl: 'https://example.com/voice.wav',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
