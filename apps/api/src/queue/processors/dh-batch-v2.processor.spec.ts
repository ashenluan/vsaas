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

  it('passes speech rate into native IMS avatar clips for channel A jobs', async () => {
    vi.spyOn(processor as any, 'planSegments').mockReturnValue([
      { index: 0, type: 'DH', text: '通道A语速测试', scriptId: 'script-a', status: 'pending' },
    ]);
    vi.spyOn(processor as any, 'persistPipelineState').mockResolvedValue(undefined);
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

    expect(providers.voiceProvider.synthesizeSpeech).not.toHaveBeenCalled();

    const submittedTimeline = providers.batchComposeProvider.submitTimelineJob.mock.calls[0][0];
    expect(submittedTimeline.VideoTracks[0].VideoTrackClips[0]).toEqual(expect.objectContaining({
      Type: 'AI_Avatar',
      Content: '通道A语速测试',
      CustomizedVoice: 'voice-1',
      SpeechRate: 1.4,
    }));
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

  it('uses native IMS text driving for channel A DH segments and keeps TTS only for MAT narration', async () => {
    vi.spyOn(processor as any, 'planSegments').mockReturnValue([
      { index: 0, type: 'DH', text: '数字人口播台词', scriptId: 'script-a', status: 'pending' },
      { index: 1, type: 'MAT', text: '素材旁白文案', scriptId: 'script-a', status: 'pending' },
    ]);
    vi.spyOn(processor as any, 'persistPipelineState').mockResolvedValue(undefined);
    vi.spyOn(processor as any, 'pollTimelineJobs').mockResolvedValue([
      { videoIndex: 0, mediaUrl: 'https://example.com/output-a.mp4' },
    ]);

    await processor.process({
      data: {
        jobId: 'job-a-native',
        userId: 'user-1',
        channel: 'A',
        input: {
          builtinAvatarId: 'ims-avatar-1',
          voiceId: 'voice-cloned-1',
          scripts: [{ id: 'script-a', title: '脚本 A', content: '数字人口播台词。素材旁白文案。' }],
          materials: [{ id: 'mat-1', name: '素材 1', type: 'VIDEO', url: 'https://example.com/mat-a.mp4' }],
          videoCount: 1,
          resolution: '1080x1920',
          subtitleConfig: {
            open: true,
          },
        },
      },
    } as any);

    expect(providers.voiceProvider.synthesizeSpeech).toHaveBeenCalledTimes(1);
    expect(providers.voiceProvider.synthesizeSpeech).toHaveBeenCalledWith(
      '素材旁白文案',
      'voice-cloned-1',
      undefined,
    );

    const submittedTimeline = providers.batchComposeProvider.submitTimelineJob.mock.calls[0][0];
    const dhClip = submittedTimeline.VideoTracks[0].VideoTrackClips[0];

    expect(dhClip).toEqual(expect.objectContaining({
      Type: 'AI_Avatar',
      AvatarId: 'ims-avatar-1',
      Content: '数字人口播台词',
      CustomizedVoice: 'voice-cloned-1',
    }));
    expect(dhClip).not.toHaveProperty('MediaURL');
    expect(dhClip.Effects).toEqual([{ Type: 'AI_ASR' }]);
    expect(submittedTimeline.SubtitleTracks[0].SubtitleTrackClips).toEqual([
      expect.objectContaining({
        Content: '素材旁白文案',
      }),
    ]);
  });

  it('falls back to audio-driven MediaURL for channel A DH clips when native text content is unavailable', () => {
    const timeline = (processor as any).buildTimeline(
      [[
        {
          index: 0,
          type: 'DH',
          text: '',
          scriptId: 'script-a',
          ttsAudioUrl: 'https://example.com/fallback-audio.mp3',
          ttsDuration: 4,
          status: 'tts_done',
        },
      ]],
      [],
      0,
      'A',
      {
        builtinAvatarId: 'ims-avatar-1',
        voiceId: 'voice-cloned-1',
        scripts: [],
        materials: [],
        videoCount: 1,
        resolution: '1080x1920',
        subtitleConfig: {
          open: true,
        },
      },
      1080,
      1920,
    );

    const dhClip = timeline.VideoTracks[0].VideoTrackClips[0];

    expect(dhClip).toEqual(expect.objectContaining({
      Type: 'AI_Avatar',
      AvatarId: 'ims-avatar-1',
      MediaURL: 'https://example.com/fallback-audio.mp3',
    }));
    expect(dhClip).not.toHaveProperty('Content');
    expect(timeline.SubtitleTracks).toBeUndefined();
  });
});
