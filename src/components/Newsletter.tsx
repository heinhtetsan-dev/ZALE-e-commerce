import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { api, errorMessage } from '../lib/api'

const emailSchema = z.string().trim().pipe(z.email('Enter a valid email address'))

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const subscribe = useMutation({ mutationFn: (value: string) => api('/newsletter', { method: 'POST', body: { email: value } }) })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) return setError(parsed.error.issues[0]!.message)
    setError(null)
    subscribe.mutate(parsed.data)
  }

  return (
    <section className="bg-ink text-cream" aria-labelledby="newsletter-title">
      <div className="mx-auto grid max-w-360 gap-8 px-4 py-14 sm:px-8 md:grid-cols-2 md:items-center">
        <div>
          <h2 id="newsletter-title" className="display text-4xl">
            Join the LUNE list
          </h2>
          <p className="mt-2 text-sm text-cream/75">New collections and private sales, first.</p>
        </div>
        {subscribe.isSuccess ? (
          <p className="text-sm" role="status">
            Thank you, you're on the list.
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-invalid={!!error}
                className="h-12 w-full border border-cream/30 bg-transparent px-4 text-sm text-cream placeholder:text-cream/50 focus:border-cream focus:outline-none"
              />
            </label>
            <button type="submit" className="btn h-12 bg-cream px-8 text-ink hover:bg-white" disabled={subscribe.isPending}>
              {subscribe.isPending ? 'Subscribing…' : 'Subscribe'}
            </button>
            {(error || subscribe.isError) && (
              <p className="text-sm text-red-300 sm:basis-full" role="alert">
                {error ?? errorMessage(subscribe.error)}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  )
}
