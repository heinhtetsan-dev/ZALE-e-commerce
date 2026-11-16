import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { OrderSummary } from '../components/OrderSummary'
import { StripePayment } from '../checkout/StripePayment'
import { ErrorBox, Notice, PageTitle, Spinner } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { money } from '../lib/format'
import type { Order, PaymentSession } from '../lib/types'

export function PaymentPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const passed = (useLocation().state as { payment?: PaymentSession | null } | null)?.payment

  const order = useQuery({ queryKey: ['order', id], queryFn: () => api<Order>(`/orders/${id}`) })
  const needsPayment = order.data?.status === 'PENDING' && order.data.paymentStatus === 'UNPAID'
  const session = useQuery({
    queryKey: ['payment-session', id],
    queryFn: () => api<PaymentSession>(`/orders/${id}/payment`, { method: 'POST' }),
    enabled: needsPayment && !passed,
    initialData: passed ?? undefined,
    staleTime: Infinity,
    retry: 1,
  })

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ['order', id] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    navigate(`/orders/${id}/confirmation`, { replace: true })
  }

  const mockPay = useMutation({ mutationFn: () => api<Order>(`/orders/${id}/pay/mock`, { method: 'POST' }), onSuccess: done })

  if (order.isPending) return <Spinner />
  if (order.isError) return <ErrorBox message={errorMessage(order.error)} onRetry={() => order.refetch()} />
  const o = order.data

  if (!needsPayment) {
    return (
      <Notice tone={o.paymentStatus === 'PAID' ? 'success' : 'warning'}>
        {o.paymentStatus === 'PAID' ? 'This order is already paid. ' : 'This order can no longer be paid. '}
        <Link to={`/account/orders/${o.id}`} className="font-semibold underline">
          View order
        </Link>
      </Notice>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle subtitle={`Order #${o.number} · your items are reserved for 30 minutes`}>Payment</PageTitle>
      <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
        <section className="card p-5">
          {session.isPending ? (
            <Spinner label="Preparing secure payment…" />
          ) : session.isError || !session.data ? (
            <ErrorBox title="Payment is temporarily unavailable" message={session.error ? errorMessage(session.error) : undefined} onRetry={() => session.refetch()} />
          ) : session.data.mode === 'stripe' && session.data.clientSecret ? (
            <StripePayment clientSecret={session.data.clientSecret} orderId={o.id} amountLabel={money(o.totalCents)} onPaid={done} />
          ) : (
            <div>
              <h2 className="text-lg font-semibold">Test payment</h2>
              <p className="mt-2 text-sm text-stone-600">Payments are running in mock mode. No card is charged.</p>
              {mockPay.error && (
                <div className="mt-4">
                  <ErrorBox message={errorMessage(mockPay.error)} />
                </div>
              )}
              <button type="button" className="btn-primary mt-5 w-full py-3" onClick={() => mockPay.mutate()} disabled={mockPay.isPending}>
                {mockPay.isPending ? 'Processing…' : `Pay ${money(o.totalCents)}`}
              </button>
            </div>
          )}
        </section>
        <OrderSummary subtotalCents={o.subtotalCents} shippingCents={o.shippingCents} />
      </div>
    </div>
  )
}
