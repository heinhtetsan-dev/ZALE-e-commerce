import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ErrorBox, Notice, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatSize, money } from '../lib/format'
import type { Order } from '../lib/types'

export function OrderConfirmationPage() {
  const { id = '' } = useParams()
  const order = useQuery({
    queryKey: ['order', id],
    queryFn: () => api<Order>(`/orders/${id}`),
    // Card payments are confirmed asynchronously (webhook); poll briefly until paid.
    refetchInterval: (q) => (q.state.data && q.state.data.paymentStatus === 'UNPAID' && q.state.data.status === 'PENDING' && q.state.dataUpdateCount < 10 ? 2000 : false),
  })

  if (order.isPending) return <Spinner />
  if (order.isError) return <ErrorBox message={errorMessage(order.error)} onRetry={() => order.refetch()} />
  const o = order.data
  const paid = o.paymentStatus === 'PAID'

  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className={`mx-auto grid size-16 place-items-center rounded-full ${paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          {paid ? <path d="M5 13l4 4L19 7" /> : <path d="M12 8v5m0 3h.01" />}
        </svg>
      </div>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{paid ? 'Thank you for your order!' : 'Waiting for payment confirmation'}</h1>
      <p className="mt-2 text-stone-600">
        Order <strong>#{o.number}</strong> · {money(o.totalCents)}
      </p>
      {!paid && o.status === 'PENDING' && (
        <div className="mt-6 text-left">
          <Notice tone="warning">
            We have not received your payment yet. If you closed the payment form,{' '}
            <Link to={`/orders/${o.id}/pay`} className="font-semibold underline">
              complete payment here
            </Link>
            .
          </Notice>
        </div>
      )}
      <ul className="card mt-8 divide-y divide-stone-200 text-left">
        {o.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 p-4 text-sm">
            <span>
              {i.productName} · {formatSize(i.size)} × {i.quantity}
            </span>
            <span className="font-semibold">{money(i.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to={`/account/orders/${o.id}`} className="btn-secondary">
          View order details
        </Link>
        <Link to="/" className="btn-primary">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
