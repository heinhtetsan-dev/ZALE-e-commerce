import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { Pagination } from '../components/Pagination'
import { ProductCard } from '../components/ProductCard'
import { EmptyState, ErrorBox, PageTitle, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import type { Page, ProductCard as Product } from '../lib/types'

export function WishlistPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const list = useQuery({
    queryKey: ['wishlist', 'list', page],
    queryFn: () => api<Page<{ addedAt: string; product: Product }>>('/wishlist', { query: { page, pageSize: 24 } }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <PageTitle subtitle={list.data ? `${list.data.total} saved` : undefined}>Wishlist</PageTitle>
      {list.isPending ? (
        <Spinner />
      ) : list.isError ? (
        <ErrorBox message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState title="Your wishlist is empty" action={<Link to="/" className="btn-primary">Browse the shop</Link>}>
          Tap the heart on any item to save it for later.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {list.data.items.map((i) => (
              <ProductCard key={i.product.id} product={i.product} />
            ))}
          </div>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={(p) => setParams({ page: String(p) })} />
        </>
      )}
    </div>
  )
}
