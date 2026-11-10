import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { OrderStatusBadge, PaymentBadge } from '../components/OrderStatusBadge'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorBox, PageTitle, ProductImage, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDate, money } from '../lib/format'
import type { Order, Page } from '../lib/types'

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
              <li key={o.id}>
                <Link to={`/account/orders/${o.id}`} className="card flex flex-col gap-3 p-4 hover:bg-stone-50 sm:flex-row sm:items-center">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 3).map((i) => (
                      <ProductImage key={i.id} src={i.image} alt="" className="size-14 rounded-lg ring-2 ring-white" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Order #{o.number}</p>
                    <p className="text-sm text-stone-600">
                      {formatDate(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={o.status} />
                    <PaymentBadge status={o.paymentStatus} />
                  </div>
                  <p className="font-bold sm:w-24 sm:text-right">{money(o.totalCents)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={orders.data.page} totalPages={orders.data.totalPages} onChange={(p) => setParams({ page: String(p) })} />
        </>
      )}
    </div>
  )
}
