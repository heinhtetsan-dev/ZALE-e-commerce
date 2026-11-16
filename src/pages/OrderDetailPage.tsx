import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { OrderStatusBadge, PaymentBadge } from '../components/OrderStatusBadge'
import { OrderSummary } from '../components/OrderSummary'
import { ErrorBox, ProductImage, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDateTime, formatSize, money } from '../lib/format'
import type { Order } from '../lib/types'

const steps = ['PENDING', 'SHIPPED', 'DELIVERED'] as const

export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === 'CANCELLED') {
    return <p className="text-sm text-stone-600">This order was cancelled{order.cancelledAt ? ` on ${formatDateTime(order.cancelledAt)}` : ''}. Any reserved stock was released.</p>
  }
  const reached = steps.indexOf(order.status)
  const dates = [order.createdAt, order.shippedAt, order.deliveredAt]
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-col gap-2">
          <span className={`h-1.5 rounded-full ${i <= reached ? 'bg-emerald-500' : 'bg-stone-200'}`} />
          <span className={`text-xs font-semibold sm:text-sm ${i <= reached ? 'text-stone-900' : 'text-stone-400'}`}>{s === 'PENDING' ? 'Placed' : s === 'SHIPPED' ? 'Shipped' : 'Delivered'}</span>
          {dates[i] && i <= reached && <span className="text-xs text-stone-500">{formatDateTime(dates[i]!)}</span>}
        </li>
      ))}
    </ol>
  )
}

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api<Order>(`/orders/${id}`) })
  const cancel = useMutation({
    mutationFn: () => api<Order>(`/orders/${id}/cancel`, { method: 'POST' }),
    onSuccess: (o) => {
      queryClient.setQueryData(['order', id], o)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  if (order.isPending) return <Spinner />
  if (order.isError) return <ErrorBox message={errorMessage(order.error)} onRetry={() => order.refetch()} />
  const o = order.data
  const awaitingPayment = o.status === 'PENDING' && o.paymentStatus === 'UNPAID'

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/account/orders" className="text-sm text-stone-600 hover:underline">
        ← All orders
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Order #{o.number}</h1>
        <OrderStatusBadge status={o.status} />
        <PaymentBadge status={o.paymentStatus} />
      </div>
      <p className="-mt-4 mb-6 text-sm text-stone-600">Placed {formatDateTime(o.createdAt)}</p>

      {awaitingPayment && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center">
          <p className="flex-1">This order is waiting for payment. Your items are reserved for a limited time.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              Cancel order
            </button>
            <Link to={`/orders/${o.id}/pay`} className="btn-primary">
              Pay now
            </Link>
          </div>
        </div>
      )}
      {cancel.isError && (
        <div className="mb-6">
          <ErrorBox message={errorMessage(cancel.error)} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold">Status</h2>
            <OrderTimeline order={o} />
          </section>
          <section className="card p-5">
            <h2 className="mb-2 text-lg font-semibold">Items</h2>
            <ul className="divide-y divide-stone-200">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  <ProductImage src={i.image} alt="" className="size-16 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${i.productSlug}`} className="block truncate font-semibold hover:underline">
                      {i.productName}
                    </Link>
                    <p className="text-sm text-stone-600">
                      {formatSize(i.size)} · {i.quantity} × {money(i.unitPriceCents)}
                    </p>
                  </div>
                  <p className="font-semibold">{money(i.lineTotalCents)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="space-y-6">
          <OrderSummary subtotalCents={o.subtotalCents} shippingCents={o.shippingCents} />
          <section className="card p-5 text-sm">
            <h2 className="mb-2 text-lg font-semibold">Shipping to</h2>
            <address className="not-italic leading-relaxed text-stone-700">
              {o.shippingAddress.fullName}
              <br />
              {o.shippingAddress.line1}
              {o.shippingAddress.line2 && (
                <>
                  <br />
                  {o.shippingAddress.line2}
                </>
              )}
              <br />
              {o.shippingAddress.postalCode} {o.shippingAddress.city}, {o.shippingAddress.country}
              {o.shippingAddress.phone && (
                <>
                  <br />
                  {o.shippingAddress.phone}
                </>
              )}
            </address>
          </section>
        </div>
      </div>
    </div>
  )
}
