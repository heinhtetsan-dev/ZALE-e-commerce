import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/context'
import { useCart } from '../cart/useCart'
import { addressSchema, type AddressInput } from '../checkout/addressSchema'
import { fieldErrorsOf } from '../lib/forms'
import { OrderSummary } from '../components/OrderSummary'
import { estimateShipping } from '../lib/shipping'
import { OutOfStockNotice } from '../components/OutOfStockNotice'
import { EmptyState, ErrorBox, FieldError, PageTitle, ProductImage, Spinner } from '../components/ui'
import { api, ApiError, errorMessage } from '../lib/api'
import { formatSize, money } from '../lib/format'
import type { Order, PaymentSession, StockShortage } from '../lib/types'

const ADDRESS_KEY = 'shoeshop.lastAddress'

const loadAddress = (name: string): AddressInput => {
  try {
    const saved = JSON.parse(localStorage.getItem(ADDRESS_KEY) ?? 'null')
    if (saved) return saved
  } catch {
    /* ignore */
  }
  return { fullName: name, line1: '', line2: '', city: '', postalCode: '', country: 'US', phone: '' }
}

export function CheckoutPage() {
  const { user, isLoading: userLoading } = useAuth()
  const { isLoading } = useCart()
  if (userLoading || isLoading || !user) return <Spinner />
  return <CheckoutForm userName={user.name} />
}

function CheckoutForm({ userName }: { userName: string }) {
  const { cart, add, remove } = useCart()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<AddressInput>(() => loadAddress(userName))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [shortages, setShortages] = useState<StockShortage[]>([])

  const placeOrder = useMutation({
    mutationFn: (shippingAddress: unknown) => api<{ order: Order; payment: PaymentSession | null }>('/orders', { method: 'POST', body: { shippingAddress } }),
    onSuccess: ({ order, payment }) => {
      queryClient.setQueryData(['cart'], { items: [], itemCount: 0, subtotalCents: 0 })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate(`/orders/${order.id}/pay`, { replace: true, state: { payment } })
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'OUT_OF_STOCK') {
          setShortages(err.shortages)
          queryClient.invalidateQueries({ queryKey: ['cart'] })
        } else if (err.code === 'VALIDATION_ERROR') {
          setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k.replace(/^shippingAddress\./, ''), v])))
        }
      }
    },
  })

  if (cart.lines.length === 0 && !placeOrder.isPending) {
    return (
      <EmptyState title="Your bag is empty" action={<Link to="/" className="btn-primary">Continue shopping</Link>}>
        Add something to your bag before checking out.
      </EmptyState>
    )
  }

  const set = (key: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setShortages([])
    const parsed = addressSchema.safeParse(form)
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error))
      return
    }
    setErrors({})
    try {
      localStorage.setItem(ADDRESS_KEY, JSON.stringify(form))
    } catch {
      /* ignore */
    }
    placeOrder.mutate(parsed.data)
  }

  // Swap a sold-out line for a suggested size in one tap.
  const pickAlternative = async (shortage: StockShortage, alt: StockShortage['alternatives'][number]) => {
    const line = cart.lines.find((l) => l.variantId === shortage.variantId)
    if (!line) return
    try {
      await remove.mutateAsync(line)
      await add.mutateAsync({ variantId: alt.variantId, quantity: Math.min(line.quantity, alt.stock), size: alt.size, stock: alt.stock, product: line.product })
      setShortages((s) => s.filter((x) => x.variantId !== shortage.variantId))
    } catch (err) {
      setErrors({ form: errorMessage(err) })
    }
  }

  const field = (key: keyof AddressInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`addr-${key}`}>
        {label}
      </label>
      <input id={`addr-${key}`} className="input" value={form[key] ?? ''} onChange={set(key)} aria-invalid={!!errors[key]} {...props} />
      <FieldError message={errors[key]} />
    </div>
  )

  const shipping = estimateShipping(cart.subtotalCents)
  const genericError = placeOrder.error && !(placeOrder.error instanceof ApiError && ['OUT_OF_STOCK', 'VALIDATION_ERROR'].includes(placeOrder.error.code))

  return (
    <div>
      <PageTitle>Checkout</PageTitle>
      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {shortages.length > 0 && <OutOfStockNotice shortages={shortages} onPickAlternative={pickAlternative} />}
          {genericError && <ErrorBox title="Could not place your order" message={errorMessage(placeOrder.error)} />}
          {errors.form && <ErrorBox message={errors.form} />}

          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold">Shipping address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{field('fullName', 'Full name', { autoComplete: 'name' })}</div>
              <div className="sm:col-span-2">{field('line1', 'Address', { autoComplete: 'address-line1' })}</div>
              <div className="sm:col-span-2">{field('line2', 'Apartment, suite (optional)', { autoComplete: 'address-line2' })}</div>
              {field('city', 'City', { autoComplete: 'address-level2' })}
              {field('postalCode', 'Postal code', { autoComplete: 'postal-code' })}
              {field('country', 'Country code', { autoComplete: 'country', maxLength: 2, placeholder: 'US' })}
              {field('phone', 'Phone (optional)', { autoComplete: 'tel', type: 'tel' })}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold">Items</h2>
            <ul className="divide-y divide-stone-200">
              {cart.lines.map((l) => (
                <li key={l.key} className="flex items-center gap-3 py-3">
                  <ProductImage src={l.product.image} alt="" className="size-14 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.product.name}</p>
                    <p className="text-xs text-stone-600">
                      {formatSize(l.size)} · Qty {l.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{money(l.lineTotalCents)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary subtotalCents={cart.subtotalCents} shippingCents={shipping}>
            <button type="submit" className="btn-accent w-full py-3" disabled={placeOrder.isPending}>
              {placeOrder.isPending ? 'Placing order…' : 'Place order & pay'}
            </button>
            <p className="mt-3 text-center text-xs text-stone-500">Your items are reserved when you place the order. Unpaid orders are released after 30 minutes.</p>
          </OrderSummary>
        </div>
      </form>
    </div>
  )
}
