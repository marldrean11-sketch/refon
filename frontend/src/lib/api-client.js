const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiClientError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', errors = null } = {}) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export async function apiRequest(path, options = {}) {
  const { body, headers, ...fetchOptions } = options
  const requestHeaders = new Headers(headers)
  requestHeaders.set('Accept', 'application/json')

  let requestBody = body

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      credentials: 'include',
      cache: 'no-store',
      headers: requestHeaders,
      body: requestBody,
    })
  } catch {
    throw new ApiClientError(
      'We could not reach ReFon. Check your connection and try again.',
      { code: 'NETWORK_ERROR' },
    )
  }

  const contentType = response.headers.get('content-type') ?? ''
  const data =
    response.status === 204 || !contentType.includes('application/json')
      ? null
      : await response.json()

  if (!response.ok) {
    throw new ApiClientError(
      data?.message ?? 'The request could not be completed.',
      {
        status: response.status,
        code: data?.code ?? 'REQUEST_FAILED',
        errors: data?.errors ?? null,
      },
    )
  }

  return data
}
