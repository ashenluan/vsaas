export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  referenceImage?: string;
  style?: string;
  seed?: number;
  count: number;
}

export interface ImageGenerationResult {
  images: Array<{ url: string; width: number; height: number; seed?: number }>;
  provider: string;
  modelId: string;
  usage: { credits: number };
}

export interface VideoGenerationRequest {
  prompt: string;
  referenceImage?: string;
  duration?: number;
  resolution?: string;
  fps?: number;
}

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  provider: string;
  modelId: string;
  usage: { credits: number };
}

export interface AIImageProvider {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
  estimateCost(request: ImageGenerationRequest): number;
}

export interface AIVideoProvider {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  estimateCost(request: VideoGenerationRequest): number;
}

export type ProviderId =
  | 'grok'
  | 'google-imagen'
  | 'qwen'
  | 'jimeng'
  | 'openai-sora'
  | 'aliyun-cosyvoice'
  | 'aliyun-wan'
  | 'aliyun-ims';
