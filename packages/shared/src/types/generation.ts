export type JobType =
  | 'TEXT_TO_IMAGE'
  | 'IMAGE_TO_IMAGE'
  | 'TEXT_TO_VIDEO'
  | 'IMAGE_TO_VIDEO'
  | 'VOICE_CLONE'
  | 'DIGITAL_HUMAN_VIDEO'
  | 'BATCH_COMPOSE'
  | 'STYLE_COPY'
  | 'TEXT_EDIT'
  | 'HANDHELD_PRODUCT'
  | 'DH_BATCH_V2'
  | 'MULTI_FUSION'
  | 'VIRTUAL_TRYON'
  | 'INPAINT'
  | 'IMAGE_EDIT'
  | 'STORYBOARD'
  // Legacy types
  | 'IMAGE'
  | 'VIDEO'
  | 'TTS'
  | 'DIGITAL_HUMAN'
  | 'VIDEO_EDIT';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ProviderId =
  | 'grok'
  | 'sora'
  | 'jimeng'
  | 'qwen'
  | 'aliyun_wan'
  | 'aliyun_ims'
  | 'veo';

export interface GenerationJob {
  id: string;
  userId: string;
  type: JobType;
  status: JobStatus;
  provider: ProviderId;
  model: string;
  prompt: string | null;
  negativePrompt: string | null;
  inputAssetId: string | null;
  outputAssetId: string | null;
  externalId: string | null;
  progress: number;
  creditsCost: number | null;
  errorMessage: string | null;
  parameters: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreateImageJobRequest {
  prompt: string;
  negativePrompt?: string;
  inputImageId?: string;
  model: string;
  provider: ProviderId;
  width?: number;
  height?: number;
  parameters?: Record<string, any>;
}

export interface CreateVideoJobRequest {
  prompt?: string;
  inputImageId?: string;
  model: string;
  provider: ProviderId;
  duration?: number;
  resolution?: string;
  parameters?: Record<string, any>;
}

export interface JobProgressEvent {
  jobId: string;
  status: JobStatus;
  progress: number;
  message?: string;
  outputUrl?: string;
}
