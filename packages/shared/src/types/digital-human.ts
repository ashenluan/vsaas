import type { JobStatus } from './generation';

export type VoiceCloneStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type ComposeStatus = 'DRAFT' | 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED';

export interface VoiceClone {
  id: string;
  userId: string;
  name: string;
  sampleAssetId: string;
  voiceId: string | null;
  status: VoiceCloneStatus;
  provider: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface CreateVoiceCloneRequest {
  name: string;
  audioAssetId: string;
}

export interface DigitalHumanAvatar {
  id: string;
  userId: string;
  name: string;
  assetId: string;
  detectResult: Record<string, any> | null;
  isValid: boolean;
  createdAt: string;
}

export interface CreateAvatarRequest {
  name: string;
  imageAssetId: string;
}

export interface ComposeProject {
  id: string;
  userId: string;
  name: string;
  config: ComposeConfig;
  status: ComposeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ComposeConfig {
  voiceCloneId: string;
  avatarId?: string;
  mode: 'global' | 'group';
  mediaGroups: MediaGroup[];
  speechTexts?: string[];
  titles?: string[];
  backgroundMusic?: string[];
  stickers?: StickerConfig[];
  backgroundImages?: string[];
  editingConfig?: EditingConfig;
  outputConfig: OutputConfig;
  templateId?: string;
}

export interface MediaGroup {
  groupName: string;
  mediaAssetIds: string[];
  speechTexts?: string[];
  duration?: number;
  splitMode?: 'NoSplit' | 'AverageSplit';
  volume?: number;
}

export interface StickerConfig {
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}

export interface EditingConfig {
  mediaVolume?: number;
  speechVolume?: number;
  speechRate?: number;
  speechVoice?: string;
  backgroundMusicVolume?: number;
  allowTransition?: boolean;
  transitionDuration?: number;
  allowEffects?: boolean;
  singleShotDuration?: number;
}

export interface OutputConfig {
  count: number;
  width: number;
  height: number;
  maxDuration?: number;
}

export interface ComposeJob {
  id: string;
  projectId: string;
  externalJobId: string | null;
  status: JobStatus;
  progress: number;
  outputAssets: string[] | null;
  creditsCost: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateComposeRequest {
  name: string;
  config: ComposeConfig;
}
