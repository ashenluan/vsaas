import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { AliyunIMSProvider } from './ims-compose.provider';

describe('AliyunIMSProvider.buildInputConfig', () => {
  it('rejects OSS urls whose region does not match the IMS region', () => {
    const config = new ConfigService({
      ALIYUN_IMS_REGION: 'cn-shanghai',
    });
    const provider = new AliyunIMSProvider(config);

    expect(() =>
      provider.buildInputConfig({
        mode: 'global',
        mediaGroups: [
          {
            groupName: '片段 1',
            mediaUrls: ['https://bucket.oss-cn-hangzhou.aliyuncs.com/input.mp4'],
          },
        ],
      }),
    ).toThrow(/region/i);
  });
});

describe('AliyunIMSProvider.buildEditingConfig', () => {
  it('serializes precise trim ranges into MediaMetaDataArray TimeRangeList', () => {
    const provider = new AliyunIMSProvider(new ConfigService());

    const config = provider.buildEditingConfig({
      mediaMetaData: [
        {
          mediaUrl: 'https://example.com/video.mp4',
          trimIn: 1.5,
          trimOut: 6.25,
        },
      ],
    } as any);

    expect(config.MediaConfig).toEqual(
      expect.objectContaining({
        MediaMetaDataArray: [
          {
            MediaURL: 'https://example.com/video.mp4',
            TimeRangeList: [
              {
                In: 1.5,
                Out: 6.25,
              },
            ],
          },
        ],
      }),
    );
  });
});

describe('AliyunIMSProvider.checkJobStatus', () => {
  it('preserves preview project ids from IMS sub-jobs', async () => {
    const provider = new AliyunIMSProvider(new ConfigService());
    const getBatchMediaProducingJobWithOptions = vi.fn().mockResolvedValue({
      body: {
        editingBatchJob: {
          status: 'Finished',
          subJobList: [
            {
              mediaId: 'media-1',
              mediaURL: 'https://example.com/output.mp4',
              duration: 9.5,
              projectId: 'project-preview-1',
              status: 'Success',
            },
          ],
        },
      },
    });

    (provider as any).client = {
      getBatchMediaProducingJobWithOptions,
    };

    const result = await provider.checkJobStatus('job-1');

    expect(getBatchMediaProducingJobWithOptions).toHaveBeenCalled();
    expect(result.status).toBe('Finished');
    expect(result.subJobs).toEqual([
      expect.objectContaining({
        mediaId: 'media-1',
        mediaURL: 'https://example.com/output.mp4',
        projectId: 'project-preview-1',
        status: 'Success',
      }),
    ]);
  });
});

describe('AliyunIMSProvider.getEditingProject', () => {
  it('requests WebSDK timelines and parses the editing project payload', async () => {
    const provider = new AliyunIMSProvider(new ConfigService());
    const getEditingProjectWithOptions = vi.fn().mockResolvedValue({
      body: {
        project: {
          projectId: 'project-preview-1',
          title: '预览工程',
          status: 'Editing',
          duration: 12.4,
          coverURL: 'oss://bucket/cover.jpg',
          modifiedTime: '2026-04-06T10:00:00Z',
          timeline: JSON.stringify({
            VideoTracks: [
              {
                VideoTrackClips: [
                  { MediaId: 'media-1', MediaURL: 'https://example.com/1.mp4' },
                ],
              },
            ],
          }),
        },
      },
    });

    (provider as any).client = {
      getEditingProjectWithOptions,
    };

    const result = await provider.getEditingProject('project-preview-1');

    expect(getEditingProjectWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-preview-1',
        requestSource: 'WebSDK',
      }),
      expect.anything(),
    );
    expect(result).toEqual(
      expect.objectContaining({
        projectId: 'project-preview-1',
        title: '预览工程',
        status: 'Editing',
        duration: 12.4,
        coverURL: 'oss://bucket/cover.jpg',
        modifiedTime: '2026-04-06T10:00:00Z',
        timeline: {
          VideoTracks: [
            {
              VideoTrackClips: [
                { MediaId: 'media-1', MediaURL: 'https://example.com/1.mp4' },
              ],
            },
          ],
        },
      }),
    );
  });
});
