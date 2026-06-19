const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch {
    throw new ApiError(
      `Cannot reach the LeadRadar API at ${API_BASE}. Make sure the backend is running.`,
    );
  }

  if (!res.ok) {
    throw new ApiError(`API request failed with status ${res.status}.`, res.status);
  }

  return res.json();
}

export const api = {
  leads: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi<any>(`/leads${qs}`);
    },
    get: (id: string) => fetchApi<any>(`/leads/${id}`),
    update: (id: string, data: any) =>
      fetchApi<any>(`/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    stats: () => fetchApi<any>('/leads/stats'),
  },
  keywords: {
    list: () => fetchApi<any[]>('/keywords'),
    create: (data: any) =>
      fetchApi<any>('/keywords', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchApi<any>(`/keywords/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      fetchApi<any>(`/keywords/${id}`, { method: 'DELETE' }),
  },
  sources: {
    list: () => fetchApi<any[]>('/sources'),
    update: (id: string, data: any) =>
      fetchApi<any>(`/sources/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
};
