export enum MaterialType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  TEMPLATE = 'TEMPLATE',
}

export interface MaterialRecord {
  id: string;
  userId: string;
  type: MaterialType;
  name: string;
  url: string;
  thumbnailUrl: string | null;
  size: number;
  mimeType: string;
  metadata: Record<string, any>;
  createdAt: string;
}
