
// for ProductCard 
// ProductDetailPage  
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../lib/api'
import { useBag } from './bag'
import type { GuestCartItem } from './guestCart'
import { useCart } from './useCart'

export function useAddToBag() {
  const { add } = useCart()
  const bag = useBag()
  const queryClient = useQueryClient()

  const addToBag = async (item: GuestCartItem) => {
    try {
      await add.mutateAsync(item) // cart ထဲထည့် (guest ဆို localStorage, member ဆို server)
      bag.open(item.variantId) 
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') {
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
