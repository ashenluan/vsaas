const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  // 安全解析 JSON — 防止 502/504 等非 JSON 响应导致崩溃
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`请求失败 (${res.status}): 服务器返回了非预期的响应`);
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return data;
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
  list: (params?: { type?: string; status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
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
  preview: (voiceId: string, text: string) =>
    apiFetch('/voices/preview', { method: 'POST', body: JSON.stringify({ voiceId, text }) }),
};

// Digital Human - Materials (avatars, backgrounds, images, videos)
export const materialApi = {
  list: (type?: string) => {
    const qs = type ? `?type=${type}` : '';
    return apiFetch<any[]>(`/materials${qs}`);
  },
  upload: (data: { name: string; type: string; url: string; thumbnailUrl?: string; size?: number; mimeType?: string }) =>
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

// Digital Human - Compose
export const composeApi = {
  create: (data: {
    voiceId: string;
    avatarId: string;
    scriptIds: string[];
    materialIds?: string[];
    bgMusic?: string;
    videoCount: number;
    resolution: string;
    subtitleConfig?: {
      font?: string;
      fontSize?: number;
      fontColor?: string;
      fontColorOpacity?: number;
      alignment?: string;
      y?: number | string;
      adaptMode?: string;
      outline?: number;
      outlineColour?: string;
      shadow?: number;
      backColour?: string;
      effectColorStyleId?: string;
      bubbleStyleId?: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
    };
    titleConfig?: {
      titles?: string[];
      font?: string;
      fontSize?: number;
      fontColor?: string;
      alignment?: string;
      y?: number | string;
      effectColorStyleId?: string;
    };
    effectsConfig?: {
      allowEffects?: boolean;
      vfxEffectProbability?: number;
      vfxFirstClipEffectList?: string[];
      vfxNotFirstClipEffectList?: string[];
    };
    transitionConfig?: {
      allowTransition?: boolean;
      transitionDuration?: number;
      transitionList?: string[];
      useUniformTransition?: boolean;
    };
    filterConfig?: {
      allowFilter?: boolean;
      filterList?: string[];
    };
  }) =>
    apiFetch('/compose', { method: 'POST', body: JSON.stringify(data) }),
  list: () => apiFetch<any[]>('/compose'),
  get: (id: string) => apiFetch(`/compose/${id}`),
  getOptions: () => apiFetch<{
    transitions: string[];
    effects: Record<string, string[]>;
    filters: Record<string, string[]>;
    subtitleStyles: string[];
    bubbleStyles: string[];
  }>('/compose/options'),
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
  getOptions: () => apiFetch<{
    transitions: string[];
    effects: Record<string, string[]>;
    filters: Record<string, string[]>;
    subtitleStyles: string[];
    bubbleStyles: string[];
  }>('/mixcut/options'),
};
