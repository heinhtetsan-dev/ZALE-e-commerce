import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { FilterPanel } from '../catalog/FilterPanel'
import { activeFilterCount, filtersToParams, parseFilters, SORTS, type Audience, type CatalogFilters, type Sort } from '../catalog/filters'
import { Pagination } from '../components/Pagination'
import { ProductCard } from '../components/ProductCard'
import { EmptyState, ErrorBox, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import type { Facets, Page, ProductCard as Product } from '../lib/types'

const PAGE_SIZE = 12

const AUDIENCES: Array<{ value?: Audience; label: string }> = [
  { value: undefined, label: 'All' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
]

const pageTitle = (f: CatalogFilters) => {
  if (f.q) return `“${f.q}”`
  if (f.gender) return f.gender === 'men' ? 'Men' : 'Women'
  if (f.category.length === 1 && f.category[0] === 'accessories') return 'Accessories'
  return 'New in'
}

const SUBTITLE = {
  all: 'The latest coats, knitwear, denim and accessories.',
  men: 'Jackets, jeans, shirts and essentials for men.',
  women: 'Dresses, knitwear, coats and essentials for women.',
}

function SearchForm({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [search, setSearch] = useState(initial)
  return (
    <form
      role="search"
      className="flex w-full max-w-sm gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(search.trim())
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Search clothing</span>
        <input
          type="search"
          className="input"
          placeholder="Search by item or color…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
        />
      </label>
      <button type="submit" className="btn-primary px-4">
        Search
      </button>
    </form>
  )
}

export function ProductListPage() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const facets = useQuery({
    queryKey: ['facets', filters.gender ?? 'all'],
    queryFn: () => api<Facets>('/products/facets', { query: { gender: filters.gender } }),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })
  const products = useQuery({
    queryKey: ['products', filters],
    queryFn: ({ signal }) =>
      api<Page<Product>>('/products', {
        signal,
        query: {
          gender: filters.gender,
          q: filters.q || undefined,
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
  // Filter changes keep the scroll position; only paging moves back to the top.
  const update = (next: Partial<CatalogFilters>) => setParams(filtersToParams({ ...filters, page: 1, ...next }), { preventScrollReset: true })
  const goToPage = (page: number) => {
    setParams(filtersToParams({ ...filters, page }), { preventScrollReset: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeCount = activeFilterCount(filters)
  const clearAll = () => setParams(filtersToParams({ q: filters.q, gender: filters.gender, category: [], color: [], size: [], sort: filters.sort, page: 1 }), { preventScrollReset: true })
  // Men's and women's size runs differ, so a size filter doesn't carry over.
  const switchAudience = (gender?: Audience) => update({ gender, size: [] })

  return (
    <div className="mx-auto max-w-360 px-4 py-8 sm:px-8 sm:py-12">
      <section className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">{filters.q ? 'Search results' : 'Shop'}</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">{pageTitle(filters)}</h1>
          <p className="mt-3 text-sm text-taupe">{SUBTITLE[filters.gender ?? 'all']}</p>
        </div>
        <SearchForm key={filters.q} initial={filters.q} onSearch={(q) => update({ q })} />
      </section>

      <div className="mb-8 flex gap-6 border-b border-sand-300" role="tablist" aria-label="Shop for">
        {AUDIENCES.map((a) => {
          const selected = filters.gender === a.value
          return (
            <button
              key={a.label}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => switchAudience(a.value)}
              className={`-mb-px border-b px-1 pb-3 text-xs uppercase tracking-[0.18em] transition ${selected ? 'border-ink text-ink' : 'border-transparent text-taupe hover:text-ink'}`}
            >
              {a.label}
            </button>
          )
        })}
      </div>

      <div className="flex gap-10">
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filters">
          {facets.data && <FilterPanel facets={facets.data} filters={filters} onChange={update} />}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-taupe" aria-live="polite">
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
              {[...filters.category.map((v) => ['category', v] as const), ...filters.color.map((v) => ['color', v] as const)].map(([key, v]) => (
                <button key={`${key}-${v}`} type="button" className="border border-sand-400 px-3 py-1 text-xs" onClick={() => update({ [key]: filters[key].filter((x) => x !== v) })}>
                  {facets.data?.categories.find((c) => c.slug === v)?.name ?? v} ✕
                </button>
              ))}
              {filters.size.map((s) => (
                <button key={`size-${s}`} type="button" className="border border-sand-400 px-3 py-1 text-xs" onClick={() => update({ size: filters.size.filter((x) => x !== s) })}>
                  Size {s} ✕
                </button>
              ))}
              {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                <button type="button" className="border border-sand-400 px-3 py-1 text-xs" onClick={() => update({ minPrice: undefined, maxPrice: undefined })}>
                  ${(filters.minPrice ?? 0) / 100} – {filters.maxPrice !== undefined ? `$${filters.maxPrice / 100}` : 'any'} ✕
                </button>
              )}
              <button type="button" className="px-2 text-xs font-semibold underline" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {products.isPending ? (
            <Spinner label="Loading products…" />
          ) : products.isError ? (
            <ErrorBox message={errorMessage(products.error)} onRetry={() => products.refetch()} />
          ) : products.data.items.length === 0 ? (
            <EmptyState
              title="Nothing matches your filters"
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
              <div className={`grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4 ${products.isPlaceholderData ? 'opacity-60' : ''}`}>
                {products.data.items.map((p, i) => (
                  <ProductCard key={p.id} product={p} tone={i} />
                ))}
              </div>
              <Pagination page={products.data.page} totalPages={products.data.totalPages} onChange={goToPage} />
            </>
          )}
        </div>
      </div>

      {drawerOpen && facets.data && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-cream shadow-xl">
            <div className="flex items-center justify-between border-b border-sand-300 px-4 py-3">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button type="button" className="btn-ghost px-2" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <FilterPanel facets={facets.data} filters={filters} onChange={update} />
            </div>
            <div className="flex gap-2 border-t border-sand-300 p-4">
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
