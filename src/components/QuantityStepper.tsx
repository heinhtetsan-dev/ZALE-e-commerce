export function QuantityStepper({ value, max, onChange, disabled }: { value: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-stone-300 bg-white">
      <button type="button" className="px-3 py-2 text-lg leading-none disabled:opacity-40" aria-label="Decrease quantity" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite" aria-label={`Quantity ${value}`}>
        {value}
      </span>
      <button type="button" className="px-3 py-2 text-lg leading-none disabled:opacity-40" aria-label="Increase quantity" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}
