export type AssetType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE_SAMPLE';

export interface Asset {
  id: string;
  userId: string;
  type: AssetType;
  filename: string;
  mimeType: string;
  size: number;
  ossKey: string;
  ossUrl: string;
  mediaId: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  ossKey: string;
  ossUrl: string;
}

export interface RegisterAssetRequest {
  ossKey: string;
  filename: string;
  mimeType: string;
  size: number;
  type: AssetType;
  duration?: number;
  width?: number;
  height?: number;
}
