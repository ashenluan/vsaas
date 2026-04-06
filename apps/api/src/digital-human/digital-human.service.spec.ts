import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DigitalHumanService } from './digital-human.service';

function createMockPrisma() {
  return {
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

  it('passes speech language through to IMS editing config when selected', async () => {
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

  it('rejects unsupported SSML tags before enqueueing the mixcut job', async () => {
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
