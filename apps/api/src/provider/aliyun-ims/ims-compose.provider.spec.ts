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
  it('serializes precise trim ranges into script-mode MediaMetaDataArray entries', () => {
    const provider = new AliyunIMSProvider(new ConfigService());

    const config = provider.buildEditingConfig({
      mediaMetaData: [
        {
          groupName: '片段 1',
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
            GroupName: '片段 1',
            Media: 'https://example.com/video.mp4',
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

describe('AliyunIMSProvider.submitAvatarVideoJob', () => {
  it('maps avatar job configs into SubmitAvatarVideoJob request payload', async () => {
    const provider = new AliyunIMSProvider(new ConfigService());
    const submitAvatarVideoJobWithOptions = vi.fn().mockResolvedValue({
      body: {
        jobId: 'avatar-job-1',
        mediaId: 'media-1',
      },
    });

    (provider as any).client = {
      submitAvatarVideoJobWithOptions,
    };

    const inputConfig = { Text: '这是一个数字人口播视频测试文本。' };
    const editingConfig = { AvatarId: 'sys-avatar-1', Voice: 'zhitian', SpeechRate: 200 };
    const outputConfig = { MediaURL: 'https://bucket.oss-cn-shanghai.aliyuncs.com/avatar.mp4' };
    const userData = { NotifyAddress: 'https://callback.example.com/ims' };

    const result = await (provider as any).submitAvatarVideoJob(
      inputConfig,
      editingConfig,
      outputConfig,
      userData,
    );

    expect(submitAvatarVideoJobWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        inputConfig: JSON.stringify(inputConfig),
        editingConfig: JSON.stringify(editingConfig),
        outputConfig: JSON.stringify(outputConfig),
        userData: JSON.stringify(userData),
      }),
      expect.anything(),
    );
    expect(result).toEqual({
      jobId: 'avatar-job-1',
      mediaId: 'media-1',
    });
  });
});

describe('AliyunIMSProvider.getSmartHandleJob', () => {
  it('normalizes GetSmartHandleJob response payload fields', async () => {
    const provider = new AliyunIMSProvider(new ConfigService());
    const getSmartHandleJobWithOptions = vi.fn().mockResolvedValue({
      body: {
        state: 'Failed',
        errorCode: 'AvatarRenderFailed',
        errorMessage: 'tts service timeout',
        jobResult: {
          mediaId: 'media-2',
          mediaUrl: 'https://example.com/avatar-video.mp4',
        },
        output: JSON.stringify({
          MaskURL: 'https://example.com/avatar-mask.mp4',
          SubtitleClips: [{ Text: '你好', Start: 0, End: 1.5 }],
        }),
      },
    });

    (provider as any).client = {
      getSmartHandleJobWithOptions,
    };

    const result = await (provider as any).getSmartHandleJob('avatar-job-2');

    expect(getSmartHandleJobWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'avatar-job-2',
      }),
      expect.anything(),
    );
    expect(result).toEqual({
      status: 'Failed',
      mediaId: 'media-2',
      videoUrl: 'https://example.com/avatar-video.mp4',
      maskUrl: 'https://example.com/avatar-mask.mp4',
      subtitleClips: [{ Text: '你好', Start: 0, End: 1.5 }],
      errorCode: 'AvatarRenderFailed',
      errorMessage: 'tts service timeout',
    });
  });

  it('parses media and subtitle timing from jobResult.aiResult, including nested JSON strings', async () => {
    const provider = new AliyunIMSProvider(new ConfigService());
    const getSmartHandleJobWithOptions = vi.fn().mockResolvedValue({
      body: {
        state: 'Finished',
        jobResult: {
          mediaId: 'media-ai-1',
          aiResult: JSON.stringify({
            MediaURL: 'https://example.com/ai-result-video.mp4',
            MaskURL: 'https://example.com/ai-result-mask.mp4',
            SubtitleClips: JSON.stringify([
              { Text: '第一句', Start: 0, End: 1.2 },
              { Text: '第二句', Start: 1.2, End: 2.4 },
            ]),
          }),
        },
      },
    });

    (provider as any).client = {
      getSmartHandleJobWithOptions,
    };

    const result = await (provider as any).getSmartHandleJob('avatar-job-ai-result');

    expect(result).toEqual({
      status: 'Finished',
      mediaId: 'media-ai-1',
      videoUrl: 'https://example.com/ai-result-video.mp4',
      maskUrl: 'https://example.com/ai-result-mask.mp4',
      subtitleClips: [
        { Text: '第一句', Start: 0, End: 1.2 },
        { Text: '第二句', Start: 1.2, End: 2.4 },
      ],
    });
  });

  it('falls back to smartJobInfo.outputConfig.mediaUrl when video url is absent elsewhere', async () => {
    const provider = new AliyunIMSProvider(new ConfigService());
    const getSmartHandleJobWithOptions = vi.fn().mockResolvedValue({
      body: {
        state: 'Finished',
        jobResult: {
          mediaId: 'media-fallback-1',
        },
        smartJobInfo: {
          outputConfig: {
            mediaUrl: 'https://example.com/fallback-output-config.mp4',
          },
        },
      },
    });

    (provider as any).client = {
      getSmartHandleJobWithOptions,
    };

    const result = await (provider as any).getSmartHandleJob('avatar-job-output-config');

    expect(result).toEqual({
      status: 'Finished',
      mediaId: 'media-fallback-1',
      videoUrl: 'https://example.com/fallback-output-config.mp4',
    });
  });

  it('tolerates malformed JSON payload fragments and returns recoverable fields', async () => {
    const provider = new AliyunIMSProvider(new ConfigService());
    const getSmartHandleJobWithOptions = vi.fn().mockResolvedValue({
      body: {
        state: 'Executing',
        jobResult: {
          mediaId: 'media-malformed-1',
          aiResult: '{"MediaURL":"https://example.com/broken.mp4","SubtitleClips":"not-closed"',
        },
        output: '{"MaskURL":"https://example.com/broken-mask.mp4"',
      },
    });

    (provider as any).client = {
      getSmartHandleJobWithOptions,
    };

    const result = await (provider as any).getSmartHandleJob('avatar-job-malformed');

    expect(result).toEqual({
      status: 'Executing',
      mediaId: 'media-malformed-1',
    });
  });
});

describe('AliyunIMSProvider.normalizeSpeechRate', () => {
  it('converts UI speech rates to IMS SpeechRate range', () => {
    const provider = new AliyunIMSProvider(new ConfigService());

    expect((provider as any).normalizeSpeechRate(1)).toBe(0);
    expect((provider as any).normalizeSpeechRate(1.25)).toBe(200);
    expect((provider as any).normalizeSpeechRate(0.8)).toBe(-125);
    expect((provider as any).normalizeSpeechRate(2)).toBe(500);
    expect((provider as any).normalizeSpeechRate(0.5)).toBe(-500);
    expect((provider as any).normalizeSpeechRate(0)).toBe(0);
  });
});

describe('AliyunIMSProvider.buildAvatarEditingConfig', () => {
  it('uses explicit UI speech-rate multiplier input for conversion', () => {
    const provider = new AliyunIMSProvider(new ConfigService());

    const config = (provider as any).buildAvatarEditingConfig({
      avatarId: 'sys-avatar-1',
      voice: 'zhitian',
      uiSpeechRate: 1.25,
    });

    expect(config).toEqual({
      AvatarId: 'sys-avatar-1',
      Voice: 'zhitian',
      SpeechRate: 200,
    });
  });

  it('accepts explicit IMS SpeechRate integers directly without double conversion', () => {
    const provider = new AliyunIMSProvider(new ConfigService());

    const config = (provider as any).buildAvatarEditingConfig({
      avatarId: 'sys-avatar-2',
      imsSpeechRate: 320,
    });

    expect(config).toEqual({
      AvatarId: 'sys-avatar-2',
      SpeechRate: 320,
    });
  });

  it('rejects ambiguous speech-rate input when both units are provided', () => {
    const provider = new AliyunIMSProvider(new ConfigService());

    expect(() =>
      (provider as any).buildAvatarEditingConfig({
        avatarId: 'sys-avatar-3',
        uiSpeechRate: 1.1,
        imsSpeechRate: 120,
      }),
    ).toThrow(/speech rate/i);
  });
});

describe('AliyunIMSProvider.submitTimelineJob', () => {
  it('includes a ClientToken in SubmitMediaProducingJob requests', async () => {
    const provider = new AliyunIMSProvider(new ConfigService());
    const submitMediaProducingJobWithOptions = vi.fn().mockResolvedValue({
      body: {
        jobId: 'timeline-job-1',
        mediaId: 'media-3',
      },
    });

    (provider as any).client = {
      submitMediaProducingJobWithOptions,
    };

    const timeline = {
      VideoTracks: [
        {
          VideoTrackClips: [{ MediaURL: 'https://example.com/clip.mp4' }],
        },
      ],
    };

    const result = await provider.submitTimelineJob(timeline, {
      mediaUrl: 'https://bucket.oss-cn-shanghai.aliyuncs.com/timeline.mp4',
      width: 1080,
      height: 1920,
    });

    expect(submitMediaProducingJobWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        clientToken: expect.any(String),
        timeline: JSON.stringify(timeline),
        outputMediaConfig: JSON.stringify({
          MediaURL: 'https://bucket.oss-cn-shanghai.aliyuncs.com/timeline.mp4',
          Width: 1080,
          Height: 1920,
        }),
      }),
      expect.anything(),
    );
    expect(submitMediaProducingJobWithOptions.mock.calls[0][0].clientToken.length).toBeGreaterThan(0);
    expect(result).toEqual({
      jobId: 'timeline-job-1',
      mediaId: 'media-3',
    });
  });
});
