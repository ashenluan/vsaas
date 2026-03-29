export interface VoiceRecord {
  id: string;
  userId: string;
  name: string;
  voiceId: string;
  provider: string;
  sampleUrl: string;
  status: string;
  createdAt: string;
}

export interface TTSRequest {
  text: string;
  voiceId: string;
  speed?: number;
  volume?: number;
}

export interface DigitalHumanVideoRequest {
  imageUrl: string;
  audioUrl: string;
  voiceId?: string;
  text?: string;
  resolution?: string;
}

export interface ScriptRecord {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
