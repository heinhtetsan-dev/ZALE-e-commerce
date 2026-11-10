import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { OrderStatusBadge, PaymentBadge } from '../components/OrderStatusBadge'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorBox, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDateTime, formatSize, money } from '../lib/format'
import type { OrderStatus, Page } from '../lib/types'
import type { AdminOrder } from './types'

const FILTERS: Array<{ value: OrderStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function NextAction({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient()
  const advance = useMutation({
    mutationFn: (status: 'SHIPPED' | 'DELIVERED') => api<AdminOrder>(`/admin/orders/${order.id}/status`, { method: 'PATCH', body: { status } }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] })
    },
  })

  let action: { status: 'SHIPPED' | 'DELIVERED'; label: string } | null = null
  if (order.status === 'PENDING' && order.paymentStatus === 'PAID') action = { status: 'SHIPPED', label: 'Mark shipped' }
  if (order.status === 'SHIPPED') action = { status: 'DELIVERED', label: 'Mark delivered' }

  return (
    <div>
      {action ? (
        <button type="button" className="btn-primary px-3 py-2" onClick={() => advance.mutate(action.status)} disabled={advance.isPending}>
          {advance.isPending ? 'Updating…' : action.label}
        </button>
      ) : (
        <span className="text-xs text-stone-500">{order.status === 'PENDING' ? 'Awaiting payment' : '—'}</span>
      )}
      {advance.isError && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {errorMessage(advance.error)}
        </p>
      )}
    </div>
  )
}

function OrderRow({ order }: { order: AdminOrder }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <p className="font-semibold">
            #{order.number} <span className="font-normal text-stone-500">· {formatDateTime(order.createdAt)}</span>
          </p>
          <p className="truncate text-sm text-stone-600">
            {order.customer.name} · {order.customer.email}
          </p>
        </button>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} />
        </div>
        <p className="font-bold tabular-nums md:w-24 md:text-right">{money(order.totalCents)}</p>
        <div className="md:w-36 md:text-right">
          <NextAction order={order} />
        </div>
      </div>
      {open && (
        <div className="mt-4 grid gap-4 border-t border-stone-200 pt-4 text-sm sm:grid-cols-2">
          <ul className="space-y-1">
            {order.items.map((i) => (
              <li key={i.id}>
                {i.quantity} × {i.productName} · {formatSize(i.size)} <span className="text-stone-500">({money(i.unitPriceCents)})</span>
              </li>
            ))}
          </ul>
          <address className="not-italic text-stone-600">
            {order.shippingAddress.fullName}, {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}, {order.shippingAddress.postalCode} {order.shippingAddress.city}, {order.shippingAddress.country}
          </address>
        </div>
      )}
    </li>
  )
}

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as OrderStatus | ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const orders = useQuery({
    queryKey: ['admin', 'orders', status, page],
    queryFn: () => api<Page<AdminOrder>>('/admin/orders', { query: { status: status || undefined, page, pageSize: 20 } }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold sm:text-3xl">Orders</h1>
      <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={status === f.value}
            onClick={() => setParams(f.value ? { status: f.value } : {})}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${status === f.value ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {orders.isPending ? (
        <Spinner />
      ) : orders.isError ? (
        <ErrorBox message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : orders.data.items.length === 0 ? (
        <EmptyState title="No orders" />
      ) : (
        <>
          <ul className="space-y-3">
            {orders.data.items.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
          <Pagination page={orders.data.page} totalPages={orders.data.totalPages} onChange={(p) => setParams({ ...(status ? { status } : {}), page: String(p) })} />
        </>
      )}
    </div>
  )
}
