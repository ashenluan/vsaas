import {
  DIGITAL_HUMAN_USE_CASE_OPTIONS,
  PRESET_OPTIONS,
  getAllowedResolutionsForEngine,
  getUseCaseCapability,
  inferUseCaseFromEngine,
  type CreateDriveMode,
  type CreateEngine,
  type CreatePreset,
  type CreateUseCase,
} from './digital-human-capabilities';

export type CreateVoiceType = 'builtin' | 'cloned';
export type CreateOutputFormat = 'mp4' | 'webm';

export type CreateVideoFormState = {
  useCase: CreateUseCase;
  engine: CreateEngine;
  driveMode: CreateDriveMode;
  projectName: string;
  resolution: string;
  preset: CreatePreset;
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
  videoExtension: boolean;
  queryFaceThreshold: number;
};

export type CreateVideoPayload = {
  engine: CreateEngine;
  avatarSource?: 'builtin' | 'custom';
  avatarId?: string;
  builtinAvatarId?: string;
  driveMode: CreateDriveMode;
  resolution: string;
  name?: string;
  preset?: CreatePreset;
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
  refImageUrl?: string;
  videoExtension?: boolean;
  queryFaceThreshold?: number;
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
  refImageUrl?: string;
};

export const CREATE_USE_CASE_OPTIONS = DIGITAL_HUMAN_USE_CASE_OPTIONS;
export { PRESET_OPTIONS };

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
  videoretalk: [
    { value: 'audio', label: '音频重驱动', description: '上传音频和源视频，执行口型重驱动。' },
  ],
};

function getDefaultResolution(engine: CreateEngine) {
  return getAllowedResolutionsForEngine(engine)[0]?.value || '1080x1920';
}

export function syncUseCaseSelection(
  state: CreateVideoFormState,
  nextUseCase: CreateUseCase,
): CreateVideoFormState {
  const capability = getUseCaseCapability(nextUseCase);
  const allowedDriveModes = DRIVE_MODE_OPTIONS[capability.engine].map((option) => option.value);
  const driveMode = allowedDriveModes.includes(state.driveMode) ? state.driveMode : capability.defaultDriveMode;
  const allowedResolutions = capability.allowedResolutions.map((option) => option.value);
  const resolution = allowedResolutions.includes(state.resolution) ? state.resolution : getDefaultResolution(capability.engine);
  const usesBuiltinVoice = capability.engine === 'ims';
  const shouldClearVoice = !usesBuiltinVoice && state.voiceType === 'builtin';

  return {
    ...state,
    useCase: nextUseCase,
    engine: capability.engine,
    driveMode,
    resolution,
    selectedBuiltinAvatar: capability.avatarMode === 'builtin-required' ? state.selectedBuiltinAvatar : null,
    voiceType: usesBuiltinVoice ? state.voiceType : 'cloned',
    selectedVoice: shouldClearVoice ? null : state.selectedVoice,
  };
}

export function syncEngineSelection(
  state: CreateVideoFormState,
  nextEngine: CreateEngine,
): CreateVideoFormState {
  return syncUseCaseSelection(state, inferUseCaseFromEngine(nextEngine));
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

  if ((state.engine === 'wan-photo' || state.engine === 'wan-motion') && !state.selectedAvatar) {
    return { ok: false, error: '请选择数字人形象' };
  }

  const trimmedName = state.projectName.trim();
  const trimmedText = state.textContent.trim();
  const trimmedBackgroundUrl = state.backgroundUrl.trim();

  const payload: CreateVideoPayload = {
    engine: state.engine,
    driveMode: state.driveMode,
    resolution: state.resolution,
    preset: state.preset,
    ...(trimmedName && { name: trimmedName }),
  };

  if (state.engine === 'ims') {
    payload.avatarSource = 'builtin';
    payload.builtinAvatarId = state.selectedBuiltinAvatar!;
  } else if (state.engine !== 'videoretalk') {
    payload.avatarSource = 'custom';
    payload.avatarId = state.selectedAvatar!;
  }

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

  if (state.driveMode === 'video' || state.engine === 'videoretalk') {
    if (!assets.videoUrl) {
      return { ok: false, error: state.engine === 'videoretalk' ? '请上传源视频' : '请上传参考视频' };
    }
    payload.videoUrl = assets.videoUrl;
  }

  if (state.driveMode === 'video') {
    payload.animateMode = state.animateMode;
  }

  if (state.engine === 'videoretalk') {
    if (assets.refImageUrl) {
      payload.refImageUrl = assets.refImageUrl;
    }
    payload.videoExtension = state.videoExtension;
    payload.queryFaceThreshold = state.queryFaceThreshold;
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
  const capability = getUseCaseCapability(state.useCase);
  const driveModeLabel = DRIVE_MODE_OPTIONS[state.engine]
    .find((option) => option.value === state.driveMode)?.label || state.driveMode;

  const avatarName = state.engine === 'ims'
    ? builtinAvatars.find((avatar) => avatar.id === state.selectedBuiltinAvatar)?.name || '未选择'
    : customAvatars.find((avatar) => avatar.id === state.selectedAvatar)?.name || (state.engine === 'videoretalk' ? '未设置' : '未选择');

  const voiceName = state.voiceType === 'builtin'
    ? builtinVoices.find((voice) => voice.id === state.selectedVoice)?.label
    : clonedVoices.find((voice) => voice.id === state.selectedVoice)?.label;
  const voiceLabel = state.voiceType === 'builtin'
    ? `系统音色 · ${voiceName || '未选择'}`
    : `克隆声音 · ${voiceName || '未选择'}`;

  const rows: CreatePreviewSummaryRow[] = [
    { label: '创作场景', value: capability.label },
    { label: '驱动方式', value: driveModeLabel },
    { label: '质量档位', value: PRESET_OPTIONS.find((option) => option.value === state.preset)?.label || state.preset },
    { label: state.engine === 'videoretalk' ? '参考人脸' : '数字人', value: avatarName },
    { label: '分辨率', value: state.resolution === 'source' ? '保持源视频' : state.resolution },
  ];

  if (state.driveMode === 'text') {
    rows.push({ label: '声音', value: voiceLabel });
  } else if (state.engine === 'videoretalk') {
    rows.push({ label: '声音', value: '上传音频 + 源视频重驱动' });
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

  if (state.engine === 'videoretalk') {
    rows.push({
      label: '视频延展',
      value: state.videoExtension ? '开启' : '关闭',
    });
  }

  return rows;
}

export function buildPreflightSummary(input: {
  state: CreateVideoFormState;
  hasAudio: boolean;
  hasVideo: boolean;
  hasReferenceImage: boolean;
}) {
  const capability = getUseCaseCapability(input.state.useCase);
  const checks = [
    {
      label: input.state.engine === 'videoretalk' ? '源视频' : '人像素材',
      ready: input.state.engine === 'ims' || input.state.engine === 'videoretalk'
        ? (input.state.engine === 'videoretalk' ? input.hasVideo : !!input.state.selectedBuiltinAvatar)
        : !!input.state.selectedAvatar,
    },
    {
      label: input.state.driveMode === 'text' ? '台词与声音' : '音频素材',
      ready: input.state.driveMode === 'text'
        ? !!input.state.textContent.trim() && !!input.state.selectedVoice
        : input.hasAudio || input.state.driveMode === 'video',
    },
  ];

  if (input.state.driveMode === 'video') {
    checks.push({ label: '参考视频', ready: input.hasVideo });
  }

  if (input.state.engine === 'videoretalk') {
    checks.push({ label: '可选参考人脸图', ready: input.hasReferenceImage });
  }

  return {
    notes: capability.notes,
    checks,
    warnings: input.state.engine === 'videoretalk'
      ? ['服务端会先做公网可访问性校验；当前环境未启用深度媒体探测。']
      : ['提交后会按当前引擎能力自动匹配兼容参数。'],
  };
}
