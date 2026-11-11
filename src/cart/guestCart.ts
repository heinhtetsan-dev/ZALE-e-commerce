import { useSyncExternalStore } from 'react'

/** Snapshot of product info so the guest cart can render without extra requests. */
export interface GuestCartItem {
  variantId: string
  quantity: number
  size: string
  stock: number
  product: { id: string; slug: string; name: string; brand: string; color: string; priceCents: number; image: string | null }
}

const KEY = 'shoeshop.guestCart'
const listeners = new Set<() => void>()
let cache: GuestCartItem[] | null = null

const read = (): GuestCartItem[] => {
  if (cache) return cache
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(parsed) ? parsed : []
  } catch {
    cache = []
  }
  return cache
}

const write = (items: GuestCartItem[]) => {
  cache = items
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* storage full or unavailable: cart still works for this page view */
  }
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = null
      listeners.forEach((l) => l())
    }
  })
}

export const guestCart = {
  items: read,
  add(item: GuestCartItem) {
    const items = read()
    const existing = items.find((i) => i.variantId === item.variantId)
    write(
      existing
        ? items.map((i) => (i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity, stock: item.stock } : i))
        : [...items, item],
    )
  },
  update(variantId: string, quantity: number) {
    write(read().map((i) => (i.variantId === variantId ? { ...i, quantity } : i)))
  },
  remove(variantId: string) {
    write(read().filter((i) => i.variantId !== variantId))
  },
  clear() {
    write([])
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  /** Test hook: forget the in-memory cache after localStorage is reset. */
  reset() {
    cache = null
  },
}

export const useGuestCart = () => useSyncExternalStore(guestCart.subscribe, guestCart.items, guestCart.items)
