const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL

export const API_BASE_URL =
  configuredApiUrl === undefined ? getRuntimeApiUrl() : configuredApiUrl.replace(/\/$/, '')
export const HUB_BASE_URL = (process.env.NEXT_PUBLIC_HUB_URL ?? API_BASE_URL).replace(/\/$/, '')

function getRuntimeApiUrl() {
  if (typeof window === 'undefined') return 'http://localhost:5000'
  return window.location.origin
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (typeof document !== 'undefined' && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('csrf_token='))
      ?.split('=')[1]
    if (csrfToken) headers.set('X-CSRF-Token', decodeURIComponent(csrfToken))
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && shouldNotifyUnauthorized(input)) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
  }

  if (response.status === 403 && shouldNotifyForbidden(input, method)) {
    window.dispatchEvent(new CustomEvent('auth:forbidden'))
  }

  return response
}

function shouldNotifyUnauthorized(input: RequestInfo | URL) {
  if (typeof window === 'undefined') return false

  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.pathname
      : input.url

  return !url.includes('/api/auth/login')
}

function shouldNotifyForbidden(input: RequestInfo | URL, method: string) {
  if (typeof window === 'undefined') return false

  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.pathname
      : input.url

  const path = toPath(url)
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method)

  return (
    path.startsWith('/api/users') ||
    path.startsWith('/api/audit') ||
    path.includes('/goals') ||
    path.includes('/export/') ||
    (path.startsWith('/api/alert-rules') && isMutation) ||
    (path.startsWith('/api/dashboard/configs') && isMutation)
  )
}

function toPath(url: string) {
  try {
    return new URL(url, window.location.origin).pathname
  } catch {
    return url
  }
}
