import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorBox, Spinner, Stars } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDate } from '../lib/format'
import type { Page } from '../lib/types'
import { AdminSearchBox, FilterPills } from './AdminSearchBox'
import type { AdminReview } from './types'

type RatingFilter = '' | '1' | '2' | '3' | '4' | '5'

const FILTERS: Array<{ value: RatingFilter; label: string }> = [
  { value: '', label: 'All' },
  ...(['1', '2', '3', '4', '5'] as const).map((n) => ({ value: n, label: `${n} ★` })),
]

function DeleteReview({ review }: { review: AdminReview }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const remove = useMutation({
    mutationFn: () => api<void>(`/admin/reviews/${review.id}`, { method: 'DELETE' }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      queryClient.invalidateQueries({ queryKey: ['product'] })
    },
  })

  if (!confirming) {
    return (
      <button type="button" className="btn-secondary px-3 py-2" onClick={() => setConfirming(true)}>
        Delete
      </button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm deletion">
      <span className="text-sm text-red-800">Delete this review for good?</span>
      <button type="button" className="btn-danger px-3 py-2" onClick={() => remove.mutate()} disabled={remove.isPending}>
        {remove.isPending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" className="btn-ghost px-3 py-2" onClick={() => setConfirming(false)} disabled={remove.isPending}>
        Cancel
      </button>
      {remove.isError && (
        <p className="w-full text-xs text-red-600" role="alert">
          {errorMessage(remove.error)}
        </p>
      )}
    </div>
  )
}

export function AdminReviewsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const rating = (params.get('rating') ?? '') as RatingFilter
  const page = Math.max(1, Number(params.get('page')) || 1)
  const reviews = useQuery({
    queryKey: ['admin', 'reviews', q, rating, page],
    queryFn: () => api<Page<AdminReview>>('/admin/reviews', { query: { q: q || undefined, rating: rating || undefined, page, pageSize: 20 } }),
    placeholderData: keepPreviousData,
  })
  const go = (next: { q?: string; rating?: RatingFilter; page?: number }) => {
    const merged = { q, rating, page: 1, ...next }
    setParams({ ...(merged.q ? { q: merged.q } : {}), ...(merged.rating ? { rating: merged.rating } : {}), ...(merged.page > 1 ? { page: String(merged.page) } : {}) })
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold sm:mr-4 sm:text-3xl">Reviews</h1>
        <AdminSearchBox key={q} initial={q} label="Search reviews" placeholder="Search text, product or customer…" onSearch={(v) => go({ q: v })} />
      </div>
      <div className="mb-4">
        <FilterPills label="Filter by rating" options={FILTERS} value={rating} onChange={(v) => go({ rating: v })} />
      </div>
      {reviews.isPending ? (
        <Spinner />
      ) : reviews.isError ? (
        <ErrorBox message={errorMessage(reviews.error)} onRetry={() => reviews.refetch()} />
      ) : reviews.data.items.length === 0 ? (
        <EmptyState title="No reviews found" />
      ) : (
        <>
          <ul className="space-y-3">
            {reviews.data.items.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} />
                      <Link to={`/products/${r.product.slug}`} className="font-semibold hover:underline">
                        {r.product.name}
                      </Link>
                    </div>
                    {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                    {r.comment && <p className="mt-1 whitespace-pre-line text-sm text-stone-700">{r.comment}</p>}
                    <p className="mt-2 text-xs text-stone-500">
                      {r.author.name} · {r.author.email} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <DeleteReview review={r} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={reviews.data.page} totalPages={reviews.data.totalPages} onChange={(p) => go({ page: p })} />
        </>
      )}
    </div>
  )
}
