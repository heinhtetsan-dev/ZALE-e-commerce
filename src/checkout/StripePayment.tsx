import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { Stripe } from '@stripe/stripe-js'
// The "pure" entry loads Stripe.js only when loadStripe() is called, not on every page.
import { loadStripe } from '@stripe/stripe-js/pure'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorBox, Spinner } from '../components/ui'
import { api } from '../lib/api'

let stripePromise: Promise<Stripe | null> | null = null
const getStripe = (publishableKey: string) => (stripePromise ??= loadStripe(publishableKey))

function PaymentForm({ orderId, amountLabel, onPaid }: { orderId: string; amountLabel: string; onPaid: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(null)
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/orders/${orderId}/confirmation` },
      // Cards complete in-page; redirect-based methods come back to the confirmation page.
      redirect: 'if_required',
    })
    if (result.error) {
      setError(result.error.message ?? 'Your payment could not be processed.')
      setSubmitting(false)
      return
    }
    onPaid()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <ErrorBox title="Payment failed" message={error} />}
      <button type="submit" className="btn-primary w-full py-3" disabled={!stripe || submitting}>
        {submitting ? 'Processing…' : `Pay ${amountLabel}`}
      </button>
      <p className="text-center text-xs text-stone-500">Test mode: use card 4242 4242 4242 4242, any future date and any CVC.</p>
    </form>
  )
}

export function StripePayment({ clientSecret, orderId, amountLabel, onPaid }: { clientSecret: string; orderId: string; amountLabel: string; onPaid: () => void }) {
  const config = useQuery({
    queryKey: ['payments', 'config'],
    queryFn: () => api<{ mode: string; publishableKey: string | null }>('/payments/config'),
    staleTime: Infinity,
  })
  if (config.isPending) return <Spinner label="Loading payment form…" />
  if (!config.data?.publishableKey) return <ErrorBox title="Payments are unavailable" message="Card payments are not configured." />

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Card payment</h2>
      <Elements stripe={getStripe(config.data.publishableKey)} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#1c1917', borderRadius: '8px' } } }}>
        <PaymentForm orderId={orderId} amountLabel={amountLabel} onPaid={onPaid} />
      </Elements>
    </div>
  )
}
