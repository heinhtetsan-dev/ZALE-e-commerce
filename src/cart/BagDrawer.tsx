import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context'
import { CloseIcon } from '../components/icons'
import { QuantityStepper } from '../components/QuantityStepper'
import { ProductImage } from '../components/ui'
import { errorMessage } from '../lib/api'
import { formatSize, money } from '../lib/format'
import { FREE_SHIPPING_THRESHOLD_CENTS } from '../lib/shipping'
import { useBag } from './bag'
import { MAX_LINE_QUANTITY, useCart, type CartLine } from './useCart'

/** Slide-over bag: opens after "Add to bag" and from the header bag button. */
export function BagDrawer() {
  const bag = useBag()
  const { user } = useAuth()
  const { cart, update, remove } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [lineError, setLineError] = useState<{ key: string; text: string } | null>(null)

  // Close when the page changes (e.g. after clicking a product in the bag).
  const here = location.pathname + location.search
  const [openedAt, setOpenedAt] = useState(here)
  if (openedAt !== here) {
    setOpenedAt(here)
    if (bag.isOpen) bag.close()
  }

  useEffect(() => {
    if (!bag.isOpen) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && bag.close()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [bag, bag.isOpen])

  if (!bag.isOpen) return null

  const changeQty = async (line: CartLine, quantity: number) => {
    setLineError(null)
    try {
      await update.mutateAsync({ line, quantity })
    } catch (err) {
      setLineError({ key: line.key, text: errorMessage(err) })
    }
  }

  const toFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - cart.subtotalCents)
  const hasIssues = cart.lines.some((l) => l.issue)

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div className="absolute inset-0 bg-ink/40" onClick={bag.close} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-sand-300 px-6 py-5">
          <h2 className="eyebrow text-ink">Your bag ({cart.itemCount})</h2>
          <button ref={closeRef} type="button" onClick={bag.close} className="-mr-2 p-2" aria-label="Close bag">
            <CloseIcon />
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <p className="display text-3xl">Your bag is empty</p>
            <button type="button" className="btn-primary" onClick={bag.close}>
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            {cart.subtotalCents > 0 && (
              <div className="border-b border-sand-300 px-6 py-4 text-sm">
                {toFreeShipping > 0 ? <p>You're {money(toFreeShipping)} away from free delivery.</p> : <p>You've unlocked free delivery.</p>}
                <div className="mt-2 h-1 bg-sand-300" aria-hidden>
                  <div className="h-full bg-ink transition-all" style={{ width: `${Math.min(100, (cart.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100)}%` }} />
                </div>
              </div>
            )}
            <ul className="flex-1 divide-y divide-sand-300 overflow-y-auto px-6">
              {cart.lines.map((line) => (
                <li key={line.key} className={`flex gap-4 py-5 ${bag.justAdded === line.variantId ? 'bg-paper -mx-6 px-6' : ''}`}>
                  <Link to={`/products/${line.product.slug}`} className="shrink-0">
                    <ProductImage src={line.product.image} alt={line.product.name} className="aspect-3/4 w-20" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    {bag.justAdded === line.variantId && <p className="eyebrow mb-1 text-ink">Added to your bag</p>}
                    <div className="flex justify-between gap-3">
                      <Link to={`/products/${line.product.slug}`} className="text-sm hover:underline">
                        {line.product.name}
                      </Link>
                      <p className="text-sm font-medium">{money(line.lineTotalCents)}</p>
                    </div>
                    <p className="mt-1 text-xs text-taupe">
                      {line.product.color} · {formatSize(line.size)}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantityStepper
                        value={line.quantity}
                        max={Math.max(line.quantity, Math.min(MAX_LINE_QUANTITY, line.stock))}
                        onChange={(q) => changeQty(line, q)}
                        disabled={update.isPending || line.issue === 'unavailable'}
                      />
                      <button type="button" className="text-xs text-taupe underline underline-offset-4 hover:text-ink" onClick={() => remove.mutate(line)}>
                        Remove
                      </button>
                    </div>
                    {line.issue && (
                      <p className="mt-2 text-xs text-red-700" role="alert">
                        {line.issue === 'out_of_stock' ? 'This size just sold out.' : line.issue === 'unavailable' ? 'No longer available.' : `Only ${line.stock} left.`}
                      </p>
                    )}
                    {lineError?.key === line.key && (
                      <p className="mt-2 text-xs text-red-700" role="alert">
                        {lineError.text}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-sand-300 px-6 py-5">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{money(cart.subtotalCents)}</span>
              </div>
              <p className="mt-1 text-xs text-taupe">Delivery and taxes are calculated at checkout.</p>
              <button
                type="button"
                className="btn-primary mt-4 w-full py-4"
                disabled={hasIssues}
                onClick={() => {
                  bag.close()
                  navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })
                }}
              >
                {user ? 'Checkout' : 'Log in to checkout'}
              </button>
              <Link to="/cart" className="mt-3 block text-center text-xs uppercase tracking-[0.18em] underline underline-offset-4">
                View bag
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
