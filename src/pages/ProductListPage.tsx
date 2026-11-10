import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { FilterPanel } from '../catalog/FilterPanel'
import { activeFilterCount, filtersToParams, parseFilters, SORTS, type CatalogFilters, type Sort } from '../catalog/filters'
import { Pagination } from '../components/Pagination'
import { ProductCard } from '../components/ProductCard'
import { EmptyState, ErrorBox, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import type { Facets, Page, ProductCard as Product } from '../lib/types'

const PAGE_SIZE = 12

function SearchForm({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [search, setSearch] = useState(initial)
  return (
    <form
      role="search"
      className="mt-6 flex max-w-xl gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(search.trim())
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Search shoes</span>
        <input
          type="search"
          className="input border-transparent"
          placeholder="Search by name or brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
        />
      </label>
      <button type="submit" className="btn-accent">
        Search
      </button>
    </form>
  )
}

export function ProductListPage() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const facets = useQuery({ queryKey: ['facets'], queryFn: () => api<Facets>('/products/facets'), staleTime: 5 * 60_000 })
  const products = useQuery({
    queryKey: ['products', filters],
    queryFn: ({ signal }) =>
      api<Page<Product>>('/products', {
        signal,
        query: {
          q: filters.q || undefined,
          brand: filters.brand,
          category: filters.category,
          color: filters.color,
          size: filters.size,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          sort: filters.sort,
          page: filters.page,
          pageSize: PAGE_SIZE,
        },
      }),
    placeholderData: keepPreviousData,
  })

  // Any filter change resets to page 1; page changes keep the filters.
  const update = (next: Partial<CatalogFilters>) => setParams(filtersToParams({ ...filters, page: 1, ...next }))
  const goToPage = (page: number) => {
    setParams(filtersToParams({ ...filters, page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeCount = activeFilterCount(filters)
  const clearAll = () => setParams(filtersToParams({ q: filters.q, brand: [], category: [], color: [], size: [], sort: filters.sort, page: 1 }))

  return (
    <div>
      <section className="mb-6 overflow-hidden rounded-2xl bg-stone-900 px-6 py-8 text-white sm:px-10 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-500">New season</p>
        <h1 className="mt-2 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Find your next favourite pair.</h1>
        <SearchForm key={filters.q} initial={filters.q} onSearch={(q) => update({ q })} />
      </section>

      <div className="flex gap-8">
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filters">
          {facets.data && <FilterPanel facets={facets.data} filters={filters} onChange={update} />}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-stone-600" aria-live="polite">
              {products.data ? `${products.data.total} ${products.data.total === 1 ? 'result' : 'results'}` : ' '}
              {filters.q && (
                <>
                  {' '}for “<strong>{filters.q}</strong>”{' '}
                  <button type="button" className="underline" onClick={() => update({ q: '' })}>
                    clear
                  </button>
                </>
              )}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" className="btn-secondary lg:hidden" onClick={() => setDrawerOpen(true)}>
                Filters{activeCount > 0 && ` (${activeCount})`}
              </button>
              <label className="flex items-center gap-2 text-sm">
                <span className="hidden sm:inline">Sort by</span>
                <select className="input w-auto py-2" value={filters.sort} onChange={(e) => update({ sort: e.target.value as Sort })}>
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {activeCount > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {[...filters.brand.map((v) => ['brand', v] as const), ...filters.category.map((v) => ['category', v] as const), ...filters.color.map((v) => ['color', v] as const)].map(([key, v]) => (
                <button key={`${key}-${v}`} type="button" className="rounded-full bg-stone-200 px-3 py-1 text-xs font-medium" onClick={() => update({ [key]: filters[key].filter((x) => x !== v) })}>
                  {facets.data?.brands.find((b) => b.slug === v)?.name ?? facets.data?.categories.find((c) => c.slug === v)?.name ?? v} ✕
                </button>
              ))}
              {filters.size.map((s) => (
                <button key={`size-${s}`} type="button" className="rounded-full bg-stone-200 px-3 py-1 text-xs font-medium" onClick={() => update({ size: filters.size.filter((x) => x !== s) })}>
                  EU {s} ✕
                </button>
              ))}
              {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                <button type="button" className="rounded-full bg-stone-200 px-3 py-1 text-xs font-medium" onClick={() => update({ minPrice: undefined, maxPrice: undefined })}>
                  ${(filters.minPrice ?? 0) / 100} – {filters.maxPrice !== undefined ? `$${filters.maxPrice / 100}` : 'any'} ✕
                </button>
              )}
              <button type="button" className="px-2 text-xs font-semibold underline" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {products.isPending ? (
            <Spinner label="Loading shoes…" />
          ) : products.isError ? (
            <ErrorBox message={errorMessage(products.error)} onRetry={() => products.refetch()} />
          ) : products.data.items.length === 0 ? (
            <EmptyState
              title="No shoes match your filters"
              action={
                <button type="button" className="btn-primary" onClick={() => setParams(new URLSearchParams())}>
                  Reset filters
                </button>
              }
            >
              Try removing a filter or searching for something else.
            </EmptyState>
          ) : (
            <>
              <div className={`grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4 ${products.isPlaceholderData ? 'opacity-60' : ''}`}>
                {products.data.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination page={products.data.page} totalPages={products.data.totalPages} onChange={goToPage} />
            </>
          )}
        </div>
      </div>

      {drawerOpen && facets.data && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button type="button" className="btn-ghost px-2" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <FilterPanel facets={facets.data} filters={filters} onChange={update} />
            </div>
            <div className="flex gap-2 border-t border-stone-200 p-4">
              <button type="button" className="btn-secondary flex-1" onClick={clearAll}>
                Clear
              </button>
              <button type="button" className="btn-primary flex-1" onClick={() => setDrawerOpen(false)}>
                Show {products.data?.total ?? ''} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
