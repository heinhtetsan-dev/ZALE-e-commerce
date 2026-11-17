import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { OrderStatusBadge, PaymentBadge } from '../components/OrderStatusBadge'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorBox, PageTitle, ProductImage, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDate, money } from '../lib/format'
import type { Order, Page } from '../lib/types'

/** Cancel (with a full refund) is offered until the order ships. Confirms inline because it moves money. */
function CancelOrder({ order }: { order: Order }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const cancel = useMutation({
    mutationFn: () => api<Order>(`/orders/${order.id}/cancel`, { method: 'POST' }),
    onSuccess: (o) => {
      queryClient.setQueryData(['order', order.id], o)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  if (!confirming) {
    return (
      <div className="mt-3 border-t border-stone-200 pt-3 text-right">
        <button type="button" className="btn-secondary px-3 py-2" onClick={() => setConfirming(true)}>
          Cancel order
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3" role="group" aria-label="Confirm cancellation">
      <p className="text-sm text-red-900">
        Cancel order #{order.number}? You will be refunded {money(order.totalCents)} in full and the items go back into stock.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-danger px-3 py-2" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
          {cancel.isPending ? 'Cancelling…' : 'Yes, cancel order'}
        </button>
        <button type="button" className="btn-ghost px-3 py-2" onClick={() => setConfirming(false)} disabled={cancel.isPending}>
          Keep order
        </button>
      </div>
      {cancel.isError && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {errorMessage(cancel.error)}
        </p>
      )}
    </div>
  )
}

export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const orders = useQuery({
    queryKey: ['orders', page],
    queryFn: () => api<Page<Order>>('/orders', { query: { page, pageSize: 10 } }),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle>Order history</PageTitle>
      {orders.isPending ? (
        <Spinner />
      ) : orders.isError ? (
        <ErrorBox message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : orders.data.items.length === 0 ? (
        <EmptyState title="No orders yet" action={<Link to="/" className="btn-primary">Start shopping</Link>}>
          When you place an order it will show up here.
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-3">
            {orders.data.items.map((o) => (
              <li key={o.id} className="card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link to={`/account/orders/${o.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((i) => (
                        <ProductImage key={i.id} src={i.image} alt="" className="size-14 rounded-lg ring-2 ring-white" />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold group-hover:underline">Order #{o.number}</p>
                      <p className="text-sm text-stone-600">
                        {formatDate(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={o.status} />
                    <PaymentBadge status={o.paymentStatus} />
                  </div>
                  <p className="font-bold sm:w-24 sm:text-right">{money(o.totalCents)}</p>
                </div>
                {o.status === 'PENDING' && o.paymentStatus === 'PAID' && <CancelOrder order={o} />}
              </li>
            ))}
          </ul>
          <Pagination page={orders.data.page} totalPages={orders.data.totalPages} onChange={(p) => setParams({ page: String(p) })} />
        </>
      )}
    </div>
  )
}
