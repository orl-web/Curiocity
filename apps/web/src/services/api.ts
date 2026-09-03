import axios, { type CancelTokenSource } from 'axios'
import type { AuthResponse, GuideFilters, Guide, User, Review, Comment } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

const pendingRequests = new Map<string, CancelTokenSource>()

export function getCancelToken(key: string) {
  if (pendingRequests.has(key)) {
    pendingRequests.get(key)!.cancel('Request canceled')
  }
  const source = axios.CancelToken.source()
  pendingRequests.set(key, source)
  return {
    token: source.token,
    cancel: () => {
      source.cancel('Request canceled')
      pendingRequests.delete(key)
    },
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken })
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
          return api(originalRequest)
        }
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.dispatchEvent(new Event('auth:logout'))
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export const auth = {
  register: (data: { email: string; password: string; username: string; displayName: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
  me: () => api.get<User>('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

export const guides = {
  list: (filters?: GuideFilters) =>
    api.get<{ guides: Guide[]; total: number }>('/guides', { params: filters }),
  detail: (id: string) => api.get<Guide>(`/guides/${id}`),
  create: (data: Partial<Guide>) => api.post<Guide>('/guides', data),
  update: (id: string, data: Partial<Guide>) => api.patch<Guide>(`/guides/${id}`, data),
  delete: (id: string) => api.delete(`/guides/${id}`),
  save: (id: string) => api.post(`/guides/${id}/save`),
  unsave: (id: string) => api.delete(`/guides/${id}/save`),
}

export const users = {
  me: () => api.get<User & { stats: { saved: number; created: number; earned: number } }>('/users/me'),
  meGuides: (params?: { limit?: number; offset?: number }) =>
    api.get<{ guides: Guide[]; total: number }>('/users/me/guides', { params }),
  meSaved: (params?: { limit?: number; offset?: number }) =>
    api.get<{ guides: Guide[]; total: number }>('/users/me/saved', { params }),
  meFeed: (params?: { limit?: number; offset?: number }) =>
    api.get<{ guides: Guide[]; total: number }>('/users/me/feed', { params }),
  profile: (id: string) => api.get<User & { recentGuides: Guide[]; stats: { followers: number; following: number; created: number }; isFollowing: boolean; isOwn: boolean }>(`/users/${id}`),
  follow: (userId: string) => api.post(`/users/${userId}/follow`),
  unfollow: (userId: string) => api.delete(`/users/${userId}/follow`),
}

export const reviews = {
  list: (guideId: string) => api.get<{ reviews: Review[]; total: number }>(`/users/guides/${guideId}/reviews`),
  create: (guideId: string, data: { rating: number; text?: string }) =>
    api.post(`/users/guides/${guideId}/reviews`, data),
}

export const comments = {
  list: (guideId: string) => api.get<{ comments: Comment[]; replies: Comment[]; total: number }>(`/users/guides/${guideId}/comments`),
  create: (guideId: string, data: { text: string; parentId?: string }) =>
    api.post(`/users/guides/${guideId}/comments`, data),
}

export const payments = {
  checkout: (guideId: string) => api.post<{ checkoutUrl: string; sessionId: string }>('/payments/checkout', { guideId }),
  adUnlock: (guideId: string) => api.post('/payments/ad-unlock', { guideId }),
  creatorEarnings: () =>
    api.get<{ totalEarnings: number; pendingEarnings: number; payments: any[] }>('/payments/creator/earnings'),
}

export const ai = {
  generate: (data: { title: string; city: string; category: string; stops: { name: string }[] }) =>
    api.post<{ stops: { name: string; desc: string }[] }>('/ai/generate-descriptions', data),
  translate: (guideId: string, targetLanguage: string) =>
    api.post<{ translation: Record<string, any> }>('/ai/translate', { guideId, targetLanguage }),
  formatDescription: (data: { rawText: string; city: string; category: string }) =>
    api.post<{ description: string }>('/ai/format-description', data),
}

export const referrals = {
  getMyCode: () => api.get<{ code: string; usesCount: number }>('/referrals/my-code'),
  apply: (code: string) => api.post<{ message: string }>('/referrals/apply', { code }),
  getStats: () => api.get<{ totalReferrals: number; pendingPayouts: number }>('/referrals/stats'),
}

export default api
