import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DhBatchV2Processor } from './dh-batch-v2.processor';

function createPrismaMock() {
  return {
    generation: {
      update: vi.fn().mockResolvedValue(undefined),
      findUnique: vi.fn().mockResolvedValue({ creditsUsed: 20 }),
    },
  };
}

function createProvidersMock() {
  return {
    voiceProvider: {
      synthesizeSpeech: vi.fn().mockResolvedValue({
        audioUrl: 'https://example.com/tts-audio.mp3',
      }),
    },
    digitalHumanProvider: {
      generateVideo: vi.fn(),
      checkTaskStatus: vi.fn(),
    },
    batchComposeProvider: {
      submitTimelineJob: vi.fn().mockResolvedValue({ jobId: 'ims-timeline-job-1' }),
      checkMediaProducingJobStatus: vi.fn(),
    },
  };
}

function createUserServiceMock() {
  return {
    addCredits: vi.fn().mockResolvedValue(undefined),
  };
}

function createStorageMock() {
  return {
    generateKey: vi.fn((prefix: string, filename: string) => `${prefix}/${filename}`),
    getOssUrl: vi.fn((key: string) => `https://bucket.oss-cn-shanghai.aliyuncs.com/${key}`),
    validateOssRegion: vi.fn(() => ({ valid: true })),
    copyExternalToOss: vi.fn(),
  };
}

function createWsMock() {
  return {
    sendToUser: vi.fn(),
  };
}

describe('DhBatchV2Processor speech-rate propagation', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let providers: ReturnType<typeof createProvidersMock>;
  let userService: ReturnType<typeof createUserServiceMock>;
  let storage: ReturnType<typeof createStorageMock>;
  let ws: ReturnType<typeof createWsMock>;
  let processor: DhBatchV2Processor;

  beforeEach(() => {
    prisma = createPrismaMock();
    providers = createProvidersMock();
    userService = createUserServiceMock();
    storage = createStorageMock();
    ws = createWsMock();

    processor = new DhBatchV2Processor(
      prisma as any,
      providers as any,
      userService as any,
      storage as any,
      ws as any,
    );
  });

  it('passes speech rate into TTS for channel A jobs', async () => {
    vi.spyOn(processor as any, 'planSegments').mockReturnValue([
      { index: 0, type: 'DH', text: '通道A语速测试', scriptId: 'script-a', status: 'pending' },
    ]);
    vi.spyOn(processor as any, 'persistPipelineState').mockResolvedValue(undefined);
    vi.spyOn(processor as any, 'buildTimeline').mockReturnValue({});
    vi.spyOn(processor as any, 'pollTimelineJobs').mockResolvedValue([
      { videoIndex: 0, mediaUrl: 'https://example.com/output-a.mp4' },
    ]);

    await processor.process({
      data: {
        jobId: 'job-a',
        userId: 'user-1',
        channel: 'A',
        input: {
          builtinAvatarId: 'ims-avatar-1',
          voiceId: 'voice-1',
          scripts: [{ id: 'script-a', title: '脚本 A', content: '通道A语速测试' }],
          materials: [{ id: 'mat-1', name: '素材 1', type: 'VIDEO', url: 'https://example.com/mat-a.mp4' }],
          videoCount: 1,
          resolution: '1080x1920',
          speechRate: 1.4,
        },
      },
    } as any);

    expect(providers.voiceProvider.synthesizeSpeech).toHaveBeenCalledWith(
      '通道A语速测试',
      'voice-1',
      expect.objectContaining({
        speechRate: 1.4,
      }),
    );
  });

  it('passes speech rate into TTS for channel B jobs', async () => {
    vi.spyOn(processor as any, 'planSegments').mockReturnValue([
      { index: 0, type: 'DH', text: '通道B语速测试', scriptId: 'script-b', status: 'pending' },
    ]);
    vi.spyOn(processor as any, 'persistPipelineState').mockResolvedValue(undefined);
    vi.spyOn(processor as any, 'runS2vPhase').mockImplementation(async (segments: any[]) => {
      for (const segment of segments) {
        segment.status = 's2v_done';
        segment.s2vVideoUrl = 'https://example.com/s2v-b.mp4';
      }
    });
    vi.spyOn(processor as any, 'reuploadS2vVideos').mockResolvedValue(undefined);
    vi.spyOn(processor as any, 'buildTimeline').mockReturnValue({});
    vi.spyOn(processor as any, 'pollTimelineJobs').mockResolvedValue([
      { videoIndex: 0, mediaUrl: 'https://example.com/output-b.mp4' },
    ]);

    await processor.process({
      data: {
        jobId: 'job-b',
        userId: 'user-1',
        channel: 'B',
        input: {
          avatarUrl: 'https://example.com/avatar-b.png',
          voiceId: 'voice-1',
          scripts: [{ id: 'script-b', title: '脚本 B', content: '通道B语速测试' }],
          materials: [{ id: 'mat-1', name: '素材 1', type: 'VIDEO', url: 'https://example.com/mat-b.mp4' }],
          videoCount: 1,
          resolution: '1080x1920',
          speechRate: 0.8,
        },
      },
    } as any);

    expect(providers.voiceProvider.synthesizeSpeech).toHaveBeenCalledWith(
      '通道B语速测试',
      'voice-1',
      expect.objectContaining({
        speechRate: 0.8,
      }),
    );
  });
});
