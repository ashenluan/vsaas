import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DigitalHumanService } from './digital-human.service';

function createMockPrisma() {
  return {
    systemConfig: {
      findUnique: vi.fn(),
    },
    voice: {
      findFirst: vi.fn(),
    },
    material: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    script: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    generation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

function createQueueMock() {
  return {
    add: vi.fn(),
  };
}

function createProvidersMock() {
  return {
    batchComposeProvider: {
      buildInputConfig: vi.fn(() => ({ MediaGroupArray: [] })),
      buildEditingConfig: vi.fn(() => ({ ProcessConfig: {} })),
      buildOutputConfig: vi.fn(() => ({ Count: 1 })),
      listBuiltinAvatars: vi.fn(),
    },
    voiceProvider: {
      synthesizeSpeech: vi.fn(),
    },
    digitalHumanProvider: {
      detectImage: vi.fn(),
    },
  };
}

function createStorageMock() {
  return {
    generateKey: vi.fn(() => 'mixcut/output.mp4'),
    getOssUrl: vi.fn(() => 'https://bucket.oss-cn-shanghai.aliyuncs.com/mixcut/output.mp4'),
  };
}

function createUserServiceMock() {
  return {
    deductCredits: vi.fn().mockResolvedValue(undefined),
    addCredits: vi.fn().mockResolvedValue(undefined),
  };
}

function createGenerationRecord() {
  return {
    id: 'job-1',
    input: {},
    status: 'PENDING',
  };
}

function enableMixcutGlobalSpeech(prisma: ReturnType<typeof createMockPrisma>) {
  prisma.systemConfig.findUnique.mockResolvedValue({
    id: 'cfg-mixcut-global-speech',
    key: 'mixcut.globalSpeechEnabled',
    value: true,
  });
}

function createBasePayload() {
  return {
    name: '测试混剪',
    shotGroups: [
      {
        name: '片段 1',
        materialUrls: ['https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4'],
      },
    ],
    videoCount: 1,
    resolution: '1080x1920',
  };
}

describe('DigitalHumanService.createMixcutJob', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let providers: ReturnType<typeof createProvidersMock>;
  let userService: ReturnType<typeof createUserServiceMock>;
  let storage: ReturnType<typeof createStorageMock>;
  let queue: ReturnType<typeof createQueueMock>;
  let service: DigitalHumanService;

  beforeEach(() => {
    prisma = createMockPrisma();
    providers = createProvidersMock();
    userService = createUserServiceMock();
    storage = createStorageMock();
    queue = createQueueMock();

    prisma.systemConfig.findUnique.mockResolvedValue(null);
    prisma.generation.create.mockResolvedValue(createGenerationRecord());
    queue.add.mockResolvedValue(undefined);

    service = new DigitalHumanService(
      prisma as any,
      providers as any,
      userService as any,
      storage as any,
      queue as any,
      queue as any,
      queue as any,
      queue as any,
    );
  });

  it('rejects mixcut requests that set both maxDuration and fixedDuration', async () => {
    await expect(
      service.createMixcutJob('user-1', {
        ...createBasePayload(),
        maxDuration: 30,
        fixedDuration: 20,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects fixedDuration in group speech mode', async () => {
    await expect(
      service.createMixcutJob('user-1', {
        ...createBasePayload(),
        speechMode: 'group',
        shotGroups: [
          {
            name: '片段 1',
            materialUrls: ['https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4'],
            speechTexts: ['欢迎来到测试视频'],
          },
        ],
        fixedDuration: 15,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects alignmentMode in group speech mode', async () => {
    await expect(
      service.createMixcutJob('user-1', {
        ...createBasePayload(),
        speechMode: 'group',
        shotGroups: [
          {
            name: '片段 1',
            materialUrls: ['https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4'],
            speechTexts: ['欢迎来到测试视频'],
          },
        ],
        alignmentMode: 'AutoSpeed',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects fixedDuration when global speech text is present', async () => {
    enableMixcutGlobalSpeech(prisma);

    await expect(
      service.createMixcutJob('user-1', {
        ...createBasePayload(),
        speechMode: 'global',
        speechTexts: ['完整口播文案'],
        fixedDuration: 15,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects explicit group mode when top-level global speech texts are also provided', async () => {
    enableMixcutGlobalSpeech(prisma);

    await expect(
      service.createMixcutJob('user-1', {
        ...createBasePayload(),
        speechMode: 'group',
        speechTexts: ['这是全局口播文案'],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('passes title, background music and background image pools through to IMS input config', async () => {
    await service.createMixcutJob('user-1', {
      ...createBasePayload(),
      titleConfig: {
        enabled: true,
        titles: ['标题一', '标题二'],
      },
      bgMusicList: ['https://example.com/a.mp3', 'https://example.com/b.mp3'],
      bgType: 'image',
      bgImageList: ['https://example.com/a.png', 'https://example.com/b.png'],
    } as any);

    expect(providers.batchComposeProvider.buildInputConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        titles: ['标题一', '标题二'],
        backgroundMusic: ['https://example.com/a.mp3', 'https://example.com/b.mp3'],
        backgroundImages: ['https://example.com/a.png', 'https://example.com/b.png'],
      }),
    );
  });

  it('rejects material trim ranges whose trimOut is not greater than trimIn', async () => {
    await expect(
      service.createMixcutJob('user-1', {
        ...createBasePayload(),
        shotGroups: [
          {
            name: '片段 1',
            materialUrls: ['https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4'],
            materials: [
              {
                url: 'https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4',
                trimIn: 5,
                trimOut: 3,
              },
            ],
          },
        ],
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects global speech submissions when the system capability is disabled', async () => {
    prisma.systemConfig.findUnique.mockResolvedValue({
      id: 'cfg-mixcut-global-speech',
      key: 'mixcut.globalSpeechEnabled',
      value: false,
    });

    await expect(
      service.createMixcutJob('user-1', {
        ...createBasePayload(),
        speechMode: 'global',
        speechTexts: ['完整口播文案'],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('passes trim metadata with the owning shot group name into IMS editing config', async () => {
    await service.createMixcutJob('user-1', {
      ...createBasePayload(),
      shotGroups: [
        {
          name: '片段 1',
          materialUrls: ['https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4'],
          materials: [
            {
              url: 'https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4',
              trimIn: 0.5,
              trimOut: 3.5,
            },
          ],
        },
      ],
    } as any);

    expect(providers.batchComposeProvider.buildEditingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaMetaData: [
          expect.objectContaining({
            groupName: '片段 1',
            mediaUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4',
            trimIn: 0.5,
            trimOut: 3.5,
          }),
        ],
      }),
    );
  });

  it('passes speech language through to IMS editing config when selected', async () => {
    enableMixcutGlobalSpeech(prisma);

    await service.createMixcutJob('user-1', {
      ...createBasePayload(),
      speechMode: 'global',
      speechTexts: ['<speak><say-as interpret-as="characters">AI</say-as> video</speak>'],
      voiceId: 'ava',
      voiceType: 'builtin',
      speechLanguage: 'en',
    } as any);

    expect(providers.batchComposeProvider.buildEditingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        speechLanguage: 'en',
      }),
    );
  });

  it('returns mixcut capabilities with global speech disabled by default in compose options', async () => {
    prisma.systemConfig.findUnique.mockResolvedValue(null);

    await expect(service.getComposeOptions()).resolves.toEqual(
      expect.objectContaining({
        capabilities: {
          mixcutGlobalSpeechEnabled: false,
        },
      }),
    );
  });

  it('returns mixcut capabilities with global speech enabled when the system switch is on', async () => {
    prisma.systemConfig.findUnique.mockResolvedValue({
      id: 'cfg-mixcut-global-speech',
      key: 'mixcut.globalSpeechEnabled',
      value: true,
    });

    await expect(service.getComposeOptions()).resolves.toEqual(
      expect.objectContaining({
        capabilities: {
          mixcutGlobalSpeechEnabled: true,
        },
      }),
    );
  });

  it('rejects unsupported SSML tags before enqueueing the mixcut job', async () => {
    enableMixcutGlobalSpeech(prisma);

    await expect(
      service.createMixcutJob('user-1', {
        ...createBasePayload(),
        speechMode: 'global',
        speechTexts: ['<speak><audio src="https://example.com/voice.mp3" /></speak>'],
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects advanced SSML tags for CosyVoice voices', async () => {
    enableMixcutGlobalSpeech(prisma);

    await expect(
      service.createMixcutJob('user-1', {
        ...createBasePayload(),
        speechMode: 'global',
        speechTexts: ['<speak><phoneme alphabet="py" ph="ce4 shi4">测试</phoneme></speak>'],
        voiceId: 'longwan',
        voiceType: 'builtin',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});

describe('DigitalHumanService.createVideo engine contract', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let providers: ReturnType<typeof createProvidersMock>;
  let userService: ReturnType<typeof createUserServiceMock>;
  let storage: ReturnType<typeof createStorageMock>;
  let queue: ReturnType<typeof createQueueMock>;
  let service: DigitalHumanService;

  beforeEach(() => {
    prisma = createMockPrisma();
    providers = createProvidersMock();
    userService = createUserServiceMock();
    storage = createStorageMock();
    queue = createQueueMock();

    prisma.generation.create.mockResolvedValue(createGenerationRecord());
    queue.add.mockResolvedValue(undefined);

    service = new DigitalHumanService(
      prisma as any,
      providers as any,
      userService as any,
      storage as any,
      queue as any,
      queue as any,
      queue as any,
      queue as any,
    );
  });

  it('requires builtinAvatarId for ims engine', async () => {
    await expect(
      service.createVideo('user-1', {
        engine: 'ims',
        driveMode: 'text',
        resolution: '1080x1920',
        voiceId: 'voice-1',
        text: 'hello world',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.material.findFirst).not.toHaveBeenCalled();
    expect(prisma.generation.create).not.toHaveBeenCalled();
  });

  it('allows ims text mode with builtin voice without Prisma voice lookup', async () => {
    await expect(
      service.createVideo('user-1', {
        engine: 'ims',
        driveMode: 'text',
        resolution: '1080x1920',
        builtinAvatarId: 'ims-avatar-1',
        voiceId: 'ims-voice-1',
        voiceType: 'builtin',
        text: 'hello world',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.voice.findFirst).not.toHaveBeenCalled();
    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(prisma.generation.create).not.toHaveBeenCalled();
  });

  it('allows ims text mode with cloned voice after ownership check', async () => {
    prisma.voice.findFirst.mockResolvedValue({
      id: 'voice-db-1',
      voiceId: 'voice-cloned',
      status: 'READY',
      userId: 'user-1',
      isPublic: false,
    });

    await expect(
      service.createVideo('user-1', {
        engine: 'ims',
        driveMode: 'text',
        resolution: '1080x1920',
        builtinAvatarId: 'ims-avatar-1',
        voiceId: 'voice-cloned',
        voiceType: 'cloned',
        text: 'hello world',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.voice.findFirst).toHaveBeenCalledTimes(1);
    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(prisma.generation.create).not.toHaveBeenCalled();
  });

  it('requires avatarId for wan-photo text mode', async () => {
    await expect(
      service.createVideo('user-1', {
        engine: 'wan-photo',
        driveMode: 'text',
        resolution: '1080x1920',
        voiceId: 'voice-1',
        text: 'hello world',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.material.findFirst).not.toHaveBeenCalled();
    expect(prisma.generation.create).not.toHaveBeenCalled();
  });

  it('requires videoUrl for wan-motion video mode', async () => {
    prisma.material.findFirst.mockResolvedValue({
      id: 'avatar-1',
      url: 'https://example.com/avatar.png',
      metadata: { faceDetect: { valid: true } },
      isPublic: false,
      userId: 'user-1',
    });

    await expect(
      service.createVideo('user-1', {
        engine: 'wan-motion',
        driveMode: 'video',
        resolution: '1080x1920',
        avatarId: 'avatar-1',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.generation.create).not.toHaveBeenCalled();
  });

  it('rejects invalid engine and driveMode combinations early', async () => {
    await expect(
      service.createVideo('user-1', {
        engine: 'wan-motion',
        driveMode: 'text',
        resolution: '1080x1920',
        avatarId: 'avatar-1',
        voiceId: 'voice-1',
        text: 'hello world',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.material.findFirst).not.toHaveBeenCalled();
    expect(prisma.generation.create).not.toHaveBeenCalled();
  });

  it('defaults ims voiceType to builtin when omitted and voiceId is IMS builtin', async () => {
    await expect(
      service.createVideo('user-1', {
        engine: 'ims',
        driveMode: 'text',
        resolution: '1080x1920',
        builtinAvatarId: 'ims-avatar-1',
        voiceId: 'ava',
        text: 'hello world',
      } as any),
    ).rejects.toThrow('IMS 单视频能力正在接入');

    expect(prisma.voice.findFirst).not.toHaveBeenCalled();
    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(prisma.generation.create).not.toHaveBeenCalled();
  });

  it('defaults ims voiceType to cloned when omitted and voiceId is not IMS builtin', async () => {
    prisma.voice.findFirst.mockResolvedValue({
      id: 'voice-db-1',
      voiceId: 'custom-cloned-voice',
      status: 'READY',
      userId: 'user-1',
      isPublic: false,
    });

    await expect(
      service.createVideo('user-1', {
        engine: 'ims',
        driveMode: 'text',
        resolution: '1080x1920',
        builtinAvatarId: 'ims-avatar-1',
        voiceId: 'custom-cloned-voice',
        text: 'hello world',
      } as any),
    ).rejects.toThrow('IMS 单视频能力正在接入');

    expect(prisma.voice.findFirst).toHaveBeenCalledTimes(1);
    expect(userService.deductCredits).not.toHaveBeenCalled();
    expect(prisma.generation.create).not.toHaveBeenCalled();
  });

  it('keeps legacy text payloads without engine compatible by inferring wan-photo', async () => {
    prisma.material.findFirst.mockResolvedValue({
      id: 'avatar-1',
      url: 'https://example.com/avatar.png',
      metadata: { faceDetect: { valid: true } },
      isPublic: false,
      userId: 'user-1',
    });
    prisma.voice.findFirst.mockResolvedValue({
      id: 'voice-db-1',
      voiceId: 'voice-cloned',
      status: 'READY',
      userId: 'user-1',
      isPublic: false,
    });

    await service.createVideo('user-1', {
      avatarId: 'avatar-1',
      driveMode: 'text',
      resolution: '1080x1920',
      voiceId: 'voice-cloned',
      text: 'legacy payload',
    } as any);

    expect(prisma.generation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'aliyun-wan',
          input: expect.objectContaining({
            engine: 'wan-photo',
            avatarSource: 'custom',
            avatarId: 'avatar-1',
            driveMode: 'text',
          }),
        }),
      }),
    );
  });

  it('keeps legacy video payloads without engine compatible by inferring wan-motion', async () => {
    prisma.material.findFirst.mockResolvedValue({
      id: 'avatar-1',
      url: 'https://example.com/avatar.png',
      metadata: { faceDetect: { valid: true } },
      isPublic: false,
      userId: 'user-1',
    });

    await service.createVideo('user-1', {
      avatarId: 'avatar-1',
      driveMode: 'video',
      resolution: '1080x1920',
      videoUrl: 'https://example.com/ref.mp4',
    } as any);

    expect(prisma.generation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'aliyun-wan',
          input: expect.objectContaining({
            engine: 'wan-motion',
            avatarSource: 'custom',
            avatarId: 'avatar-1',
            driveMode: 'video',
            videoUrl: 'https://example.com/ref.mp4',
          }),
        }),
      }),
    );
  });
});
