import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorBox, ProductImage, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { genderLabel, money } from '../lib/format'
import type { Page } from '../lib/types'
import type { AdminProduct } from './types'

function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [q, setQ] = useState(initial)
  return (
    <form
      role="search"
      className="flex flex-1 gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(q.trim())
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Search products</span>
        <input type="search" className="input" placeholder="Search name, slug or brand…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <button type="submit" className="btn-secondary">
        Search
      </button>
    </form>
  )
}

export function AdminProductsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const products = useQuery({
    queryKey: ['admin', 'products', q, page],
    queryFn: () => api<Page<AdminProduct>>('/admin/products', { query: { q: q || undefined, page, pageSize: 20 } }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold sm:mr-4 sm:text-3xl">Products</h1>
        <SearchBox key={q} initial={q} onSearch={(v) => setParams(v ? { q: v } : {})} />
        <Link to="/admin/products/new" className="btn-accent">
          + New product
        </Link>
      </div>

      {products.isPending ? (
        <Spinner />
      ) : products.isError ? (
        <ErrorBox message={errorMessage(products.error)} onRetry={() => products.refetch()} />
      ) : products.data.items.length === 0 ? (
        <EmptyState title="No products found" />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Sizes</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                        <ProductImage src={p.image} alt="" className="size-10 rounded-md" />
                        <span>
                          {p.name}
                          <span className="block text-xs font-normal text-stone-500">{p.brand.name} · {genderLabel(p.gender)}{p.colorway ? ` · ${p.colorway}` : ''}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{p.category.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(p.priceCents)}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${p.totalStock === 0 ? 'text-red-700' : ''}`}>{p.totalStock}</td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      {p.variants.filter((v) => v.stock > 0).length}/{p.variants.length} in stock
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                        {p.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={products.data.page} totalPages={products.data.totalPages} onChange={(p) => setParams({ ...(q ? { q } : {}), page: String(p) })} />
        </>
      )}
    </div>
  )
}
