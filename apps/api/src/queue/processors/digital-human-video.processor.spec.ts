import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DigitalHumanVideoProcessor } from './digital-human-video.processor';

const { pollTaskStatusMock } = vi.hoisted(() => ({
  pollTaskStatusMock: vi.fn(),
}));

vi.mock('./poll-helper', () => ({
  pollTaskStatus: pollTaskStatusMock,
}));

function createPrismaMock() {
  return {
    generation: {
      update: vi.fn().mockResolvedValue(undefined),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  };
}

function createProvidersMock() {
  return {
    imsProvider: {
      buildAvatarEditingConfig: vi.fn((config) => config),
      buildOutputConfig: vi.fn((config) => config),
      submitAvatarVideoJob: vi.fn().mockResolvedValue({
        jobId: 'ims-job-1',
        mediaId: 'ims-media-submit-1',
      }),
      getSmartHandleJob: vi.fn().mockResolvedValue({
        status: 'Finished',
        videoUrl: 'https://example.com/ims-video.mp4',
        mediaId: 'ims-media-1',
        maskUrl: 'https://example.com/ims-mask.mp4',
        subtitleClips: [{ Text: '你好', Start: 0, End: 1.2 }],
      }),
    },
    voiceProvider: {
      synthesizeSpeech: vi.fn().mockResolvedValue({
        audioUrl: 'https://example.com/tts-audio.mp3',
      }),
    },
    digitalHumanProvider: {
      generateVideo: vi.fn().mockResolvedValue({
        taskId: 'wan-task-1',
        status: 'PENDING',
      }),
      generateAnimateVideo: vi.fn().mockResolvedValue({
        taskId: 'wan-animate-task-1',
        status: 'PENDING',
      }),
      checkTaskStatus: vi.fn().mockResolvedValue({
        status: 'SUCCEEDED',
        videoUrl: 'https://example.com/wan-video.mp4',
      }),
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
    ensureSignedUrl: vi.fn((url: string) => url),
  };
}

function createWsMock() {
  return {
    sendToUser: vi.fn(),
  };
}

describe('DigitalHumanVideoProcessor', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let providers: ReturnType<typeof createProvidersMock>;
  let userService: ReturnType<typeof createUserServiceMock>;
  let storage: ReturnType<typeof createStorageMock>;
  let ws: ReturnType<typeof createWsMock>;
  let processor: DigitalHumanVideoProcessor;

  beforeEach(() => {
    prisma = createPrismaMock();
    providers = createProvidersMock();
    userService = createUserServiceMock();
    storage = createStorageMock();
    ws = createWsMock();

    pollTaskStatusMock.mockReset();
    pollTaskStatusMock.mockImplementation(async (taskId: string, options: any) => {
      const status = await options.checkStatus(taskId);
      const normalized = options.normalizeStatus(status);

      if (normalized === 'SUCCEEDED' || normalized === 'COMPLETED') {
        return options.extractResult(status);
      }

      if (normalized === 'FAILED') {
        throw new Error(options.extractError(status));
      }

      throw new Error(`Unexpected task status: ${normalized}`);
    });

    processor = new DigitalHumanVideoProcessor(
      prisma as any,
      providers as any,
      userService as any,
      storage as any,
      ws as any,
    );
  });

  it('routes ims text jobs into IMS avatar rendering', async () => {
    await processor.process({
      data: {
        jobId: 'job-ims-text',
        userId: 'user-1',
        input: {
          engine: 'ims',
          builtinAvatarId: 'ims-avatar-1',
          driveMode: 'text',
          resolution: '1080x1920',
          outputFormat: 'webm',
          voiceId: 'ava',
          voiceType: 'builtin',
          text: 'IMS 文本驱动',
          speechRate: 1.25,
          loopMotion: true,
        },
      },
    } as any);

    expect(providers.imsProvider.buildAvatarEditingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarId: 'ims-avatar-1',
        voice: 'ava',
        uiSpeechRate: 1.25,
        loopMotion: true,
      }),
    );
    expect(providers.imsProvider.submitAvatarVideoJob).toHaveBeenCalledWith(
      { Text: 'IMS 文本驱动' },
      expect.objectContaining({
        avatarId: 'ims-avatar-1',
        voice: 'ava',
        uiSpeechRate: 1.25,
        loopMotion: true,
      }),
      {
        MediaURL: 'https://bucket.oss-cn-shanghai.aliyuncs.com/digital-human/ims/job-ims-text.webm',
      },
    );
    expect(providers.voiceProvider.synthesizeSpeech).not.toHaveBeenCalled();
    expect(ws.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'digital-human:progress',
      expect.objectContaining({
        jobId: 'job-ims-text',
        message: '正在提交 IMS 数字人渲染任务...',
      }),
    );

    const [, pollOptions] = pollTaskStatusMock.mock.calls[0];
    expect(pollOptions.buildProgressMessage(6, 180).message).toContain('正在等待 IMS 数字人合成完成');
  });

  it('routes ims audio jobs directly to avatar rendering without Qwen TTS', async () => {
    await processor.process({
      data: {
        jobId: 'job-ims-audio',
        userId: 'user-1',
        input: {
          engine: 'ims',
          builtinAvatarId: 'ims-avatar-2',
          driveMode: 'audio',
          resolution: '1080x1920',
          outputFormat: 'mp4',
          audioUrl: 'https://example.com/source.wav',
        },
      },
    } as any);

    expect(providers.voiceProvider.synthesizeSpeech).not.toHaveBeenCalled();
    expect(providers.digitalHumanProvider.generateVideo).not.toHaveBeenCalled();
    expect(providers.imsProvider.submitAvatarVideoJob).toHaveBeenCalledWith(
      { InputFile: 'https://example.com/source.wav' },
      expect.objectContaining({
        avatarId: 'ims-avatar-2',
      }),
      {
        MediaURL: 'https://bucket.oss-cn-shanghai.aliyuncs.com/digital-human/ims/job-ims-audio.mp4',
      },
    );
  });

  it('routes wan-photo text jobs through TTS before Wan S2V', async () => {
    await processor.process({
      data: {
        jobId: 'job-wan-photo-text',
        userId: 'user-1',
        input: {
          engine: 'wan-photo',
          avatarUrl: 'https://example.com/avatar.png',
          driveMode: 'text',
          resolution: '1080x1920',
          voiceId: 'voice-1',
          text: '万相照片驱动',
        },
      },
    } as any);

    expect(providers.voiceProvider.synthesizeSpeech).toHaveBeenCalledWith('万相照片驱动', 'voice-1');
    expect(providers.digitalHumanProvider.generateVideo).toHaveBeenCalledWith(
      'https://example.com/avatar.png',
      'https://example.com/tts-audio.mp3',
      '1080P',
    );
    expect(ws.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'digital-human:progress',
      expect.objectContaining({
        jobId: 'job-wan-photo-text',
        message: '正在合成语音...',
      }),
    );
    expect(ws.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'digital-human:progress',
      expect.objectContaining({
        jobId: 'job-wan-photo-text',
        message: '正在生成数字人视频...',
      }),
    );
  });

  it('routes wan-photo audio jobs directly to Wan S2V without TTS', async () => {
    await processor.process({
      data: {
        jobId: 'job-wan-photo-audio',
        userId: 'user-1',
        input: {
          engine: 'wan-photo',
          avatarUrl: 'https://example.com/avatar.png',
          driveMode: 'audio',
          resolution: '1080x1920',
          audioUrl: 'https://example.com/input-audio.mp3',
        },
      },
    } as any);

    expect(providers.voiceProvider.synthesizeSpeech).not.toHaveBeenCalled();
    expect(providers.digitalHumanProvider.generateVideo).toHaveBeenCalledWith(
      'https://example.com/avatar.png',
      'https://example.com/input-audio.mp3',
      '1080P',
    );
  });

  it('routes wan-motion video jobs through animate-video generation', async () => {
    await processor.process({
      data: {
        jobId: 'job-wan-motion-video',
        userId: 'user-1',
        input: {
          engine: 'wan-motion',
          avatarUrl: 'https://example.com/avatar.png',
          driveMode: 'video',
          resolution: '1080x1920',
          videoUrl: 'https://example.com/driver.mp4',
          animateMode: 'wan-pro',
        },
      },
    } as any);

    expect(providers.digitalHumanProvider.generateAnimateVideo).toHaveBeenCalledWith(
      'https://example.com/avatar.png',
      'https://example.com/driver.mp4',
      'wan-pro',
    );
    expect(providers.digitalHumanProvider.generateVideo).not.toHaveBeenCalled();
    expect(providers.voiceProvider.synthesizeSpeech).not.toHaveBeenCalled();

    const [, pollOptions] = pollTaskStatusMock.mock.calls[0];
    expect(pollOptions.buildProgressMessage(6, 180).message).toContain('动作迁移视频生成中');
    expect(pollOptions.extractError({ errorMessage: 'boom' })).toContain('动作迁移视频生成失败');
    expect(pollOptions.timeoutMessage).toBe('动作迁移视频生成超时（15分钟）');

    expect(prisma.generation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-wan-motion-video' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          output: expect.objectContaining({
            videoUrl: 'https://example.com/wan-video.mp4',
            externalJobType: 'wan-animate',
            taskId: 'wan-animate-task-1',
          }),
        }),
      }),
    );
  });

  it('persists IMS render output fields into generation.output', async () => {
    await processor.process({
      data: {
        jobId: 'job-ims-output',
        userId: 'user-1',
        input: {
          engine: 'ims',
          builtinAvatarId: 'ims-avatar-3',
          driveMode: 'text',
          resolution: '1080x1920',
          voiceId: 'ava',
          voiceType: 'builtin',
          text: '输出字段测试',
        },
      },
    } as any);

    expect(prisma.generation.update).toHaveBeenCalledWith({
      where: { id: 'job-ims-output' },
      data: { externalId: 'ims-job-1' },
    });
    expect(prisma.generation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-ims-output' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          output: expect.objectContaining({
            videoUrl: 'https://example.com/ims-video.mp4',
            mediaId: 'ims-media-1',
            maskUrl: 'https://example.com/ims-mask.mp4',
            subtitleClips: [{ Text: '你好', Start: 0, End: 1.2 }],
            externalJobType: 'ims-avatar',
            jobId: 'ims-job-1',
          }),
        }),
      }),
    );
  });
});
