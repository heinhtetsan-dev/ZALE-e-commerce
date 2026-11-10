import type { InputHTMLAttributes } from 'react'
import { FieldError } from './ui'

export function FormField({ id, label, error, ...props }: { id: string; label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} name={id} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      <div id={`${id}-error`}>
        <FieldError message={error} />
      </div>
    </div>
  )
}
