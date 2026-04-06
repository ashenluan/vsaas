import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { VideoRetalkProvider } from './video-retalk.provider';

const { retryFetchMock } = vi.hoisted(() => ({
  retryFetchMock: vi.fn(),
}));

vi.mock('../retry-fetch', () => ({
  retryFetch: retryFetchMock,
}));

function makeJsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

describe('VideoRetalkProvider', () => {
  beforeEach(() => {
    retryFetchMock.mockReset();
  });

  it('submits videoretalk jobs with the documented request payload', async () => {
    retryFetchMock.mockResolvedValueOnce(
      makeJsonResponse({
        output: {
          task_id: 'retalk-task-1',
          task_status: 'PENDING',
        },
        request_id: 'request-1',
      }),
    );

    const provider = new VideoRetalkProvider(
      new ConfigService({ DASHSCOPE_API_KEY: 'sk-test' }),
    );

    const result = await provider.submitVideoRetalkJob({
      videoUrl: 'https://example.com/source.mp4',
      audioUrl: 'https://example.com/voice.wav',
      refImageUrl: 'https://example.com/ref.png',
      videoExtension: true,
      queryFaceThreshold: 180,
    });

    expect(retryFetchMock).toHaveBeenCalledWith(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        }),
        body: JSON.stringify({
          model: 'videoretalk',
          input: {
            video_url: 'https://example.com/source.mp4',
            audio_url: 'https://example.com/voice.wav',
            ref_image_url: 'https://example.com/ref.png',
          },
          parameters: {
            video_extension: true,
            query_face_threshold: 180,
          },
        }),
      }),
    );
    expect(result).toEqual({
      taskId: 'retalk-task-1',
      status: 'PENDING',
      requestId: 'request-1',
    });
  });

  it('normalizes task query results including output usage metadata', async () => {
    retryFetchMock.mockResolvedValueOnce(
      makeJsonResponse({
        request_id: 'request-2',
        output: {
          task_id: 'retalk-task-1',
          task_status: 'SUCCEEDED',
          video_url: 'https://example.com/final.mp4',
        },
        usage: {
          video_duration: 7.2,
          video_ratio: 'standard',
          size: '1080*1920',
          fps: 25,
        },
      }),
    );

    const provider = new VideoRetalkProvider(
      new ConfigService({ DASHSCOPE_API_KEY: 'sk-test' }),
    );

    const result = await provider.checkTaskStatus('retalk-task-1');

    expect(result).toEqual({
      status: 'SUCCEEDED',
      videoUrl: 'https://example.com/final.mp4',
      requestId: 'request-2',
      usage: {
        videoDuration: 7.2,
        videoRatio: 'standard',
        size: '1080*1920',
        fps: 25,
      },
    });
  });

  it('translates failed task payloads into user-facing provider errors', async () => {
    retryFetchMock.mockResolvedValueOnce(
      makeJsonResponse({
        request_id: 'request-3',
        output: {
          task_id: 'retalk-task-1',
          task_status: 'FAILED',
          code: 'InvalidFile.FPS',
          message: 'Invalid video FPS. The video FPS must be 15 ~ 60.',
        },
      }),
    );

    const provider = new VideoRetalkProvider(
      new ConfigService({ DASHSCOPE_API_KEY: 'sk-test' }),
    );

    const result = await provider.checkTaskStatus('retalk-task-1');

    expect(result).toEqual({
      status: 'FAILED',
      requestId: 'request-3',
      errorCode: 'InvalidFile.FPS',
      errorMessage: '输入视频帧率需在 15 到 60fps 之间',
      usage: undefined,
    });
  });
});
