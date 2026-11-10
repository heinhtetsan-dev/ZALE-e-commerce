import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { ErrorBox, ProductImage, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatSize, money } from '../lib/format'
import { fillDays } from './chartData'
import { RevenueChart } from './RevenueChart'
import type { SalesSummary } from './types'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  )
}

export function AdminDashboardPage() {
  const [days, setDays] = useState<number>(30)
  const summary = useQuery({
    queryKey: ['admin', 'summary', days],
    queryFn: () => {
      // Range is computed when the query runs, not during render.
      const to = new Date()
      const from = new Date(to.getTime() - (days - 1) * 86_400_000)
      from.setUTCHours(0, 0, 0, 0)
      return api<SalesSummary>('/admin/summary', { query: { from: from.toISOString(), to: to.toISOString() } })
    },
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Sales overview</h1>
        <div className="inline-flex rounded-lg border border-stone-300 bg-white p-1" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              aria-pressed={days === r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${days === r.days ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {summary.isPending ? (
        <Spinner />
      ) : summary.isError ? (
        <ErrorBox message={errorMessage(summary.error)} onRetry={() => summary.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Revenue" value={money(summary.data.revenueCents)} hint="Paid orders in range" />
            <Stat label="Paid orders" value={summary.data.paidOrders.toLocaleString()} />
            <Stat label="Avg. order value" value={money(summary.data.averageOrderCents)} />
            <Stat label="Awaiting shipment" value={summary.data.awaitingShipment.toLocaleString()} hint="Paid, not yet shipped" />
          </div>

          <section className="card p-4 sm:p-5">
            <h2 className="text-lg font-semibold">Revenue per day</h2>
            <p className="text-xs text-stone-500">Paid orders, by payment date (UTC)</p>
            <div className="mt-3">
              <RevenueChart days={fillDays(summary.data.range.from, summary.data.range.to, summary.data.revenueByDay)} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="card p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-semibold">Orders by status</h2>
              <ul className="space-y-2">
                {(['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map((s) => (
                  <li key={s} className="flex items-center justify-between">
                    <Link to={`/admin/orders?status=${s}`} className="hover:underline">
                      <OrderStatusBadge status={s} />
                    </Link>
                    <span className="font-semibold tabular-nums">{summary.data.ordersByStatus[s]}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-semibold">Top products</h2>
              {summary.data.topProducts.length === 0 ? (
                <p className="text-sm text-stone-500">No sales in this period.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {summary.data.topProducts.map((p, i) => (
                    <li key={p.productId} className="flex items-center gap-3">
                      <span className="w-4 text-stone-400 tabular-nums">{i + 1}</span>
                      <Link to={`/admin/products/${p.productId}`} className="min-w-0 flex-1 truncate hover:underline">
                        {p.name}
                      </Link>
                      <span className="tabular-nums text-stone-600">{p.units} sold</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="card p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-semibold">Low stock</h2>
              {summary.data.lowStock.length === 0 ? (
                <p className="text-sm text-stone-500">All sizes are well stocked.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {summary.data.lowStock.map((v) => (
                    <li key={v.variantId} className="flex items-center gap-3">
                      <ProductImage src={v.image} alt="" className="size-9 rounded-md" />
                      <Link to={`/admin/products/${v.productId}`} className="min-w-0 flex-1 truncate hover:underline">
                        {v.productName} · {formatSize(v.size)}
                      </Link>
                      <span className={`font-semibold tabular-nums ${v.stock === 0 ? 'text-red-700' : 'text-amber-700'}`}>{v.stock === 0 ? 'Sold out' : `${v.stock} left`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
