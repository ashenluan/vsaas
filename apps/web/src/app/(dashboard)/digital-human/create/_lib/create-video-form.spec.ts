import { describe, expect, it } from 'vitest';
import {
  buildCreatePreviewSummary,
  buildCreateVideoPayload,
  buildPreflightSummary,
  syncUseCaseSelection,
  type CreateVideoFormState,
} from './create-video-form';

const createState = (overrides: Partial<CreateVideoFormState> = {}): CreateVideoFormState => ({
  useCase: 'standard-presenter',
  engine: 'ims',
  driveMode: 'text',
  projectName: '',
  resolution: '1080x1920',
  preset: 'balanced',
  selectedAvatar: null,
  selectedBuiltinAvatar: null,
  selectedVoice: null,
  voiceType: 'builtin',
  textContent: '',
  speechRate: 1,
  animateMode: 'wan-std',
  outputFormat: 'mp4',
  loopMotion: false,
  backgroundUrl: '',
  pitchRate: 0,
  volume: 1,
  videoExtension: false,
  queryFaceThreshold: 180,
  ...overrides,
});

describe('create video form helpers', () => {
  it('maps the video-retalk use case onto the videoretalk engine and source resolution', () => {
    const nextState = syncUseCaseSelection(
      createState({
        useCase: 'standard-presenter',
        engine: 'ims',
        driveMode: 'text',
        resolution: '1080x1920',
      }),
      'video-retalk',
    );

    expect(nextState.useCase).toBe('video-retalk');
    expect(nextState.engine).toBe('videoretalk');
    expect(nextState.driveMode).toBe('audio');
    expect(nextState.resolution).toBe('source');
  });

  it('builds a videoretalk payload with source video, audio, preset and optional face reference', () => {
    const result = buildCreateVideoPayload(
      createState({
        useCase: 'video-retalk',
        engine: 'videoretalk',
        driveMode: 'audio',
        resolution: 'source',
        preset: 'quality',
        videoExtension: true,
        queryFaceThreshold: 185,
      }),
      {
        audioUrl: 'https://example.com/audio.wav',
        videoUrl: 'https://example.com/source.mp4',
        refImageUrl: 'https://example.com/ref.png',
      },
    );

    expect(result).toEqual({
      ok: true,
      payload: {
        engine: 'videoretalk',
        driveMode: 'audio',
        resolution: 'source',
        preset: 'quality',
        audioUrl: 'https://example.com/audio.wav',
        videoUrl: 'https://example.com/source.mp4',
        refImageUrl: 'https://example.com/ref.png',
        videoExtension: true,
        queryFaceThreshold: 185,
      },
    });
  });

  it('builds an IMS text payload with builtin avatar and IMS-only options', () => {
    const result = buildCreateVideoPayload(
      createState({
        useCase: 'standard-presenter',
        engine: 'ims',
        selectedBuiltinAvatar: 'avatar-ims-1',
        selectedVoice: 'builtin-voice-1',
        textContent: '欢迎来到智能数字人演示',
        speechRate: 1.2,
        outputFormat: 'webm',
        loopMotion: true,
        backgroundUrl: 'https://example.com/bg.png',
        pitchRate: 0.4,
        volume: 1.3,
        projectName: 'IMS 演示',
      }),
    );

    expect(result).toEqual({
      ok: true,
      payload: {
        engine: 'ims',
        avatarSource: 'builtin',
        builtinAvatarId: 'avatar-ims-1',
        driveMode: 'text',
        resolution: '1080x1920',
        preset: 'balanced',
        name: 'IMS 演示',
        voiceId: 'builtin-voice-1',
        voiceType: 'builtin',
        text: '欢迎来到智能数字人演示',
        speechRate: 1.2,
        outputFormat: 'webm',
        loopMotion: true,
        backgroundUrl: 'https://example.com/bg.png',
        pitchRate: 0.4,
        volume: 1.3,
      },
    });
  });

  it('returns a friendly validation error for missing source video in videoretalk mode', () => {
    const result = buildCreateVideoPayload(
      createState({
        useCase: 'video-retalk',
        engine: 'videoretalk',
        driveMode: 'audio',
        resolution: 'source',
      }),
      {
        audioUrl: 'https://example.com/audio.wav',
      },
    );

    expect(result).toEqual({
      ok: false,
      error: '请上传源视频',
    });
  });

  it('builds a mode-aware preview summary for videoretalk mode', () => {
    const summary = buildCreatePreviewSummary({
      state: createState({
        useCase: 'video-retalk',
        engine: 'videoretalk',
        driveMode: 'audio',
        resolution: 'source',
        preset: 'quality',
        selectedAvatar: 'custom-avatar-1',
        videoExtension: true,
      }),
      customAvatars: [{ id: 'custom-avatar-1', name: '主持人参考图' }],
      builtinAvatars: [],
      builtinVoices: [],
      clonedVoices: [],
    });

    expect(summary).toEqual(
      expect.arrayContaining([
        { label: '创作场景', value: '已有视频重驱动' },
        { label: '质量档位', value: '高质量' },
        { label: '参考人脸', value: '主持人参考图' },
        { label: '声音', value: '上传音频 + 源视频重驱动' },
        { label: '视频延展', value: '开启' },
      ]),
    );
  });

  it('builds a local preflight summary with videoretalk-specific warnings', () => {
    const summary = buildPreflightSummary({
      state: createState({
        useCase: 'video-retalk',
        engine: 'videoretalk',
        driveMode: 'audio',
      }),
      hasAudio: true,
      hasVideo: true,
      hasReferenceImage: false,
    });

    expect(summary.checks).toEqual(
      expect.arrayContaining([
        { label: '源视频', ready: true },
        { label: '音频素材', ready: true },
        { label: '可选参考人脸图', ready: false },
      ]),
    );
    expect(summary.warnings[0]).toContain('未启用深度媒体探测');
  });
});
