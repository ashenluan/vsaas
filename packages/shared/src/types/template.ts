import type { JobType } from './generation';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: JobType;
  thumbnail: string | null;
  config: Record<string, any>;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
