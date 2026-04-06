import { describe, expect, it } from 'vitest';
import {
  buildCreatePreviewSummary,
  buildCreateVideoPayload,
  syncEngineSelection,
  type CreateVideoFormState,
} from './create-video-form';

const createState = (overrides: Partial<CreateVideoFormState> = {}): CreateVideoFormState => ({
  engine: 'ims',
  driveMode: 'text',
  projectName: '',
  resolution: '1080x1920',
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
  ...overrides,
});

describe('create video form helpers', () => {
  it('forces video mode and clears builtin voice selections when switching to wan motion', () => {
    const nextState = syncEngineSelection(
      createState({
        engine: 'ims',
        driveMode: 'audio',
        voiceType: 'builtin',
        selectedVoice: 'builtin-voice-1',
      }),
      'wan-motion',
    );

    expect(nextState.engine).toBe('wan-motion');
    expect(nextState.driveMode).toBe('video');
    expect(nextState.voiceType).toBe('cloned');
    expect(nextState.selectedVoice).toBeNull();
  });

  it('builds an IMS text payload with builtin avatar and IMS-only options', () => {
    const result = buildCreateVideoPayload(
      createState({
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

  it('builds a wan photo audio payload with uploaded audio only', () => {
    const result = buildCreateVideoPayload(
      createState({
        engine: 'wan-photo',
        driveMode: 'audio',
        selectedAvatar: 'custom-avatar-1',
      }),
      {
        audioUrl: 'https://example.com/audio.mp3',
      },
    );

    expect(result).toEqual({
      ok: true,
      payload: {
        engine: 'wan-photo',
        avatarSource: 'custom',
        avatarId: 'custom-avatar-1',
        driveMode: 'audio',
        resolution: '1080x1920',
        audioUrl: 'https://example.com/audio.mp3',
      },
    });
  });

  it('returns a friendly validation error for missing ims avatar selection', () => {
    const result = buildCreateVideoPayload(
      createState({
        engine: 'ims',
        selectedVoice: 'builtin-voice-1',
        textContent: '你好',
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: '请选择内置数字人',
    });
  });

  it('builds a mode-aware preview summary for ims native text mode', () => {
    const summary = buildCreatePreviewSummary({
      state: createState({
        engine: 'ims',
        selectedBuiltinAvatar: 'avatar-ims-1',
        selectedVoice: 'builtin-voice-1',
        textContent: '欢迎来到智能数字人演示',
        outputFormat: 'webm',
        loopMotion: true,
        backgroundUrl: 'https://example.com/bg.png',
      }),
      customAvatars: [],
      builtinAvatars: [{ id: 'avatar-ims-1', name: '专业讲解员' }],
      builtinVoices: [{ id: 'builtin-voice-1', label: '温柔女声' }],
      clonedVoices: [],
    });

    expect(summary).toEqual(
      expect.arrayContaining([
        { label: '创作模式', value: 'IMS 原生数字人' },
        { label: '数字人', value: '专业讲解员' },
        { label: '声音', value: '系统音色 · 温柔女声' },
        { label: '输出', value: 'webm · 循环动作' },
        { label: '背景', value: '已设置' },
      ]),
    );
  });
});
