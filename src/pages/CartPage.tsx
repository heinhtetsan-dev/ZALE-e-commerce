import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/context'
import { MAX_LINE_QUANTITY, useCart, type CartLine } from '../cart/useCart'
import { OrderSummary } from '../components/OrderSummary'
import { estimateShipping } from '../lib/shipping'
import { QuantityStepper } from '../components/QuantityStepper'
import { EmptyState, ErrorBox, PageTitle, ProductImage, Spinner } from '../components/ui'
import { errorMessage } from '../lib/api'
import { formatSize, money } from '../lib/format'

const issueText = (line: CartLine) => {
  switch (line.issue) {
    case 'unavailable':
      return 'This product is no longer available. Please remove it.'
    case 'out_of_stock':
      return 'This size just sold out. Remove it or choose another size.'
    case 'insufficient_stock':
      return `Only ${line.stock} left in this size. Reduce the quantity to continue.`
    default:
      return null
  }
}

export function CartPage() {
  const { user } = useAuth()
  const { cart, isLoading, error, refetch, update, remove } = useCart()
  const navigate = useNavigate()
  const [lineError, setLineError] = useState<{ key: string; text: string } | null>(null)

  if (isLoading) return <Spinner label="Loading your cart…" />
  if (error) return <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        action={
          <Link to="/" className="btn-primary">
            Start shopping
          </Link>
        }
      >
        Pick a pair you love and choose your size to add it here.
      </EmptyState>
    )
  }

  const hasIssues = cart.lines.some((l) => l.issue)

  const changeQty = async (line: CartLine, quantity: number) => {
    setLineError(null)
    try {
      await update.mutateAsync({ line, quantity })
    } catch (err) {
      setLineError({ key: line.key, text: errorMessage(err) })
    }
  }

  return (
    <div>
      <PageTitle subtitle={`${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`}>Your cart</PageTitle>
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-3">
          {cart.lines.map((line) => {
            const issue = issueText(line)
            return (
              <li key={line.key} className="card flex gap-4 p-3 sm:p-4">
                <Link to={`/products/${line.product.slug}`} className="shrink-0">
                  <ProductImage src={line.product.image} alt={line.product.name} className="size-24 rounded-lg sm:size-28" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-stone-500">{line.product.brand}</p>
                      <Link to={`/products/${line.product.slug}`} className="block truncate font-semibold hover:underline">
                        {line.product.name}
                      </Link>
                      <p className="text-sm text-stone-600">
                        {formatSize(line.size)} · {line.product.color}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{money(line.lineTotalCents)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <QuantityStepper
                      value={line.quantity}
                      max={Math.max(line.quantity, Math.min(MAX_LINE_QUANTITY, line.stock))}
                      onChange={(q) => changeQty(line, q)}
                      disabled={update.isPending || line.issue === 'unavailable'}
                    />
                    <button type="button" className="text-sm font-medium text-stone-600 underline hover:text-red-600" onClick={() => remove.mutate(line)} disabled={remove.isPending}>
                      Remove
                    </button>
                  </div>
                  {issue && (
                    <p className="mt-2 text-sm font-medium text-amber-700" role="alert">
                      {issue}
                    </p>
                  )}
                  {lineError?.key === line.key && (
                    <p className="mt-2 text-sm font-medium text-red-600" role="alert">
                      {lineError.text}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary subtotalCents={cart.subtotalCents} shippingCents={estimateShipping(cart.subtotalCents)} estimated>
            <button type="button" className="btn-accent w-full py-3" disabled={hasIssues} onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}>
              {user ? 'Checkout' : 'Log in to checkout'}
            </button>
            {hasIssues && <p className="mt-2 text-center text-xs text-amber-700">Fix the highlighted items to continue.</p>}
            <p className="mt-3 text-center text-xs text-stone-500">Items in your cart are not reserved until you place your order.</p>
          </OrderSummary>
        </div>
      </div>
    </div>
  )
}
