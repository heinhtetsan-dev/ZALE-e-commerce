// ============================================================
// api.ts — Backend server နဲ့ စကားပြောတဲ့ အလွှာ (API layer)။
// App ထဲက HTTP request အားလုံးက ဒီဖိုင်ထဲက api() function ကို ဖြတ်သွားတယ်။
// ဒီတစ်နေရာတည်းမှာ token ထည့်တာ၊ error ပြောင်းတာ အကုန်လုပ်ထားလို့
// တခြားနေရာတွေမှာ fetch ကို တိုက်ရိုက်မသုံးရတော့ဘူး။
// ============================================================

import type { StockShortage } from './types'

// Backend ရဲ့ လိပ်စာ — .env ဖိုင်ထဲက VITE_API_URL ကိုယူတယ်၊ မရှိရင် '/api/v1' ကိုသုံးတယ်
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1'

// Login token ကို browser ရဲ့ localStorage ထဲ သိမ်းတဲ့အခါသုံးမယ့် key နာမည်
const TOKEN_KEY = 'shoeshop.token'

// Token သိမ်း/ထုတ် လုပ်တဲ့ object။
// try/catch ပတ်ထားတာက private browsing mode မှာ localStorage သုံးလို့မရရင်
// app မပျက်ဘဲ ဆက်အလုပ်လုပ်နိုင်အောင်။
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
      else localStorage.removeItem(TOKEN_KEY) // null ပေးရင် token ဖျက် (logout)
    } catch {
      /* storage unavailable (private mode) */
    }
  },
}

// Form validation error တစ်ခုချင်းစီရဲ့ ပုံစံ — ဘယ် field (path) မှာ ဘာ message လဲ
export interface FieldError {
  path: string
  message: string
}

// Server က ပြန်ပေးတဲ့ error အားလုံးကို ဒီ class နဲ့ ကိုယ်စားပြုတယ်။
// ရိုးရိုး Error ထက် status (HTTP code) နဲ့ code (ဥပမာ 'OUT_OF_STOCK') ပါလို့
// error အမျိုးအစားခွဲပြီး ကိုင်တွယ်လို့ရတယ်။
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

  // Validation error တွေကို { email: 'Invalid email', ... } ပုံစံ object အဖြစ်ပြောင်းပေးတယ် —
  // Form တွေက field တစ်ခုချင်းစီအောက်မှာ error ပြဖို့ လွယ်သွားတယ်။
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {}
    return Object.fromEntries((this.details as FieldError[]).map((d) => [d.path, d.message]))
  }

  // ပစ္စည်းပြတ်သွားတဲ့ error ဆိုရင် ဘယ် item တွေ ဘယ်လောက်ပြတ်လဲ စာရင်းထုတ်ပေးတယ်
  get shortages(): StockShortage[] {
    if (this.code !== 'OUT_OF_STOCK') return []
    return ((this.details as { items?: StockShortage[] } | undefined)?.items ?? [])
  }
}

// 401 (token သက်တမ်းကုန်) ဖြစ်တဲ့အခါ ခေါ်ပေးမယ့် function ကို သိမ်းထားတဲ့နေရာ။
// AuthContext က "session ဖြုတ်ချရေး" function ကို ဒီမှာလာ မှတ်ပုံတင်ထားတယ်။
// (api.ts က AuthContext ကို တိုက်ရိုက် import လုပ်ရင် circular import ဖြစ်လို့ ဒီနည်းသုံးတာ)
let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

// URL query string ထဲထည့်လို့ရတဲ့ တန်ဖိုးအမျိုးအစားတွေ
type Query = Record<string, string | number | boolean | undefined | null | Array<string | number>>

// Object ကို URL query string အဖြစ်ပြောင်းတယ်။
// ဥပမာ { brand: 'nike', sizes: [7, 8] } → "?brand=nike&sizes=7,8"
// undefined/null/'' တွေကို ကျော်ပစ်လို့ URL သန့်ရှင်းနေတယ်။
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

// ★ အဓိက function — request အားလုံး ဒီကနေသွားတယ်။
// သုံးပုံ: api<Product>('/products/abc')  သို့မဟုတ်
//        api('/cart/items', { method: 'POST', body: {...} })
// <T> = server က ပြန်ပေးမယ့် data ရဲ့ TypeScript အမျိုးအစား
export async function api<T>(path: string, init: { method?: string; body?: unknown; file?: Blob; query?: Query; signal?: AbortSignal } = {}): Promise<T> {
  const token = tokenStore.get()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}${toQueryString(init.query)}`, {
      method: init.method ?? 'GET', // method မပေးရင် GET
      headers: {
        // file ပို့ရင် file ရဲ့ type၊ JSON body ပို့ရင် application/json
        ...(init.file ? { 'Content-Type': init.file.type } : init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        // Login ဝင်ထားရင် token ကို request တိုင်းမှာ အလိုအလျောက် ထည့်ပေးတယ်
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.file ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      signal: init.signal, // request ကို ကြားဖြတ်ရပ်ချင်ရင် သုံးတဲ့ signal
    })
  } catch (err) {
    // fetch ကိုယ်တိုင် fail = network ပြဿနာ (server ကို လုံးဝမရောက်)
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.')
  }

  // 204 No Content = အောင်မြင်ပေမယ့် body မပါ (ဥပမာ DELETE)
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const e = body?.error ?? {}
    // 401 + token ရှိ = token သက်တမ်းကုန်သွားပြီ → AuthContext ကို အကြောင်းကြားပြီး logout လုပ်စေတယ်
    if (res.status === 401 && token) onUnauthorized?.()
    throw new ApiError(res.status, e.code ?? 'INTERNAL', e.message ?? 'Something went wrong', e.details)
  }
  return body as T
}

// catch ထဲမှာရတဲ့ unknown error ကနေ ပြစရာ message ထုတ်ပေးတဲ့ helper
export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong')
