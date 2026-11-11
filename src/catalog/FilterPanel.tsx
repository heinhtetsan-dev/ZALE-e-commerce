import { useState, type ReactNode } from 'react'
import type { Facets } from '../lib/types'
import { toggle, type CatalogFilters } from './filters'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-sand-300 py-5 first:pt-0">
      <legend className="eyebrow mb-3 text-ink">{title}</legend>
      {children}
    </fieldset>
  )
}

function CheckList({ options, selected, onToggle }: { options: Array<{ value: string; label: string; count: number }>; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <ul className="space-y-1">
      {options.map((o) => (
        <li key={o.value}>
          <label className="flex cursor-pointer items-center gap-3 rounded-md py-1.5 text-sm">
            <input type="checkbox" className="size-4 accent-ink" checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} />
            <span className="flex-1">{o.label}</span>
            <span className="text-xs text-taupe">{o.count}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}

const toCents = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? undefined : Math.max(0, Math.round(Number(v) * 100)))
const toDollars = (c?: number) => (c !== undefined ? String(c / 100) : '')

/** Keyed by the applied range so the inputs reset when filters change elsewhere. */
function PriceForm({ facets, filters, onChange }: { facets: Facets; filters: CatalogFilters; onChange: (next: Partial<CatalogFilters>) => void }) {
  const [minPrice, setMinPrice] = useState(toDollars(filters.minPrice))
  const [maxPrice, setMaxPrice] = useState(toDollars(filters.maxPrice))

  const applyPrice = (e: React.FormEvent) => {
    e.preventDefault()
    let min = toCents(minPrice)
    let max = toCents(maxPrice)
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min]
    onChange({ minPrice: min, maxPrice: max })
  }

  return (
    <form onSubmit={applyPrice} className="flex items-end gap-2">
      <label className="flex-1">
        <span className="sr-only">Minimum price</span>
        <input className="input" inputMode="decimal" placeholder={`Min ${Math.floor(facets.price.min / 100)}`} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
      </label>
      <span className="pb-2.5 text-taupe">–</span>
      <label className="flex-1">
        <span className="sr-only">Maximum price</span>
        <input className="input" inputMode="decimal" placeholder={`Max ${Math.ceil(facets.price.max / 100)}`} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
      </label>
      <button type="submit" className="btn-secondary px-3">
        Go
      </button>
    </form>
  )
}

export function FilterPanel({ facets, filters, onChange }: { facets: Facets; filters: CatalogFilters; onChange: (next: Partial<CatalogFilters>) => void }) {
  return (
    <div>
      <Section title="Category">
        <CheckList
          options={facets.categories.map((c) => ({ value: c.slug, label: c.name, count: c.count }))}
          selected={filters.category}
          onToggle={(v) => onChange({ category: toggle(filters.category, v) })}
        />
      </Section>
      <Section title="Size (in stock)">
        <div className="flex flex-wrap gap-2">
          {facets.sizes.map((s) => {
            const on = filters.size.includes(s)
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ size: toggle(filters.size, s) })}
                className={`min-w-12 border px-3 py-2 text-sm ${on ? 'border-ink bg-ink text-cream' : 'border-sand-400 hover:border-ink'}`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </Section>
      <Section title="Color">
        <div className="flex flex-wrap gap-2">
          {facets.colors.map((c) => {
            const on = filters.color.includes(c.name)
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ color: toggle(filters.color, c.name) })}
                className={`border px-3 py-1.5 text-sm ${on ? 'border-ink bg-ink text-cream' : 'border-sand-400 hover:border-ink'}`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </Section>
      <Section title="Price (USD)">
        <PriceForm key={`${filters.minPrice}-${filters.maxPrice}`} facets={facets} filters={filters} onChange={onChange} />
      </Section>
    </div>
  )
}
