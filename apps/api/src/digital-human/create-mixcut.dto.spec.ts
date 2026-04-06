import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMixcutDto } from './dto/create-mixcut.dto';

describe('CreateMixcutDto', () => {
  it('rejects requests that exceed the IMS output count limit', async () => {
    const dto = plainToInstance(CreateMixcutDto, {
      name: '超限混剪',
      shotGroups: [
        {
          name: '片段 1',
          materialUrls: ['https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4'],
        },
      ],
      videoCount: 101,
      resolution: '1080x1920',
    });

    const errors = await validate(dto);
    const videoCountError = errors.find((error) => error.property === 'videoCount');

    expect(videoCountError?.constraints).toEqual(
      expect.objectContaining({
        max: expect.any(String),
      }),
    );
  });

  it('rejects negative trim values in nested material payloads', async () => {
    const dto = plainToInstance(CreateMixcutDto, {
      name: '非法裁剪',
      shotGroups: [
        {
          name: '片段 1',
          materialUrls: ['https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4'],
          materials: [
            {
              url: 'https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4',
              trimIn: -1,
            },
          ],
        },
      ],
      videoCount: 1,
      resolution: '1080x1920',
    });

    const errors = await validate(dto);
    const shotGroupsError = errors.find((error) => error.property === 'shotGroups');

    expect(shotGroupsError).toBeTruthy();
  });

  it('rejects unsupported speechLanguage values', async () => {
    const dto = plainToInstance(CreateMixcutDto, {
      name: '非法语种',
      shotGroups: [
        {
          name: '片段 1',
          materialUrls: ['https://bucket.oss-cn-shanghai.aliyuncs.com/input.mp4'],
        },
      ],
      videoCount: 1,
      resolution: '1080x1920',
      speechLanguage: 'ja',
    });

    const errors = await validate(dto);
    const speechLanguageError = errors.find((error) => error.property === 'speechLanguage');

    expect(speechLanguageError).toBeTruthy();
  });
});
