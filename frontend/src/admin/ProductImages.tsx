import { useRef, useState } from 'react'
import { FieldError } from '../components/ui'
import { api, errorMessage } from '../lib/api'

export const MAX_IMAGES = 8
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

interface Props {
  /** Stored image references (URLs, site paths or CDN keys), first one is the main photo. */
  value: string[]
  onChange: (next: string[]) => void
  /** Displayable URLs for references the browser can't resolve itself (CDN keys). */
  previews?: Record<string, string>
  error?: string
}

const previewOf = (ref: string, previews: Record<string, string>) => previews[ref] ?? (/^(https:\/\/|\/(?!\/))/.test(ref) ? ref : null)

export function ProductImages({ value, onChange, previews = {}, error }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const full = value.length >= MAX_IMAGES

  const upload = async (files: File[]) => {
    const issues: string[] = []
    const room = MAX_IMAGES - value.length
    if (files.length > room) issues.push(`Only ${MAX_IMAGES} photos per product, so ${files.length - room} were skipped.`)
    const ok = files.slice(0, Math.max(0, room)).filter((f) => {
      if (!ACCEPTED.includes(f.type)) issues.push(`${f.name}: use a JPEG, PNG, WebP or AVIF image.`)
      else if (f.size > MAX_BYTES) issues.push(`${f.name}: larger than 5 MB.`)
      else return true
      return false
    })
    setProblems(issues)
    if (!ok.length) return

    let current = value
    setProgress({ done: 0, total: ok.length })
    for (const [i, file] of ok.entries()) {
      try {
        const { key } = await api<{ key: string; url: string }>('/admin/uploads', { method: 'POST', file })
        current = [...current, key]
        onChange(current)
      } catch (err) {
        issues.push(`${file.name}: ${errorMessage(err)}`)
        setProblems([...issues])
      }
      setProgress({ done: i + 1, total: ok.length })
    }
    setProgress(null)
  }

  const move = (from: number, to: number) => {
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div>
      <p className="label">Photos</p>
      <p className="mb-2 text-xs text-stone-500">The first photo is the main one shown in the shop. Up to {MAX_IMAGES} photos, 5 MB each.</p>

      {value.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4" aria-label="Product photos">
          {value.map((ref, i) => {
            const src = previewOf(ref, previews)
            return (
              <li key={ref} className="group relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                <div className="aspect-[3/4]">
                  {src ? (
                    <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                  ) : (
                    <p className="break-all p-2 font-mono text-[10px] text-stone-500">{ref}</p>
                  )}
                </div>
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-stone-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">Main</span>}
                <div className="flex justify-between gap-1 border-t border-stone-200 bg-white p-1">
                  {i > 0 ? (
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => move(i, 0)} disabled={!!progress} aria-label={`Make photo ${i + 1} the main photo`}>
                      Make main
                    </button>
                  ) : (
                    <span />
                  )}
                  <button type="button" className="btn-ghost px-2 py-1 text-xs text-red-700" onClick={() => onChange(value.filter((_, j) => j !== i))} disabled={!!progress} aria-label={`Remove photo ${i + 1}`}>
                    Remove
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!full && (
        <div
          className={`rounded-lg border-2 border-dashed p-5 text-center text-sm transition-colors ${dragging ? 'border-stone-900 bg-stone-100' : 'border-stone-300'}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (!progress) upload([...e.dataTransfer.files])
          }}
        >
          {progress ? (
            <p role="status">
              Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}…
            </p>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={() => input.current?.click()}>
                Upload photos
              </button>
              <p className="mt-2 text-xs text-stone-500">or drag photos here</p>
            </>
          )}
          <input
            ref={input}
            type="file"
            accept={ACCEPTED.join(',')}
            multiple
            hidden
            data-testid="photo-input"
            onChange={(e) => {
              upload([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
        </div>
      )}

      {problems.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-red-700" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <FieldError message={error} />
    </div>
  )
}
