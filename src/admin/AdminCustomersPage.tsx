import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { OrderStatusBadge, PaymentBadge } from '../components/OrderStatusBadge'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorBox, Spinner, Stars } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDate, money } from '../lib/format'
import type { Page } from '../lib/types'
import { AdminSearchBox, FilterPills } from './AdminSearchBox'
import type { AdminCustomer, AdminCustomerDetail } from './types'

type StatusFilter = '' | 'active' | 'disabled'

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

function AccountBadge({ disabledAt }: { disabledAt: string | null }) {
  return disabledAt ? (
    <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">Disabled</span>
  ) : (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Active</span>
  )
}

function DisableToggle({ customer }: { customer: AdminCustomer }) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const disabled = Boolean(customer.disabledAt)
  const toggle = useMutation({
    mutationFn: () => api<AdminCustomerDetail>(`/admin/customers/${customer.id}`, { method: 'PATCH', body: { disabled: !disabled } }),
    onSuccess: () => setConfirming(false),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] }),
  })

  if (disabled) {
    return (
      <div>
        <button type="button" className="btn-secondary px-3 py-2" onClick={() => toggle.mutate()} disabled={toggle.isPending}>
          {toggle.isPending ? 'Enabling…' : 'Enable account'}
        </button>
        {toggle.isError && <p className="mt-1 text-xs text-red-600" role="alert">{errorMessage(toggle.error)}</p>}
      </div>
    )
  }
  if (!confirming) {
    return (
      <button type="button" className="btn-secondary px-3 py-2" onClick={() => setConfirming(true)}>
        Disable account
      </button>
    )
  }
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3" role="group" aria-label="Confirm disabling">
      <p className="text-sm text-red-900">
        Disable {customer.name}'s account? They are signed out everywhere and can't sign in until you enable it again. Their orders are kept.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-danger px-3 py-2" onClick={() => toggle.mutate()} disabled={toggle.isPending}>
          {toggle.isPending ? 'Disabling…' : 'Yes, disable'}
        </button>
        <button type="button" className="btn-ghost px-3 py-2" onClick={() => setConfirming(false)} disabled={toggle.isPending}>
          Cancel
        </button>
      </div>
      {toggle.isError && <p className="mt-2 text-xs text-red-700" role="alert">{errorMessage(toggle.error)}</p>}
    </div>
  )
}

function CustomerDetail({ id }: { id: string }) {
  const detail = useQuery({ queryKey: ['admin', 'customers', 'detail', id], queryFn: () => api<AdminCustomerDetail>(`/admin/customers/${id}`) })
  if (detail.isPending) return <Spinner />
  if (detail.isError) return <ErrorBox message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />
  const { orders, reviews } = detail.data
  return (
    <div className="grid gap-6 text-sm md:grid-cols-2">
      <section>
        <h3 className="mb-2 font-semibold">Orders</h3>
        {orders.length === 0 ? (
          <p className="text-stone-500">No orders yet.</p>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">#{o.number}</span>
                <span className="text-stone-500">{formatDate(o.createdAt)}</span>
                <OrderStatusBadge status={o.status} />
                <PaymentBadge status={o.paymentStatus} />
                <span className="ml-auto tabular-nums">{money(o.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Reviews</h3>
        {reviews.length === 0 ? (
          <p className="text-stone-500">No reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <Link to={`/products/${r.product.slug}`} className="truncate hover:underline">
                    {r.product.name}
                  </Link>
                </div>
                {(r.title || r.comment) && <p className="mt-1 line-clamp-2 text-stone-600">{[r.title, r.comment].filter(Boolean).join(' — ')}</p>}
              </li>
            ))}
          </ul>
        )}
        {reviews.length > 0 && (
          <Link to={`/admin/reviews?q=${encodeURIComponent(detail.data.email)}`} className="mt-3 inline-block text-xs font-semibold hover:underline">
            Manage these reviews →
          </Link>
        )}
      </section>
    </div>
  )
}

function CustomerRow({ customer }: { customer: AdminCustomer }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <p className="font-semibold">{customer.name}</p>
          <p className="truncate text-sm text-stone-600">{customer.email}</p>
          <p className="text-xs text-stone-500">Joined {formatDate(customer.createdAt)}</p>
        </button>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-xs text-stone-500">Orders</dt>
            <dd className="font-semibold tabular-nums">{customer.orderCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Spent</dt>
            <dd className="font-semibold tabular-nums">{money(customer.totalSpentCents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Reviews</dt>
            <dd className="font-semibold tabular-nums">{customer.reviewCount}</dd>
          </div>
        </dl>
        <AccountBadge disabledAt={customer.disabledAt} />
        <div className="md:w-72 md:text-right">
          <DisableToggle customer={customer} />
        </div>
      </div>
      {open && (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <CustomerDetail id={customer.id} />
        </div>
      )}
    </li>
  )
}

export function AdminCustomersPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const status = (params.get('status') ?? '') as StatusFilter
  const page = Math.max(1, Number(params.get('page')) || 1)
  const customers = useQuery({
    queryKey: ['admin', 'customers', q, status, page],
    queryFn: () => api<Page<AdminCustomer>>('/admin/customers', { query: { q: q || undefined, status: status || undefined, page, pageSize: 20 } }),
    placeholderData: keepPreviousData,
  })
  const go = (next: { q?: string; status?: StatusFilter; page?: number }) => {
    const merged = { q, status, page: 1, ...next }
    setParams({ ...(merged.q ? { q: merged.q } : {}), ...(merged.status ? { status: merged.status } : {}), ...(merged.page > 1 ? { page: String(merged.page) } : {}) })
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold sm:mr-4 sm:text-3xl">Customers</h1>
        <AdminSearchBox key={q} initial={q} label="Search customers" placeholder="Search name or email…" onSearch={(v) => go({ q: v })} />
      </div>
      <div className="mb-4">
        <FilterPills label="Filter by account status" options={FILTERS} value={status} onChange={(v) => go({ status: v })} />
      </div>
      {customers.isPending ? (
        <Spinner />
      ) : customers.isError ? (
        <ErrorBox message={errorMessage(customers.error)} onRetry={() => customers.refetch()} />
      ) : customers.data.items.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <>
          <ul className="space-y-3">
            {customers.data.items.map((c) => (
              <CustomerRow key={c.id} customer={c} />
            ))}
          </ul>
          <Pagination page={customers.data.page} totalPages={customers.data.totalPages} onChange={(p) => go({ page: p })} />
        </>
      )}
    </div>
  )
}
