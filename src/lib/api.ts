import type { StockShortage } from './types'

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1'

const TOKEN_KEY = 'shoeshop.token'

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable (private mode) */
    }
  },
}

export interface FieldError {
  path: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }

  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {}
    return Object.fromEntries((this.details as FieldError[]).map((d) => [d.path, d.message]))
  }

  get shortages(): StockShortage[] {
    if (this.code !== 'OUT_OF_STOCK') return []
    return ((this.details as { items?: StockShortage[] } | undefined)?.items ?? [])
  }
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

type Query = Record<string, string | number | boolean | undefined | null | Array<string | number>>

export const toQueryString = (query?: Query) => {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','))
    } else params.set(key, String(value))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; file?: Blob; query?: Query; signal?: AbortSignal } = {}): Promise<T> {
  const token = tokenStore.get()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}${toQueryString(init.query)}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.file ? { 'Content-Type': init.file.type } : init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.file ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      signal: init.signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.')
  }

  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const e = body?.error ?? {}
    if (res.status === 401 && token) onUnauthorized?.()
    throw new ApiError(res.status, e.code ?? 'INTERNAL', e.message ?? 'Something went wrong', e.details)
  }
  return body as T
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong')
