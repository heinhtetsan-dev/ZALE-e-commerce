import { useState, type ReactNode } from 'react'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-stone-500">
      <span className="size-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorBox({ title = 'Something went wrong', message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">{title}</p>
      {message && <p className="mt-1">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 font-semibold underline">
          Try again
        </button>
      )}
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'success' | 'warning'; children: ReactNode }) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  }[tone]
  return (
    <div role="status" className={`rounded-xl border p-4 text-sm ${styles}`}>
      {children}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm text-stone-600">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{children}</h1>
      {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
    </div>
  )
}

const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#f5f5f4"/><g fill="none" stroke="#d6d3d1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M54 40a6 6 0 1 1 8 5.7c-1.4.5-2 1.4-2 2.8V52"/><path d="M60 52 24 74c-3 2-2 6 2 6h68c4 0 5-4 2-6z"/></g></svg>`,
  )

export function ProductImage({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      src={!src || failed ? IMAGE_PLACEHOLDER : src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`bg-stone-100 object-cover ${className}`}
    />
  )
}

export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const px = size === 'lg' ? 'size-5' : 'size-4'
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)))
        return (
          <span key={i} className={`relative ${px}`} aria-hidden>
            <StarIcon className={`absolute inset-0 ${px} text-stone-300`} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarIcon className={`${px} text-amber-400`} />
            </span>
          </span>
        )
      })}
    </span>
  )
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <StarIcon className={`size-7 ${(hover || value) >= i ? 'text-amber-400' : 'text-stone-300'}`} />
        </button>
      ))}
    </div>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" />
    </svg>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-red-600">{message}</p>
}

export function HeartIcon({ filled, className = 'size-5' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path strokeLinejoin="round" d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.8 3.6 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.5 3.3 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z" />
    </svg>
  )
}
