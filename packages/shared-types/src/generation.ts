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
  | 'MIXCUT'
  // Legacy types
  | 'IMAGE'
  | 'VIDEO'
  | 'TTS'
  | 'DIGITAL_HUMAN'
  | 'VIDEO_EDIT';

/** @deprecated Use JobType instead */
export type GenerationType = JobType;

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface GenerationRecord {
  id: string;
  userId: string;
  type: JobType;
  status: JobStatus;
  provider: string;
  input: Record<string, any>;
  output: Record<string, any> | null;
  creditsUsed: number;
  createdAt: string;
  completedAt: string | null;
}

export interface GenerationListResponse {
  items: GenerationRecord[];
  total: number;
  page: number;
  pageSize: number;
}
