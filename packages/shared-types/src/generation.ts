export enum GenerationType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  VOICE_CLONE = 'VOICE_CLONE',
  TTS = 'TTS',
  DIGITAL_HUMAN = 'DIGITAL_HUMAN',
  DIGITAL_HUMAN_VIDEO = 'DIGITAL_HUMAN_VIDEO',
  VIDEO_EDIT = 'VIDEO_EDIT',
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface GenerationRecord {
  id: string;
  userId: string;
  type: GenerationType;
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
