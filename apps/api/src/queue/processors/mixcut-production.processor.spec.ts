import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MixcutProductionProcessor } from './mixcut-production.processor';

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
    batchComposeProvider: {
      submitBatchJob: vi.fn().mockResolvedValue({ jobId: 'ims-job-1' }),
      checkJobStatus: vi.fn(),
      getEditingProject: vi.fn().mockResolvedValue({
        projectId: 'preview-project-1',
        title: '预览工程',
        status: 'Editing',
        duration: 18.5,
        timeline: {
          VideoTracks: [
            {
              VideoTrackClips: [
                { MediaId: 'media-1' },
                { MediaId: 'media-2' },
              ],
            },
          ],
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
  return {};
}

function createWsMock() {
  return {
    sendToUser: vi.fn(),
  };
}

describe('MixcutProductionProcessor', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let providers: ReturnType<typeof createProvidersMock>;
  let userService: ReturnType<typeof createUserServiceMock>;
  let storage: ReturnType<typeof createStorageMock>;
  let ws: ReturnType<typeof createWsMock>;
  let processor: MixcutProductionProcessor;

  beforeEach(() => {
    prisma = createPrismaMock();
    providers = createProvidersMock();
    userService = createUserServiceMock();
    storage = createStorageMock();
    ws = createWsMock();

    processor = new MixcutProductionProcessor(
      prisma as any,
      providers as any,
      userService as any,
      storage as any,
      ws as any,
    );
  });

  it('persists preview project timeline data for preview-only mixcut jobs', async () => {
    vi.spyOn(processor as any, 'pollImsJob').mockResolvedValue({
      status: 'Finished',
      progress: 100,
      subJobs: [
        {
          status: 'Success',
          mediaId: 'preview-video-1',
          mediaURL: 'https://example.com/preview.mp4',
          duration: 18.5,
          projectId: 'preview-project-1',
        },
      ],
    });

    const result = await processor.process({
      data: {
        jobId: 'gen-1',
        userId: 'user-1',
        inputConfig: {},
        editingConfig: {},
        outputConfig: {
          GeneratePreviewOnly: true,
        },
        videoCount: 1,
      },
    } as any);

    expect(providers.batchComposeProvider.getEditingProject).toHaveBeenCalledWith('preview-project-1');
    expect(prisma.generation.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'gen-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          output: expect.objectContaining({
            imsJobId: 'ims-job-1',
            isPreviewOnly: true,
            previewProject: expect.objectContaining({
              projectId: 'preview-project-1',
              title: '预览工程',
              duration: 18.5,
            }),
          }),
        }),
      }),
    );
    expect(ws.sendToUser).toHaveBeenCalledWith(
      'user-1',
      'mixcut:progress',
      expect.objectContaining({
        jobId: 'gen-1',
        status: 'COMPLETED',
        isPreviewOnly: true,
        previewProject: expect.objectContaining({
          projectId: 'preview-project-1',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        isPreviewOnly: true,
        previewProject: expect.objectContaining({
          projectId: 'preview-project-1',
        }),
      }),
    );
  });
});
