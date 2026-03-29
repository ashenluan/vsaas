import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(50),
});

export const imageGenSchema = z.object({
  prompt: z.string().min(1).max(2000),
  negativePrompt: z.string().max(1000).optional(),
  width: z.number().int().min(256).max(2048),
  height: z.number().int().min(256).max(2048),
  providerId: z.string(),
  count: z.number().int().min(1).max(4).default(1),
  style: z.string().optional(),
  seed: z.number().int().optional(),
  referenceImage: z.string().url().optional(),
});

export const videoGenSchema = z.object({
  prompt: z.string().min(1).max(2000),
  providerId: z.string(),
  duration: z.number().min(1).max(60).optional(),
  resolution: z.string().optional(),
  referenceImage: z.string().url().optional(),
});

export const voiceCloneSchema = z.object({
  name: z.string().min(1).max(50),
  sampleUrl: z.string().url(),
});

export const ttsSynthesizeSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string(),
  speed: z.number().min(0.5).max(2.0).optional(),
  volume: z.number().min(0).max(100).optional(),
});

export const digitalHumanVideoSchema = z.object({
  imageUrl: z.string().url(),
  audioUrl: z.string().url().optional(),
  voiceId: z.string().optional(),
  text: z.string().max(5000).optional(),
  resolution: z.string().optional(),
});

export const scriptSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ImageGenInput = z.infer<typeof imageGenSchema>;
export type VideoGenInput = z.infer<typeof videoGenSchema>;
export type VoiceCloneInput = z.infer<typeof voiceCloneSchema>;
export type TTSSynthesizeInput = z.infer<typeof ttsSynthesizeSchema>;
export type DigitalHumanVideoInput = z.infer<typeof digitalHumanVideoSchema>;
export type ScriptInput = z.infer<typeof scriptSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
