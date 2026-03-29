import type { ProviderId } from '../types/generation';

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  description: string;
  website: string;
  capabilities: ('image' | 'video' | 'voice' | 'tts' | 'compose')[];
}

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  grok: {
    id: 'grok',
    name: 'Grok Imagine',
    description: 'xAI Aurora 引擎，图像和视频生成',
    website: 'https://x.ai',
    capabilities: ['image', 'video'],
  },
  sora: {
    id: 'sora',
    name: 'OpenAI Sora',
    description: 'OpenAI 视频生成模型',
    website: 'https://openai.com',
    capabilities: ['video'],
  },
  jimeng: {
    id: 'jimeng',
    name: '即梦 AI',
    description: '字节跳动图像和视频生成',
    website: 'https://jimeng.jianying.com',
    capabilities: ['image', 'video'],
  },
  qwen: {
    id: 'qwen',
    name: '通义千问',
    description: '阿里云百炼平台，图像/语音/TTS',
    website: 'https://bailian.console.aliyun.com',
    capabilities: ['image', 'voice', 'tts'],
  },
  aliyun_wan: {
    id: 'aliyun_wan',
    name: '万相数字人',
    description: '阿里云万相 S2V 数字人视频生成',
    website: 'https://help.aliyun.com',
    capabilities: ['video'],
  },
  aliyun_ims: {
    id: 'aliyun_ims',
    name: '智能媒体服务',
    description: '阿里云 IMS 批量智能成片',
    website: 'https://help.aliyun.com/zh/ims',
    capabilities: ['compose'],
  },
  veo: {
    id: 'veo',
    name: 'Google Veo',
    description: 'Google 视频生成模型',
    website: 'https://deepmind.google',
    capabilities: ['video'],
  },
};
