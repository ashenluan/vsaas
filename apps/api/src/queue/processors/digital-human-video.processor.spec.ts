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
      getRequiredOssRegion: vi.fn(() => 'oss-cn-shanghai'),
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
    videoRetalkProvider: {
      submitVideoRetalkJob: vi.fn().mockResolvedValue({
        taskId: 'retalk-task-1',
        status: 'PENDING',
        requestId: 'retalk-request-1',
      }),
      checkTaskStatus: vi.fn().mockResolvedValue({
        status: 'SUCCEEDED',
        videoUrl: 'https://example.com/videoretalk-video.mp4',
        requestId: 'retalk-request-1',
        usage: {
          videoDuration: 7.2,
          videoRatio: '9:16',
          size: '1080x1920',
          fps: 25,
        },
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
    getRegion: vi.fn(() => 'oss-cn-shanghai'),
    ensureSignedUrl: vi.fn((url: string) => `${url}?signed=1`),
    copyExternalToOss: vi.fn(async (sourceUrl: string) => `https://bucket.oss-cn-shanghai.aliyuncs.com/copied/${sourceUrl.split('/').pop()}`),
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

  it('fails early when IMS output OSS region does not match the IMS region', async () => {
    storage.getRegion.mockReturnValue('oss-cn-hangzhou');

    await expect(
      processor.process({
        data: {
          jobId: 'job-ims-region-mismatch',
          userId: 'user-1',
          input: {
            engine: 'ims',
            builtinAvatarId: 'ims-avatar-1',
            driveMode: 'text',
            resolution: '1080x1920',
            voiceId: 'ava',
            voiceType: 'builtin',
            text: '区域校验测试',
          },
        },
      } as any),
    ).rejects.toThrow('OSS_REGION');

    expect(providers.imsProvider.submitAvatarVideoJob).not.toHaveBeenCalled();
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
          speechRate: 1.25,
          pitchRate: 1.1,
          volume: 80,
        },
      },
    } as any);

    expect(providers.voiceProvider.synthesizeSpeech).toHaveBeenCalledWith(
      '万相照片驱动',
      'voice-1',
      {
        speechRate: 1.25,
        pitchRate: 1.1,
        volume: 80,
      },
    );
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
        message: '照片口播合成中...',
      }),
    );
  });

  it('routes wan-photo audio jobs directly to Wan S2V without TTS', async () => {
    providers.digitalHumanProvider.checkTaskStatus.mockResolvedValue({
      status: 'SUCCEEDED',
      videoUrl: 'https://dashscope-result-cn-shanghai.aliyuncs.com/tmp/wan-video.mp4',
    });

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
    expect(storage.copyExternalToOss).toHaveBeenCalledWith(
      'https://dashscope-result-cn-shanghai.aliyuncs.com/tmp/wan-video.mp4',
      'digital-human/results/wan-photo',
      'mp4',
    );
    expect(prisma.generation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-wan-photo-audio' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          output: expect.objectContaining({
            videoUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/copied/wan-video.mp4?signed=1',
            durableVideoUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/copied/wan-video.mp4',
            providerTempUrl: 'https://dashscope-result-cn-shanghai.aliyuncs.com/tmp/wan-video.mp4',
            audioUrl: 'https://example.com/input-audio.mp3',
            externalJobType: 'wan-s2v',
            taskId: 'wan-task-1',
            providerTaskId: 'wan-task-1',
            engine: 'wan-photo',
          }),
        }),
      }),
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
    expect(pollOptions.timeoutMessage).toBe('动作迁移视频生成超时（20分钟）');

    expect(prisma.generation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-wan-motion-video' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          output: expect.objectContaining({
            videoUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/copied/wan-video.mp4?signed=1',
            durableVideoUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/copied/wan-video.mp4',
            providerTempUrl: 'https://example.com/wan-video.mp4',
            externalJobType: 'wan-animate',
            taskId: 'wan-animate-task-1',
            providerTaskId: 'wan-animate-task-1',
            engine: 'wan-motion',
          }),
        }),
      }),
    );
  });

  it('routes videoretalk jobs through the dedicated provider and persists durable output metadata', async () => {
    await processor.process({
      data: {
        jobId: 'job-videoretalk-audio',
        userId: 'user-1',
        input: {
          engine: 'videoretalk',
          driveMode: 'audio',
          resolution: 'source',
          audioUrl: 'https://example.com/input-audio.wav',
          videoUrl: 'https://example.com/source-video.mp4',
          refImageUrl: 'https://example.com/ref-face.png',
          videoExtension: true,
          queryFaceThreshold: 180,
          resolvedModel: 'videoretalk',
        },
      },
    } as any);

    expect(providers.videoRetalkProvider.submitVideoRetalkJob).toHaveBeenCalledWith({
      videoUrl: 'https://example.com/source-video.mp4',
      audioUrl: 'https://example.com/input-audio.wav',
      refImageUrl: 'https://example.com/ref-face.png',
      videoExtension: true,
      queryFaceThreshold: 180,
    });
    expect(providers.digitalHumanProvider.generateVideo).not.toHaveBeenCalled();
    expect(storage.copyExternalToOss).toHaveBeenCalledWith(
      'https://example.com/videoretalk-video.mp4',
      'digital-human/results/videoretalk',
      'mp4',
    );

    const [, pollOptions] = pollTaskStatusMock.mock.calls[0];
    expect(pollOptions.timeoutMessage).toBe('VideoRetalk 重驱动超时（25分钟）');

    expect(prisma.generation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-videoretalk-audio' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          output: expect.objectContaining({
            engine: 'videoretalk',
            resolvedModel: 'videoretalk',
            videoUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/copied/videoretalk-video.mp4?signed=1',
            durableVideoUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/copied/videoretalk-video.mp4',
            providerTempUrl: 'https://example.com/videoretalk-video.mp4',
            providerTaskId: 'retalk-task-1',
            providerRequestId: 'retalk-request-1',
            duration: 7.2,
            aspectRatio: '9:16',
            fps: 25,
            size: '1080x1920',
            externalJobType: 'videoretalk',
          }),
        }),
      }),
    );
  });

  it('persists IMS render output fields into generation.output', async () => {
    providers.imsProvider.getSmartHandleJob.mockResolvedValue({
      status: 'Finished',
      videoUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/results/ims-video.mp4',
      mediaId: 'ims-media-1',
      maskUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/results/ims-mask.mp4',
      subtitleClips: [{ Text: '你好', Start: 0, End: 1.2 }],
    });

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
            videoUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/results/ims-video.mp4?signed=1',
            mediaId: 'ims-media-1',
            maskUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/results/ims-mask.mp4?signed=1',
            subtitleClips: [{ Text: '你好', Start: 0, End: 1.2 }],
            externalJobType: 'ims-avatar',
            jobId: 'ims-job-1',
          }),
        }),
      }),
    );

    expect(storage.ensureSignedUrl).toHaveBeenCalledWith(
      'https://bucket.oss-cn-shanghai.aliyuncs.com/results/ims-video.mp4',
    );
    expect(storage.ensureSignedUrl).toHaveBeenCalledWith(
      'https://bucket.oss-cn-shanghai.aliyuncs.com/results/ims-mask.mp4',
    );
  });
});
