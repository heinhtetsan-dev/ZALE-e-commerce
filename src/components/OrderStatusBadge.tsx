import type { OrderStatus, PaymentStatus } from '../lib/types'

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  SHIPPED: 'bg-sky-100 text-sky-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-stone-200 text-stone-700',
}

const statusLabel: Record<OrderStatus, string> = { PENDING: 'Pending', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' }

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>{statusLabel[status]}</span>
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const style = status === 'PAID' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : status === 'REFUNDED' ? 'bg-stone-50 text-stone-600 ring-stone-200' : 'bg-red-50 text-red-700 ring-red-200'
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${style}`}>{status === 'PAID' ? 'Paid' : status === 'REFUNDED' ? 'Refunded' : 'Unpaid'}</span>
}
