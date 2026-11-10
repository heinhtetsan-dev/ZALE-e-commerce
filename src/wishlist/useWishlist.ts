import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { api } from '../lib/api'

const KEY = ['wishlist', 'ids']

export function useWishlist() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const ids = useQuery({
    queryKey: KEY,
    queryFn: () => api<{ productIds: string[] }>('/wishlist/ids').then((r) => new Set(r.productIds)),
    enabled: !!user,
    staleTime: 60_000,
  })

  const toggle = useMutation({
    mutationFn: ({ productId, on }: { productId: string; on: boolean }) =>
      on ? api('/wishlist', { method: 'POST', body: { productId } }) : api(`/wishlist/${productId}`, { method: 'DELETE' }),
    // Optimistic: flip the heart immediately, roll back on failure.
    onMutate: async ({ productId, on }) => {
      await queryClient.cancelQueries({ queryKey: KEY })
      const previous = queryClient.getQueryData<Set<string>>(KEY)
      const next = new Set(previous)
      if (on) next.add(productId)
      else next.delete(productId)
      queryClient.setQueryData(KEY, next)
      return { previous }
    },
    onError: (_err, _vars, ctx) => queryClient.setQueryData(KEY, ctx?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'list'] })
    },
  })

  return {
    enabled: !!user,
    has: (productId: string) => ids.data?.has(productId) ?? false,
    toggle: (productId: string) => toggle.mutate({ productId, on: !(ids.data?.has(productId) ?? false) }),
    isPending: toggle.isPending,
  }
}
