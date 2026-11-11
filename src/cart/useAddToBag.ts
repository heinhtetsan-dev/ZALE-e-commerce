import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../lib/api'
import { useBag } from './bag'
import type { GuestCartItem } from './guestCart'
import { useCart } from './useCart'

/**
 * Adds one item and opens the bag drawer so the shopper sees it landed
 * without leaving the page. Throws on failure so callers can show the error
 * next to the control that was used.
 */
export function useAddToBag() {
  const { add } = useCart()
  const bag = useBag()
  const queryClient = useQueryClient()

  const addToBag = async (item: GuestCartItem) => {
    try {
      await add.mutateAsync(item)
      bag.open(item.variantId)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') {
        // Stock changed since the page loaded: refresh what's on screen.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['product', item.product.slug] }),
          queryClient.invalidateQueries({ queryKey: ['products'] }),
        ])
      }
      throw err
    }
  }

  return { addToBag, isAdding: add.isPending }
}
