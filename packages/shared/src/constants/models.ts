import type { JobType, ProviderId } from '../types/generation';

export interface ModelDefinition {
  id: string;
  provider: ProviderId;
  displayName: string;
  type: JobType;
  description: string;
  capabilities: {
    maxWidth?: number;
    maxHeight?: number;
    maxDuration?: number;
    supportedRatios?: string[];
    supportsImageInput?: boolean;
    supportsAudioInput?: boolean;
  };
  defaultCreditCost: number;
  costUnit: 'per_image' | 'per_second' | 'per_job';
}

export const IMAGE_MODELS: ModelDefinition[] = [
  {
    id: 'grok-aurora',
    provider: 'grok',
    displayName: 'Grok Aurora',
    type: 'TEXT_TO_IMAGE',
    description: '高质量图像生成，支持精准文字渲染',
    capabilities: { maxWidth: 2048, maxHeight: 2048, supportsImageInput: false },
    defaultCreditCost: 2,
    costUnit: 'per_image',
  },
  {
    id: 'jimeng-5.0',
    provider: 'jimeng',
    displayName: '即梦 5.0',
    type: 'TEXT_TO_IMAGE',
    description: '最新高质量图像生成',
    capabilities: { maxWidth: 4096, maxHeight: 4096, supportedRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'] },
    defaultCreditCost: 1.5,
    costUnit: 'per_image',
  },
  {
    id: 'jimeng-4.6',
    provider: 'jimeng',
    displayName: '即梦 4.6',
    type: 'TEXT_TO_IMAGE',
    description: '高质量图像生成',
    capabilities: { maxWidth: 2048, maxHeight: 2048 },
    defaultCreditCost: 1,
    costUnit: 'per_image',
  },
  {
    id: 'qwen-wanxiang',
    provider: 'qwen',
    displayName: '通义万相',
    type: 'TEXT_TO_IMAGE',
    description: '通义千问图像生成模型',
    capabilities: { maxWidth: 2048, maxHeight: 2048 },
    defaultCreditCost: 1,
    costUnit: 'per_image',
  },
];

export const VIDEO_MODELS: ModelDefinition[] = [
  {
    id: 'grok-aurora-video',
    provider: 'grok',
    displayName: 'Grok Aurora 视频',
    type: 'TEXT_TO_VIDEO',
    description: 'T2V 排名第一，支持文本/图像生成视频',
    capabilities: { maxDuration: 10, maxWidth: 1280, maxHeight: 720, supportsImageInput: true },
    defaultCreditCost: 5,
    costUnit: 'per_second',
  },
  {
    id: 'sora-2',
    provider: 'sora',
    displayName: 'Sora 2',
    type: 'TEXT_TO_VIDEO',
    description: 'OpenAI 视频生成，快速迭代',
    capabilities: { maxDuration: 20, maxWidth: 1280, maxHeight: 720, supportsImageInput: true },
    defaultCreditCost: 8,
    costUnit: 'per_second',
  },
  {
    id: 'sora-2-pro',
    provider: 'sora',
    displayName: 'Sora 2 Pro',
    type: 'TEXT_TO_VIDEO',
    description: 'OpenAI 影院级视频生成',
    capabilities: { maxDuration: 20, maxWidth: 1920, maxHeight: 1080, supportsImageInput: true },
    defaultCreditCost: 15,
    costUnit: 'per_second',
  },
  {
    id: 'seedance-2.0',
    provider: 'jimeng',
    displayName: 'Seedance 2.0',
    type: 'TEXT_TO_VIDEO',
    description: '字节跳动最新视频生成，支持多模态输入',
    capabilities: { maxDuration: 15, maxWidth: 1920, maxHeight: 1080, supportsImageInput: true, supportsAudioInput: true },
    defaultCreditCost: 5,
    costUnit: 'per_second',
  },
  {
    id: 'veo-3.1',
    provider: 'veo',
    displayName: 'Google Veo 3.1',
    type: 'TEXT_TO_VIDEO',
    description: 'Google 高质量视频生成',
    capabilities: { maxDuration: 8, maxWidth: 1920, maxHeight: 1080, supportsImageInput: true },
    defaultCreditCost: 10,
    costUnit: 'per_second',
  },
];

export const DIGITAL_HUMAN_MODELS: ModelDefinition[] = [
  {
    id: 'wan2.2-s2v',
    provider: 'aliyun_wan',
    displayName: '万相数字人',
    type: 'DIGITAL_HUMAN_VIDEO',
    description: '单张图片+音频生成数字人说话视频',
    capabilities: { supportsImageInput: true, supportsAudioInput: true },
    defaultCreditCost: 0.5,
    costUnit: 'per_second',
  },
];

export const ALL_MODELS = [...IMAGE_MODELS, ...VIDEO_MODELS, ...DIGITAL_HUMAN_MODELS];

export function getModelById(modelId: string): ModelDefinition | undefined {
  return ALL_MODELS.find((m) => m.id === modelId);
}

export function getModelsByProvider(provider: ProviderId): ModelDefinition[] {
  return ALL_MODELS.filter((m) => m.provider === provider);
}

export function getModelsByType(type: JobType): ModelDefinition[] {
  return ALL_MODELS.filter((m) => m.type === type);
}
