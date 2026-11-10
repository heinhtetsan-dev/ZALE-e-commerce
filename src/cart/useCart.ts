import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { api } from '../lib/api'
import type { CartIssue, ServerCart } from '../lib/types'
import { guestCart, useGuestCart, type GuestCartItem } from './guestCart'

export const MAX_LINE_QUANTITY = 10

/** One shape for guest and server carts so pages don't care which is active. */
export interface CartLine {
  key: string
  variantId: string
  quantity: number
  size: number
  stock: number
  product: GuestCartItem['product']
  lineTotalCents: number
  issue: CartIssue
}

export interface CartView {
  lines: CartLine[]
  itemCount: number
  subtotalCents: number
}

const fromServer = (cart: ServerCart): CartView => ({
  lines: cart.items.map((i) => ({
    key: i.id,
    variantId: i.variant.id,
    quantity: i.quantity,
    size: i.variant.size,
    stock: i.variant.stock,
    product: i.product,
    lineTotalCents: i.lineTotalCents,
    issue: i.issue,
  })),
  itemCount: cart.itemCount,
  subtotalCents: cart.subtotalCents,
})

const fromGuest = (items: GuestCartItem[]): CartView => {
  const lines = items.map((i) => ({
    key: i.variantId,
    variantId: i.variantId,
    quantity: i.quantity,
    size: i.size,
    stock: i.stock,
    product: i.product,
    lineTotalCents: i.product.priceCents * i.quantity,
    issue: null,
  }))
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotalCents: lines.reduce((n, l) => n + l.lineTotalCents, 0),
  }
}

export function useCart() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const guestItems = useGuestCart()
  const loggedIn = !!user

  const server = useQuery({
    queryKey: ['cart'],
    queryFn: () => api<ServerCart>('/cart'),
    enabled: loggedIn,
  })

  const setCart = (cart: ServerCart) => queryClient.setQueryData(['cart'], cart)

  const add = useMutation({
    mutationFn: async (item: GuestCartItem) => {
      if (!loggedIn) {
        const existing = guestCart.items().find((i) => i.variantId === item.variantId)?.quantity ?? 0
        if (existing + item.quantity > Math.min(item.stock, MAX_LINE_QUANTITY)) {
          throw new Error(
            existing + item.quantity > MAX_LINE_QUANTITY
              ? `You can buy at most ${MAX_LINE_QUANTITY} of one size`
              : `Only ${item.stock} left in this size`,
          )
        }
        guestCart.add(item)
        return
      }
      setCart(await api<ServerCart>('/cart/items', { method: 'POST', body: { variantId: item.variantId, quantity: item.quantity } }))
    },
  })

  const update = useMutation({
    mutationFn: async ({ line, quantity }: { line: CartLine; quantity: number }) => {
      if (!loggedIn) return guestCart.update(line.variantId, quantity)
      setCart(await api<ServerCart>(`/cart/items/${line.key}`, { method: 'PATCH', body: { quantity } }))
    },
  })

  const remove = useMutation({
    mutationFn: async (line: CartLine) => {
      if (!loggedIn) return guestCart.remove(line.variantId)
      setCart(await api<ServerCart>(`/cart/items/${line.key}`, { method: 'DELETE' }))
    },
  })

  const cart: CartView = loggedIn ? (server.data ? fromServer(server.data) : { lines: [], itemCount: 0, subtotalCents: 0 }) : fromGuest(guestItems)

  return {
    cart,
    isLoading: loggedIn && server.isPending,
    error: server.error,
    refetch: server.refetch,
    add,
    update,
    remove,
  }
}
