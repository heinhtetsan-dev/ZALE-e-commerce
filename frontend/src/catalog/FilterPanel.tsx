import type { ReactNode } from 'react'
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
    </div>
  )
}
