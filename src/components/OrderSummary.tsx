import type { ReactNode } from 'react'
import { money } from '../lib/format'
import { FREE_SHIPPING_THRESHOLD_CENTS } from '../lib/shipping'

export function OrderSummary({ subtotalCents, shippingCents, children, estimated }: { subtotalCents: number; shippingCents: number; children?: ReactNode; estimated?: boolean }) {
  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold">Order summary</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-stone-600">Subtotal</dt>
          <dd>{money(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-600">Shipping{estimated ? ' (estimated)' : ''}</dt>
          <dd>{shippingCents === 0 ? 'Free' : money(shippingCents)}</dd>
        </div>
        {estimated && subtotalCents > 0 && subtotalCents < FREE_SHIPPING_THRESHOLD_CENTS && (
          <p className="text-xs text-stone-500">Add {money(FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents)} more for free shipping.</p>
        )}
        <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd>{money(subtotalCents + shippingCents)}</dd>
        </div>
      </dl>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}
