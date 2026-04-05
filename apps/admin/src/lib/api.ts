import { clearAdminTokens, getAdminAccessToken } from './admin-auth-storage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  return getAdminAccessToken();
}

export async function adminFetch<T = any>(
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

  if (res.status === 401 || res.status === 403) {
    if (typeof window !== 'undefined') {
      clearAdminTokens();
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }
  return data;
}

// Admin APIs
export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    adminFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Users
  listUsers: (params?: { page?: number; search?: string; role?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.search) qs.set('search', params.search);
    if (params?.role) qs.set('role', params.role);
    return adminFetch(`/admin/users?${qs}`);
  },
  getUserDetail: (id: string) => adminFetch(`/admin/users/${id}`),
  updateUserStatus: (id: string, status: string) =>
    adminFetch(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Credits
  adjustCredits: (userId: string, amount: number, description: string) =>
    adminFetch('/admin/credits/adjust', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, description }),
    }),

  // Jobs
  listJobs: (params?: { page?: number; type?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    return adminFetch(`/admin/jobs?${qs}`);
  },
  getStats: () => adminFetch('/admin/jobs/stats'),
  getDailyAnalytics: (days = 30) => adminFetch(`/admin/analytics/daily?days=${days}`),
  getProviderAnalytics: () => adminFetch('/admin/analytics/providers'),
  getCreditAnalytics: (days = 30) => adminFetch(`/admin/analytics/credits?days=${days}`),
  getCreditPackages: () => adminFetch('/admin/pricing/packages'),
  updateOrderStatus: (id: string, status: string) =>
    adminFetch(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Config
  listProviders: () => adminFetch('/admin/config/providers'),
  updateProvider: (id: string, data: { isEnabled?: boolean; config?: any }) =>
    adminFetch(`/admin/config/providers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
