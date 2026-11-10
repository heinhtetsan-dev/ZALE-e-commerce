import { useState, type ReactNode } from 'react'
import type { Facets } from '../lib/types'
import { toggle, type CatalogFilters } from './filters'

const COLOR_SWATCH: Record<string, string> = {
  black: '#1c1917',
  white: '#ffffff',
  grey: '#a8a29e',
  gray: '#a8a29e',
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  brown: '#92400e',
  pink: '#ec4899',
  beige: '#e7d8c0',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#9333ea',
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-stone-200 py-5 first:pt-0">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
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
            <input type="checkbox" className="size-4 accent-stone-900" checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} />
            <span className="flex-1">{o.label}</span>
            <span className="text-xs text-stone-400">{o.count}</span>
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
      <span className="pb-2.5 text-stone-400">–</span>
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
      <Section title="Brand">
        <CheckList
          options={facets.brands.map((b) => ({ value: b.slug, label: b.name, count: b.count }))}
          selected={filters.brand}
          onToggle={(v) => onChange({ brand: toggle(filters.brand, v) })}
        />
      </Section>
      <Section title="Size (EU, in stock)">
        <div className="grid grid-cols-4 gap-2">
          {facets.sizes.map((s) => {
            const on = filters.size.includes(s)
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ size: toggle(filters.size, s) })}
                className={`rounded-lg border py-2 text-sm font-medium ${on ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white hover:border-stone-900'}`}
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
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-300 hover:border-stone-900'}`}
              >
                <span className="size-4 rounded-full border border-stone-300" style={{ background: COLOR_SWATCH[c.name.toLowerCase()] ?? '#d6d3d1' }} />
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
