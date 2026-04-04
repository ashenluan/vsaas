const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const API_UNAUTHORIZED_EVENT = 'api:unauthorized';

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function dispatchUnauthorizedEvent() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT));
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers,
    });

    // Parse JSON defensively so upstream UI gets a useful error instead of a syntax failure.
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ApiError(`Request failed (${res.status}): Server returned a non-JSON response`, res.status);
    }

    if (!res.ok) {
      const message = data?.message || (res.status === 401 ? 'Unauthorized' : `Request failed: ${res.status}`);
      if (res.status === 401) {
        dispatchUnauthorizedEvent();
      }
      throw new ApiError(message, res.status);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApiError(`Network error: ${error.message}`);
    }

    throw new ApiError('Network error: Request could not be completed');
  }
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, displayName: string) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }),
};

// User
export const userApi = {
  getProfile: () => apiFetch('/user/profile'),
  updateProfile: (data: { name?: string; avatar?: string }) =>
    apiFetch('/user/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch('/user/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  getCredits: () => apiFetch<number>('/user/credits'),
  getCreditHistory: (page = 1, pageSize = 20) =>
    apiFetch(`/user/credits/history?page=${page}&pageSize=${pageSize}`),
};

// Generation
export const generationApi = {
  createImage: (data: any) =>
    apiFetch('/generations/image', { method: 'POST', body: JSON.stringify(data) }),
  createVideo: (data: any) =>
    apiFetch('/generations/video', { method: 'POST', body: JSON.stringify(data) }),
  list: (params?: { type?: string; status?: string; page?: number; provider?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.provider) qs.set('provider', params.provider);
    return apiFetch(`/generations?${qs}`);
  },
  get: (id: string) => apiFetch(`/generations/${id}`),
  getProviders: () => apiFetch('/generations/providers'),
};

// Templates / Prompt Library
export const templateApi = {
  list: (params?: { category?: string; type?: string; search?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.type) qs.set('type', params.type);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    return apiFetch<{ items: any[]; total: number }>(`/templates?${qs}`);
  },
  categories: () => apiFetch<{ name: string; count: number }[]>('/templates/categories'),
  get: (id: string) => apiFetch(`/templates/${id}`),
  create: (data: { name: string; category: string; config: any; thumbnail?: string; isPublic?: boolean }) =>
    apiFetch('/templates', { method: 'POST', body: JSON.stringify(data) }),
};

// AI
export const aiApi = {
  polishPrompt: (prompt: string, type: 'image' | 'video' = 'image') =>
    apiFetch<{ polished: string }>('/ai/polish-prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt, type }),
    }),
  reversePrompt: (url: string, type: 'image' | 'video' = 'image') =>
    apiFetch<{ prompt: string }>('/ai/reverse-prompt', {
      method: 'POST',
      body: JSON.stringify({ url, type }),
    }),
  generateScript: (topic: string, paragraphs?: number) =>
    apiFetch<{ script: string[] }>('/ai/generate-script', {
      method: 'POST',
      body: JSON.stringify({ topic, paragraphs }),
    }),
  rewriteCopy: (text: string, count?: number) =>
    apiFetch<{ variants: string[] }>('/ai/rewrite-copy', {
      method: 'POST',
      body: JSON.stringify({ text, count }),
    }),
  detectRiskWords: (text: string) =>
    apiFetch<{ safe: boolean; risks: { word: string; reason: string }[] }>('/ai/detect-risk-words', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  transcribeAudio: (audioUrl: string) =>
    apiFetch<{ texts: string[] }>('/ai/transcribe-audio', {
      method: 'POST',
      body: JSON.stringify({ audioUrl }),
    }),
};

// Storage
export const storageApi = {
  getUploadUrl: (filename: string, contentType: string) =>
    apiFetch('/storage/upload-url', { method: 'POST', body: JSON.stringify({ filename, contentType }) }),
};

// Digital Human - Voices
export const voiceApi = {
  list: () => apiFetch<any[]>('/voices'),
  clone: (data: { name: string; sampleUrl: string }) =>
    apiFetch('/voices/clone', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/voices/${id}`, { method: 'DELETE' }),
  preview: (voiceId: string, text: string, voiceType?: 'builtin' | 'cloned') =>
    apiFetch('/voices/preview', { method: 'POST', body: JSON.stringify({ voiceId, text, voiceType }) }),
};

// Digital Human - Materials (avatars, backgrounds, images, videos)
export const materialApi = {
  list: (type?: string) => {
    const qs = type ? `?type=${type}` : '';
    return apiFetch<any[]>(`/materials${qs}`);
  },
  upload: (data: { name: string; type: string; url: string; thumbnailUrl?: string; size?: number; mimeType?: string; metadata?: Record<string, any> }) =>
    apiFetch('/materials', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/materials/${id}`, { method: 'DELETE' }),
  detectFace: (imageUrl: string, materialId?: string) =>
    apiFetch('/materials/detect-face', { method: 'POST', body: JSON.stringify({ imageUrl, materialId }) }),
};

// Digital Human - Scripts
export const scriptApi = {
  list: () => apiFetch<any[]>('/scripts'),
  create: (data: { title: string; content: string; tags?: string[] }) =>
    apiFetch('/scripts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { title?: string; content?: string; tags?: string[] }) =>
    apiFetch(`/scripts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/scripts/${id}`, { method: 'DELETE' }),
};

// Digital Human - Single Video Creation
export const digitalHumanApi = {
  createVideo: (data: {
    avatarId: string;
    driveMode: 'text' | 'audio';
    resolution: string;
    name?: string;
    voiceId?: string;
    text?: string;
    audioUrl?: string;
  }) =>
    apiFetch('/digital-human/create-video', { method: 'POST', body: JSON.stringify(data) }),
  getVideo: (id: string) => apiFetch(`/digital-human/video/${id}`),
};

// Digital Human - Mixcut (智能混剪 / 脚本化自动成片)
export const mixcutApi = {
  create: (data: {
    name: string;
    shotGroups: {
      name: string;
      materialUrls: string[];
      speechTexts?: string[];
      duration?: number;
      splitMode?: string;
      keepOriginalAudio?: boolean;
    }[];
    speechMode?: 'global' | 'group';
    speechTexts?: string[];
    voiceId?: string;
    videoCount: number;
    resolution: string;
    bgMusic?: string;
    bgMusicVolume?: number;
    mediaVolume?: number;
    speechVolume?: number;
    speechRate?: number;
    subtitleConfig?: any;
    titleConfig?: any;
    highlightWords?: { word: string; fontColor?: string; outlineColour?: string; bold?: boolean }[];
    transitionEnabled?: boolean;
    transitionDuration?: number;
    transitionList?: string[];
    filterEnabled?: boolean;
    filterList?: string[];
    bgType?: string;
    bgColor?: string;
    maxDuration?: number;
    crf?: number;
  }) =>
    apiFetch('/mixcut', { method: 'POST', body: JSON.stringify(data) }),
  list: () => apiFetch<any[]>('/mixcut'),
  get: (id: string) => apiFetch(`/mixcut/${id}`),
  saveDraft: (data: { id?: string; name: string; projectData: any }) =>
    apiFetch('/mixcut/draft', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/mixcut/${id}`, { method: 'DELETE' }),
  getOptions: () => apiFetch<{
    transitions: string[];
    effects: Record<string, string[]>;
    filters: Record<string, string[]>;
    subtitleStyles: string[];
    bubbleStyles: string[];
    fonts: { id: string; label: string; chinese: boolean }[];
    imsVoices: Record<string, { id: string; label: string; desc: string }[]>;
  }>('/mixcut/options'),
};

// Digital Human - DH Batch V2 (数字人交错混剪)
export const dhBatchV2Api = {
  create: (data: {
    channel: 'A' | 'B';
    builtinAvatarId?: string;
    avatarId?: string;
    voiceId: string;
    scriptIds: string[];
    materialIds?: string[];
    bgMusic?: string;
    videoCount: number;
    resolution: string;
    subtitleConfig?: { open?: boolean; style?: string; font?: string; fontSize?: number; fontColor?: string };
    transitionId?: string;
    speechRate?: number;
    mediaVolume?: number;
    speechVolume?: number;
    bgMusicVolume?: number;
    maxDuration?: number;
    crf?: number;
  }) =>
    apiFetch('/dh-batch-v2', { method: 'POST', body: JSON.stringify(data) }),
  list: () => apiFetch<any[]>('/dh-batch-v2'),
  get: (id: string) => apiFetch(`/dh-batch-v2/${id}`),
  listBuiltinAvatars: () =>
    apiFetch<{ avatars: { avatarId: string; avatarName: string; coverUrl: string; videoUrl: string; width: number; height: number }[]; totalCount: number }>('/dh-batch-v2/avatars'),
};
