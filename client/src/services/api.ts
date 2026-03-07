import { useAuthStore } from '../stores/authStore';

const BASE_URL = '/api';
const DEMO_MODE = true;

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Try refresh
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${useAuthStore.getState().token}`;
      const retryResponse = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
      });
      if (!retryResponse.ok) {
        throw new Error(`API Error: ${retryResponse.status}`);
      }
      return retryResponse.json();
    }
    useAuthStore.getState().logout();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    useAuthStore.getState().setToken(data.token);
    return true;
  } catch {
    return false;
  }
}

// Demo mode wrapper — falls back to mock data when backend is unavailable
async function demoSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!DEMO_MODE) return fn();
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; refreshToken: string; user: { id: string; email: string; name: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),

  register: (email: string, password: string, name: string) =>
    request<{ token: string; refreshToken: string; user: { id: string; email: string; name: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, name }) },
    ),
};

// Model endpoints
export const modelApi = {
  list: (page = 1, pageSize = 20, search?: string) =>
    demoSafe(
      () => request<{ models: any[]; total: number; page: number; pageSize: number }>(
        `/models?page=${page}&pageSize=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
      { models: [], total: 0, page: 1, pageSize: 20 },
    ),

  get: (id: string) => request<any>(`/models/${id}`),

  create: (data: any) =>
    demoSafe(
      () => request<any>('/models', { method: 'POST', body: JSON.stringify(data) }),
      { id: 'demo-' + Date.now(), ...data },
    ),

  update: (id: string, data: any) =>
    demoSafe(
      () => request<any>(`/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      { id, ...data },
    ),

  delete: (id: string) =>
    demoSafe(
      () => request<void>(`/models/${id}`, { method: 'DELETE' }),
      undefined as any,
    ),

  getVersions: (id: string) => request<any>(`/models/${id}/versions`),

  restoreVersion: (modelId: string, versionId: string) =>
    request<any>(`/models/${modelId}/versions/${versionId}/restore`, { method: 'POST' }),

  share: (id: string) =>
    request<{ shareUrl: string }>(`/models/${id}/share`, { method: 'POST' }),
};

// AI endpoints
export const aiApi = {
  suggest: (data: any) =>
    request<{ value: number; confidence: number; reasoning: string; range?: { low: number; high: number } }>(
      '/ai/suggest',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  pasteParse: (rawText: string, modelType: string, targetSection: string) =>
    request<any>('/ai/parse', {
      method: 'POST',
      body: JSON.stringify({ rawText, modelType, targetSection }),
    }),

  autoPopulate: (companyName: string, companyDescription: string, sector: string, modelType: string) =>
    request<any>('/ai/auto-populate', {
      method: 'POST',
      body: JSON.stringify({ companyName, companyDescription, sector, modelType }),
    }),

  validate: (data: any) =>
    request<{ isUnusual: boolean; severity: string; explanation: string; typicalRange?: { low: number; high: number } }>(
      '/ai/validate',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  forecast: (data: any) =>
    request<any>('/ai/forecast', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  narrative: (modelIds: string[], prompt?: string) =>
    request<{ pdfUrl: string; narrative: string }>('/ai/narrative', {
      method: 'POST',
      body: JSON.stringify({ modelIds, narrativePrompt: prompt }),
    }),
};
