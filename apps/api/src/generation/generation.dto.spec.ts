import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CreateImageDto } from './dto/create-image.dto';
import { CreateVideoDto } from './dto/create-video.dto';

describe('Generation DTO validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('accepts image model selection and pricing fields', async () => {
    const result = await pipe.transform(
      {
        prompt: 'A premium cosmetic product shot',
        width: 1024,
        height: 1024,
        providerId: 'qwen',
        count: 2,
        model: 'wan2.6-t2i',
        resolution: '2k',
        promptExtend: true,
      },
      {
        type: 'body',
        metatype: CreateImageDto,
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        model: 'wan2.6-t2i',
        resolution: '2k',
        promptExtend: true,
      }),
    );
  });

  it('accepts video model selection and aspect ratio fields', async () => {
    const result = await pipe.transform(
      {
        prompt: 'A cinematic product launch teaser',
        providerId: 'openai-sora',
        duration: 10,
        model: 'sora-pro',
        aspectRatio: '9:16',
        count: 3,
      },
      {
        type: 'body',
        metatype: CreateVideoDto,
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        model: 'sora-pro',
        aspectRatio: '9:16',
        count: 3,
      }),
    );
  });
});
