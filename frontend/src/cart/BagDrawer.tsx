// ============================================================
// BagDrawer.tsx — ညာဘက်ကနေ လျှောထွက်လာတဲ့ ခြင်းအံဆွဲ (slide-over)။
// "Add to bag" နှိပ်ပြီးတာနဲ့၊ header က ခြင်း icon နှိပ်တာနဲ့ ပွင့်တယ်။
//
// ချိတ်ဆက်ထားတာတွေ:
//   - useBag()  → ပွင့်/ပိတ် state (BagProvider က Context ကနေလာတယ်)
//   - useCart() → cart data + update/remove mutations
//   - useAuth() → login ဝင်ထား/မထား (Checkout ခလုတ်အတွက်)
// Layout.tsx မှာ <BagDrawer /> တစ်ခါတည်း ထည့်ထားလို့
// page တိုင်းကနေ ဖွင့်လို့ရတယ်။
// ============================================================

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

/** ပိတ်တဲ့ animation (duration-300) နဲ့ ကိုက်အောင် — animation ပြီးမှ DOM ကဖြုတ်တယ် */
const CLOSE_MS = 300

/**
 * Slide-over bag: opens after "Add to bag" and from the header bag button.
 * Slides in with an ease-out curve and leaves with an ease-in curve.
 */
export function BagDrawer() {
  const bag = useBag() // ပွင့်/ပိတ် + justAdded (ခုလေးတင်ထည့်လိုက်တဲ့ ပစ္စည်း id)
  const { user } = useAuth()
  const { cart, update, remove } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const closeRef = useRef<HTMLButtonElement>(null)
  // Quantity ပြောင်းလို့ error တက်ရင် ဘယ် line မှာလဲ မှတ်ထားပြတယ်
  const [lineError, setLineError] = useState<{ key: string; text: string } | null>(null)

  // ★ Page ပြောင်းရင် drawer အလိုအလျောက်ပိတ် (ခြင်းထဲက ပစ္စည်းကိုနှိပ်ပြီး
  //   product page သွားတဲ့အခါမျိုး)။ Navbar ထဲက menu ပိတ်နည်းနဲ့ အတူတူ —
  //   useEffect မသုံးဘဲ render အတွင်း state ချိန်ညှိတဲ့ pattern
  const here = location.pathname + location.search
  const [openedAt, setOpenedAt] = useState(here)
  if (openedAt !== here) {
    setOpenedAt(here)
    if (bag.isOpen) bag.close()
  }

  // ★ Drawer ပွင့်နေချိန် — modal တစ်ခုရဲ့ စံအလုပ် ၃ ခု:
  //   ၁) Close ခလုတ်ကို focus ပေး (keyboard သုံးသူ drawer ထဲရောက်အောင်)
  //   ၂) Esc နှိပ်ရင် ပိတ်
  //   ၃) နောက်ခံ page ကို scroll မရအောင် ပိတ်ထား (overflow: hidden)
  //   cleanup function ထဲမှာ အကုန်ပြန်ဖြုတ်တယ်
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

  // ★ Animation အတွက် state နှစ်ခု:
  //   mounted = DOM ထဲ ရှိ/မရှိ။ ပိတ်တဲ့အခါ ချက်ချင်းမဖြုတ်ဘဲ
  //             animation ပြီးအောင်စောင့်ပြီးမှ ဖြုတ်တယ်။
  //   entered = အဝင် animation စတင်ပြီးလား။ Mount ဖြစ်ပြီး
  //             frame တစ်ခုကြာမှ true ပြောင်းတယ် — ဒါမှ browser က
  //             "အပြင်မှာရှိတဲ့နေရာ → အထဲ" ကို animate လုပ်ပြနိုင်တာ
  //             (တစ်ပြိုင်တည်းဆို animation မမြင်ရဘူး)
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)
  if (bag.isOpen && !mounted) setMounted(true)
  useEffect(() => {
    if (bag.isOpen) {
      // requestAnimationFrame နှစ်ထပ် = browser က အပြင်နေရာကို အရင်ဆွဲပြီးမှ ပြောင်း
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(frame)
    }
    // ပိတ်တဲ့အခါ — "animation လျှော့ချပါ" လို့ စက်မှာသတ်မှတ်ထားသူဆို
    // ချက်ချင်းဖြုတ်၊ မဟုတ်ရင် 300ms စောင့်ပြီးမှဖြုတ်
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => {
        setMounted(false)
        setEntered(false)
      },
      reduced ? 0 : CLOSE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [bag.isOpen])
  const shown = bag.isOpen && entered

  if (!mounted) return null // ပိတ်ထားချိန် DOM ထဲ လုံးဝမရှိ

  // Quantity ပြောင်းတာ fail ရင် (stock မလုံလောက်တာမျိုး) error ကို
  // သက်ဆိုင်တဲ့ line အောက်မှာပဲ ပြတယ်
  const changeQty = async (line: CartLine, quantity: number) => {
    setLineError(null)
    try {
      await update.mutateAsync({ line, quantity })
    } catch (err) {
      setLineError({ key: line.key, text: errorMessage(err) })
    }
  }

  // Free shipping ရဖို့ ဘယ်လောက်လိုသေးလဲ
  const toFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - cart.subtotalCents)
  // ပစ္စည်းတစ်ခုခုမှာ ပြဿနာ (ပြတ်သွား/မရတော့) ရှိရင် Checkout ခလုတ်ပိတ်ထား
  const hasIssues = cart.lines.some((l) => l.issue)

  return (
    // အပြင်ဆုံးအလွှာ — screen တစ်ခုလုံးဖုံး။ role="dialog" + aria-modal
    // က screen reader ကို "ဒါ popup ပါ၊ နောက်က content မေ့ထားပါ" လို့ပြောတာ။
    // inert = ပိတ်ထားချိန် အထဲက ခလုတ်တွေကို Tab နဲ့ရောက်လို့မရအောင်
    <div
      className={`fixed inset-0 z-50 ${bag.isOpen ? '' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag"
      aria-hidden={!bag.isOpen || undefined}
      inert={!bag.isOpen}
    >
    
      <div
        className={`absolute inset-0 bg-ink/40 transition-opacity motion-reduce:transition-none ${
          shown ? 'opacity-100 duration-500 ease-out' : 'opacity-0 duration-300 ease-in'
        }`}
        onClick={bag.close}
      />
       {/* easeOutQuint */}
      <aside
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-2xl transition-transform will-change-transform motion-reduce:transition-none ${
          shown ? 'translate-x-0 duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]' : 'translate-x-full duration-300 ease-[cubic-bezier(0.64,0,0.78,0)]'
        }`}
      >
      
        <div className="flex items-center justify-between border-b border-sand-300 px-6 py-5">
          <h2 className="eyebrow text-ink">Your bag ({cart.itemCount})</h2>
          <button ref={closeRef} type="button" onClick={bag.close} className="-mr-2 p-2" aria-label="Close bag">
            <CloseIcon />
          </button>
        </div>

        {cart.lines.length === 0 ? (
          // cart အလွတ် 
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <p className="display text-3xl">Your bag is empty</p>
            <button type="button" className="btn-primary" onClick={bag.close}>
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            {/* Free shipping bar*/}
            {cart.subtotalCents > 0 && (
              <div className="border-b border-sand-300 px-6 py-4 text-sm">
                {toFreeShipping > 0 ? <p>You're {money(toFreeShipping)} away from free delivery.</p> : <p>You've unlocked free delivery.</p>}
                <div className="mt-2 h-1 bg-sand-300" aria-hidden>
                  <div className="h-full bg-ink transition-all" style={{ width: `${Math.min(100, (cart.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100)}%` }} />
                </div>
              </div>
            )}
            {/* ပစ္စည်းစာရင်း */}
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
                    

                    {/* stock ကုန်ခါနီးရင်ပြမဲ့ alert  */}
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
            {/*Subtotal + Checkout ── */}
            <div className="border-t border-sand-300 px-6 py-5">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{money(cart.subtotalCents)}</span>
              </div>
              <p className="mt-1 text-xs text-taupe">Delivery and taxes are calculated at checkout.</p>
              

              {/* Log in button  */}
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
