// Classifies an axios/network failure so pages can show an accurate message
// instead of the generic "check your connection" that was shown for rate
// limits, offline, and server errors alike.
export type ApiFailureKind = 'rate-limited' | 'offline' | 'server' | 'unknown'

export interface ApiFailure {
  kind: ApiFailureKind
  message: string
  canRetry: boolean
  retryAfterSec: number | null
}

export function classifyApiError(err: unknown): ApiFailure {
  const e = err as {
    response?: { status?: number; headers?: Record<string, string>; data?: { error?: string } }
    request?: unknown
    code?: string
  }

  // 429 from express-rate-limit, which sends a Retry-After header.
  if (e?.response?.status === 429) {
    const raw = e.response.headers?.['retry-after'] ?? e.response.headers?.['Retry-After']
    const parsed = Number(raw)
    return {
      kind: 'rate-limited',
      message: 'Too many requests. Please wait a moment and try again.',
      canRetry: true,
      retryAfterSec: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    }
  }

  // No response at all: the request never reached the server (offline, tunnel
  // reset, DNS failure). `request` is set by axios when it was sent but failed.
  if (!e?.response && (e?.request || e?.code === 'ERR_NETWORK' || (typeof navigator !== 'undefined' && !navigator.onLine))) {
    return {
      kind: 'offline',
      message: navigator.onLine ? 'Could not reach the server. Check your connection.' : 'You are offline.',
      canRetry: true,
      retryAfterSec: null,
    }
  }

  if (e?.response?.status && e.response.status >= 500) {
    return {
      kind: 'server',
      message: 'The server had a problem. Please try again shortly.',
      canRetry: true,
      retryAfterSec: null,
    }
  }

  return {
    kind: 'unknown',
    message: 'Something went wrong. Please try again.',
    canRetry: true,
    retryAfterSec: null,
  }
}
