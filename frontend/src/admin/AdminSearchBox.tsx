import { useState } from 'react'

/** Submit-to-search box for admin lists; remount it with `key={q}` to reset it when the URL changes. */
export function AdminSearchBox({ initial, label, placeholder, onSearch }: { initial: string; label: string; placeholder: string; onSearch: (q: string) => void }) {
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
        <span className="sr-only">{label}</span>
        <input type="search" className="input" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <button type="submit" className="btn-secondary">
        Search
      </button>
    </form>
  )
}

/** A filter pill row shared by the admin lists. */
export function FilterPills<T extends string>({ label, options, value, onChange }: { label: string; options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${value === o.value ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-300'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
