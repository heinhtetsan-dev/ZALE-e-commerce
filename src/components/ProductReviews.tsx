import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context'
import { api, errorMessage } from '../lib/api'
import { formatDate } from '../lib/format'
import type { Page, Review } from '../lib/types'
import { Pagination } from './Pagination'
import { ErrorBox, FieldError, Stars, StarInput } from './ui'

type ReviewPage = Page<Review> & { distribution: Record<string, number> }

function ReviewForm({ productId, slug, existing, onDone }: { productId: string; slug: string; existing: Review | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [error, setError] = useState<string>()

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
    queryClient.invalidateQueries({ queryKey: ['product', slug] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const save = useMutation({
    mutationFn: () => {
      const body = { rating, title: title.trim() || undefined, comment: comment.trim() || undefined }
      return existing ? api<Review>(`/reviews/${existing.id}`, { method: 'PATCH', body }) : api<Review>(`/products/${productId}/reviews`, { method: 'POST', body })
    },
    onSuccess: () => {
      refresh()
      onDone()
    },
  })
  const remove = useMutation({
    mutationFn: () => api(`/reviews/${existing!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      refresh()
      onDone()
    },
  })

  return (
    <form
      className="card space-y-4 p-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (rating < 1) return setError('Choose a star rating')
        if (comment.length > 2000) return setError('Comment is too long (max 2000 characters)')
        setError(undefined)
        save.mutate()
      }}
    >
      <h3 className="font-semibold">{existing ? 'Edit your review' : 'Write a review'}</h3>
      <div>
        <StarInput value={rating} onChange={setRating} />
        <FieldError message={error} />
      </div>
      <div>
        <label className="label" htmlFor="review-title">
          Title (optional)
        </label>
        <input id="review-title" className="input" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="review-comment">
          Your review (optional)
        </label>
        <textarea id="review-comment" className="input" rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How do they fit? How comfortable are they?" />
      </div>
      {(save.isError || remove.isError) && <ErrorBox message={errorMessage(save.error ?? remove.error)} />}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : existing ? 'Update review' : 'Submit review'}
        </button>
        <button type="button" className="btn-ghost" onClick={onDone}>
          Cancel
        </button>
        {existing && (
          <button type="button" className="btn-ghost ml-auto text-red-700" onClick={() => remove.mutate()} disabled={remove.isPending}>
            Delete review
          </button>
        )}
      </div>
    </form>
  )
}

export function ProductReviews({ productId, slug, ratingAvg, ratingCount }: { productId: string; slug: string; ratingAvg: number; ratingCount: number }) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(false)
  const reviews = useQuery({
    queryKey: ['reviews', productId, page],
    queryFn: () => api<ReviewPage>(`/products/${productId}/reviews`, { query: { page, pageSize: 5 } }),
    placeholderData: keepPreviousData,
  })
  const mine = useQuery({
    queryKey: ['reviews', productId, 'mine'],
    queryFn: () => api<{ review: Review | null }>(`/products/${productId}/reviews/mine`).then((r) => r.review),
    enabled: !!user,
  })

  const dist = reviews.data?.distribution ?? {}
  const total = reviews.data?.total ?? ratingCount

  return (
    <section id="reviews" className="mt-12 scroll-mt-24 border-t border-stone-200 pt-8">
      <h2 className="text-xl font-bold">Reviews</h2>
      <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold tabular-nums">{ratingCount ? ratingAvg.toFixed(1) : '–'}</span>
            <div>
              <Stars value={ratingAvg} size="lg" />
              <p className="text-sm text-stone-600">
                {total} review{total === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5" aria-label="Rating distribution">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = dist[n] ?? 0
              return (
                <li key={n} className="flex items-center gap-2 text-sm">
                  <span className="w-12 text-stone-600">{n} star</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: total ? `${(count / total) * 100}%` : 0 }} />
                  </span>
                  <span className="w-6 text-right tabular-nums text-stone-600">{count}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-6">
            {!user ? (
              <p className="text-sm text-stone-600">
                <Link to="/login" state={{ from: `/products/${slug}` }} className="font-semibold underline">
                  Log in
                </Link>{' '}
                to write a review.
              </p>
            ) : !editing ? (
              <button type="button" className="btn-secondary w-full" onClick={() => setEditing(true)} disabled={mine.isPending}>
                {mine.data ? 'Edit your review' : 'Write a review'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {editing && user && <ReviewForm key={mine.data?.id ?? 'new'} productId={productId} slug={slug} existing={mine.data ?? null} onDone={() => setEditing(false)} />}
          {reviews.isError && <ErrorBox message={errorMessage(reviews.error)} onRetry={() => reviews.refetch()} />}
          {reviews.data && reviews.data.items.length === 0 && !editing && <p className="text-sm text-stone-600">No reviews yet. Be the first to share your thoughts.</p>}
          <ul className="divide-y divide-stone-200">
            {reviews.data?.items.map((r) => (
              <li key={r.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} />
                  {r.title && <p className="font-semibold">{r.title}</p>}
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {r.author.name} · {formatDate(r.createdAt)}
                  {r.verifiedPurchase && <span className="ml-2 font-semibold text-emerald-700">✓ Verified purchase</span>}
                </p>
                {r.comment && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
          {reviews.data && <Pagination page={reviews.data.page} totalPages={reviews.data.totalPages} onChange={setPage} />}
        </div>
      </div>
    </section>
  )
}
