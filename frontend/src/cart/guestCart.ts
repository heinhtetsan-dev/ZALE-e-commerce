import { useSyncExternalStore } from 'react'


export interface GuestCartItem {
  variantId: string 
  quantity: number
  size: string
  stock: number
  product: { id: string; slug: string; name: string; brand: string; color: string; priceCents: number; image: string | null }
}

const KEY = 'zale.guestCart' // localStorage ထဲမှာသုံးမယ့် key
const listeners = new Set<() => void>() // cart ပြောင်းရင် အကြောင်းကြားရမယ့် component တွေ
let cache: GuestCartItem[] | null = null // localStorage ကို ခဏခဏမဖတ်ရအောင် memory ထဲ သိမ်းထား

// cache ရှိရင် cache ကပဲယူ
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
  
  }
  listeners.forEach((l) => l()) // UI တွေ re-render ဖြစ်စေတယ်
}
//  next page storage event ကနေသိပြီးupdate
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = null 
      listeners.forEach((l) => l())
    }
  })
}

// Guest cart ကို ပြင်ဆင်တဲ့ function စုစည်းမှု
export const guestCart = {
  items: read,
  // ပစ္စည်းထည့် — အရင်ရှိပြီးသား sizeဆိုအရေအတွက်ပေါင်း၊ မရှိရင်အသစ်ထည့်
  add(item: GuestCartItem) {
    const items = read()
    const existing = items.find((i) => i.variantId === item.variantId)
    write(
      existing
        ? items.map((i) => (i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity, stock: item.stock } : i))
        : [...items, item],
    )
  },
  // bagထဲကfunctions
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
  reset() {
    cache = null
  },
}

export const useGuestCart = () => useSyncExternalStore(guestCart.subscribe, guestCart.items, guestCart.items)
