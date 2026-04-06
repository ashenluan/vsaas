export type CreateEngine = 'ims' | 'wan-photo' | 'wan-motion' | 'videoretalk';
export type CreateDriveMode = 'text' | 'audio' | 'video';
export type CreatePreset = 'speed' | 'balanced' | 'quality';
export type CreateUseCase = 'standard-presenter' | 'photo-talk' | 'video-retalk' | 'motion-transfer';

export type ResolutionOption = {
  label: string;
  value: string;
};

type UseCaseCapability = {
  useCase: CreateUseCase;
  engine: CreateEngine;
  label: string;
  description: string;
  assetHint: string;
  defaultDriveMode: CreateDriveMode;
  allowedResolutions: ResolutionOption[];
  notes: string[];
  avatarMode: 'builtin-required' | 'custom-required' | 'custom-optional';
};

export const PRESET_OPTIONS: Array<{ value: CreatePreset; label: string; description: string }> = [
  { value: 'speed', label: '极速', description: '优先更快出片，适合快速验证。' },
  { value: 'balanced', label: '均衡', description: '默认推荐，兼顾质量与速度。' },
  { value: 'quality', label: '高质量', description: '优先更稳更细腻的结果。' },
];

export const DIGITAL_HUMAN_USE_CASE_OPTIONS: UseCaseCapability[] = [
  {
    useCase: 'standard-presenter',
    engine: 'ims',
    label: '标准口播',
    description: '使用阿里云 IMS 内置数字人，适合品牌讲解、产品介绍和规范化主持。 ',
    assetHint: '内置数字人 + 系统音色/克隆声音',
    defaultDriveMode: 'text',
    allowedResolutions: [
      { label: '竖屏 1080×1920', value: '1080x1920' },
      { label: '横屏 1920×1080', value: '1920x1080' },
      { label: '方形 1080×1080', value: '1080x1080' },
      { label: '竖屏 4K', value: '2160x3840' },
      { label: '横屏 4K', value: '3840x2160' },
    ],
    notes: ['支持文本或音频驱动', '支持系统音色与克隆声音', '适合品牌安全、稳定讲解场景'],
    avatarMode: 'builtin-required',
  },
  {
    useCase: 'photo-talk',
    engine: 'wan-photo',
    label: '照片开口说话',
    description: '适合静态照片口播，把照片角色快速变成讲解视频。',
    assetHint: '照片数字人 + 文字/音频',
    defaultDriveMode: 'text',
    allowedResolutions: [
      { label: '竖屏 1080×1920', value: '1080x1920' },
      { label: '横屏 1920×1080', value: '1920x1080' },
      { label: '方形 1080×1080', value: '1080x1080' },
    ],
    notes: ['支持文本或音频驱动', '服务端会按万相能力映射到兼容规格', '更适合静态人像讲解'],
    avatarMode: 'custom-required',
  },
  {
    useCase: 'video-retalk',
    engine: 'videoretalk',
    label: '已有视频重驱动',
    description: '适合已有真人视频换口型、重驱动或重新配音。',
    assetHint: '源视频 + 音频，可选参考人脸图',
    defaultDriveMode: 'audio',
    allowedResolutions: [{ label: '保持源视频规格', value: 'source' }],
    notes: ['必须上传源视频与音频', '可选参考人脸图提高目标人脸稳定性', '服务端会先做公网可访问性校验'],
    avatarMode: 'custom-optional',
  },
  {
    useCase: 'motion-transfer',
    engine: 'wan-motion',
    label: '动作迁移',
    description: '让照片人物模仿参考视频中的动作和表情。',
    assetHint: '照片数字人 + 参考视频',
    defaultDriveMode: 'video',
    allowedResolutions: [
      { label: '竖屏 1080×1920', value: '1080x1920' },
      { label: '横屏 1920×1080', value: '1920x1080' },
      { label: '方形 1080×1080', value: '1080x1080' },
    ],
    notes: ['仅支持视频驱动', '更适合需要复刻动作与表情的场景', '建议上传 2-30 秒参考视频'],
    avatarMode: 'custom-required',
  },
];

export function getUseCaseCapability(useCase: CreateUseCase) {
  return DIGITAL_HUMAN_USE_CASE_OPTIONS.find((item) => item.useCase === useCase) || DIGITAL_HUMAN_USE_CASE_OPTIONS[0];
}

export function inferUseCaseFromEngine(engine: CreateEngine): CreateUseCase {
  return DIGITAL_HUMAN_USE_CASE_OPTIONS.find((item) => item.engine === engine)?.useCase || 'standard-presenter';
}

export function getAllowedResolutionsForEngine(engine: CreateEngine) {
  return DIGITAL_HUMAN_USE_CASE_OPTIONS.find((item) => item.engine === engine)?.allowedResolutions || [];
}
