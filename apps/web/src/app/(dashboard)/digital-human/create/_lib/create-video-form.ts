export type CreateEngine = 'ims' | 'wan-photo' | 'wan-motion';
export type CreateDriveMode = 'text' | 'audio' | 'video';
export type CreateVoiceType = 'builtin' | 'cloned';
export type CreateOutputFormat = 'mp4' | 'webm';

export type CreateVideoFormState = {
  engine: CreateEngine;
  driveMode: CreateDriveMode;
  projectName: string;
  resolution: string;
  selectedAvatar: string | null;
  selectedBuiltinAvatar: string | null;
  selectedVoice: string | null;
  voiceType: CreateVoiceType;
  textContent: string;
  speechRate: number;
  animateMode: 'wan-std' | 'wan-pro';
  outputFormat: CreateOutputFormat;
  loopMotion: boolean;
  backgroundUrl: string;
  pitchRate: number;
  volume: number;
};

export type CreateVideoPayload = {
  engine: CreateEngine;
  avatarSource?: 'builtin' | 'custom';
  avatarId?: string;
  builtinAvatarId?: string;
  driveMode: CreateDriveMode;
  resolution: string;
  name?: string;
  voiceId?: string;
  voiceType?: CreateVoiceType;
  outputFormat?: CreateOutputFormat;
  loopMotion?: boolean;
  pitchRate?: number;
  volume?: number;
  backgroundUrl?: string;
  text?: string;
  speechRate?: number;
  audioUrl?: string;
  videoUrl?: string;
  animateMode?: 'wan-std' | 'wan-pro';
};

export type CreatePreviewOption = {
  id: string;
  name: string;
};

export type CreatePreviewVoiceOption = {
  id: string;
  label: string;
};

export type CreatePreviewSummaryRow = {
  label: string;
  value: string;
};

type PayloadAssets = {
  audioUrl?: string;
  videoUrl?: string;
};

export const CREATE_ENGINE_OPTIONS: Array<{
  value: CreateEngine;
  label: string;
  description: string;
}> = [
  {
    value: 'ims',
    label: 'IMS 原生数字人',
    description: '使用阿里云内置数字人，适合标准口播和品牌讲解。',
  },
  {
    value: 'wan-photo',
    label: '自定义照片口播',
    description: '沿用现有照片数字人流程，支持文本或音频驱动。',
  },
  {
    value: 'wan-motion',
    label: '动作迁移',
    description: '上传参考视频，让人物模仿动作和表情。',
  },
];

export const DRIVE_MODE_OPTIONS: Record<CreateEngine, Array<{
  value: CreateDriveMode;
  label: string;
  description: string;
}>> = {
  ims: [
    { value: 'text', label: '文本驱动', description: '直接输入台词，IMS 负责配音与唇形。' },
    { value: 'audio', label: '音频驱动', description: '上传音频，直接驱动内置数字人口播。' },
  ],
  'wan-photo': [
    { value: 'text', label: '文本驱动', description: '沿用当前照片口播方式，自动合成语音。' },
    { value: 'audio', label: '音频驱动', description: '上传配音文件，直接生成照片口播。' },
  ],
  'wan-motion': [
    { value: 'video', label: '视频驱动', description: '上传参考视频，执行动作迁移。' },
  ],
};

export function syncEngineSelection(
  state: CreateVideoFormState,
  nextEngine: CreateEngine,
): CreateVideoFormState {
  const allowedDriveModes = DRIVE_MODE_OPTIONS[nextEngine].map((option) => option.value);
  const driveMode = allowedDriveModes.includes(state.driveMode)
    ? state.driveMode
    : allowedDriveModes[0];
  const usesBuiltinVoice = nextEngine === 'ims';
  const shouldClearVoice = !usesBuiltinVoice && state.voiceType === 'builtin';

  return {
    ...state,
    engine: nextEngine,
    driveMode,
    voiceType: usesBuiltinVoice ? state.voiceType : 'cloned',
    selectedVoice: shouldClearVoice ? null : state.selectedVoice,
  };
}

export function buildCreateVideoPayload(
  state: CreateVideoFormState,
  assets: PayloadAssets = {},
):
  | { ok: true; payload: CreateVideoPayload }
  | { ok: false; error: string } {
  if (state.engine === 'ims' && !state.selectedBuiltinAvatar) {
    return { ok: false, error: '请选择内置数字人' };
  }

  if (state.engine !== 'ims' && !state.selectedAvatar) {
    return { ok: false, error: '请选择数字人形象' };
  }

  const trimmedName = state.projectName.trim();
  const trimmedText = state.textContent.trim();
  const trimmedBackgroundUrl = state.backgroundUrl.trim();

  const payload: CreateVideoPayload = {
    engine: state.engine,
    avatarSource: state.engine === 'ims' ? 'builtin' : 'custom',
    driveMode: state.driveMode,
    resolution: state.resolution,
    ...(trimmedName && { name: trimmedName }),
    ...(state.engine === 'ims'
      ? { builtinAvatarId: state.selectedBuiltinAvatar! }
      : { avatarId: state.selectedAvatar! }),
  };

  if (state.driveMode === 'text') {
    if (!state.selectedVoice) {
      return { ok: false, error: '请选择声音' };
    }
    if (!trimmedText) {
      return { ok: false, error: '请输入台词文案' };
    }

    payload.voiceId = state.selectedVoice;
    payload.text = trimmedText;
    if (state.speechRate !== 1) {
      payload.speechRate = state.speechRate;
    }
    if (state.engine === 'ims') {
      payload.voiceType = state.voiceType;
    }
  }

  if (state.driveMode === 'audio') {
    if (!assets.audioUrl) {
      return { ok: false, error: '请上传音频文件' };
    }
    payload.audioUrl = assets.audioUrl;
  }

  if (state.driveMode === 'video') {
    if (!assets.videoUrl) {
      return { ok: false, error: '请上传参考视频' };
    }
    payload.videoUrl = assets.videoUrl;
    payload.animateMode = state.animateMode;
  }

  if (state.engine === 'ims') {
    payload.outputFormat = state.outputFormat;
    if (state.loopMotion) {
      payload.loopMotion = true;
    }
    if (trimmedBackgroundUrl) {
      payload.backgroundUrl = trimmedBackgroundUrl;
    }
    if (state.pitchRate !== 0) {
      payload.pitchRate = state.pitchRate;
    }
    if (state.volume !== 1) {
      payload.volume = state.volume;
    }
  }

  return { ok: true, payload };
}

export function buildCreatePreviewSummary(input: {
  state: CreateVideoFormState;
  customAvatars: CreatePreviewOption[];
  builtinAvatars: CreatePreviewOption[];
  builtinVoices: CreatePreviewVoiceOption[];
  clonedVoices: CreatePreviewVoiceOption[];
}): CreatePreviewSummaryRow[] {
  const { state, customAvatars, builtinAvatars, builtinVoices, clonedVoices } = input;
  const engineLabel = CREATE_ENGINE_OPTIONS.find((option) => option.value === state.engine)?.label || state.engine;
  const driveModeLabel = DRIVE_MODE_OPTIONS[state.engine]
    .find((option) => option.value === state.driveMode)?.label || state.driveMode;

  const avatarName = state.engine === 'ims'
    ? builtinAvatars.find((avatar) => avatar.id === state.selectedBuiltinAvatar)?.name || '未选择'
    : customAvatars.find((avatar) => avatar.id === state.selectedAvatar)?.name || '未选择';

  const voiceName = state.voiceType === 'builtin'
    ? builtinVoices.find((voice) => voice.id === state.selectedVoice)?.label
    : clonedVoices.find((voice) => voice.id === state.selectedVoice)?.label;
  const voiceLabel = state.voiceType === 'builtin'
    ? `系统音色 · ${voiceName || '未选择'}`
    : `克隆声音 · ${voiceName || '未选择'}`;

  const rows: CreatePreviewSummaryRow[] = [
    { label: '创作模式', value: engineLabel },
    { label: '驱动方式', value: driveModeLabel },
    { label: '数字人', value: avatarName },
    { label: '分辨率', value: state.resolution },
  ];

  if (state.driveMode === 'text') {
    rows.push({ label: '声音', value: voiceLabel });
  } else if (state.driveMode === 'audio') {
    rows.push({ label: '声音', value: '上传音频驱动' });
  } else {
    rows.push({ label: '声音', value: '参考视频驱动' });
  }

  if (state.engine === 'ims') {
    rows.push({
      label: '输出',
      value: `${state.outputFormat}${state.loopMotion ? ' · 循环动作' : ''}`,
    });
    rows.push({
      label: '背景',
      value: state.backgroundUrl.trim() ? '已设置' : '默认透明背景',
    });
  }

  return rows;
}
