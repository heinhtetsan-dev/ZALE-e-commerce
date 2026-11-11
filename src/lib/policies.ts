import { money } from './format'
import { FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FLAT_CENTS } from './shipping'

/** Shop policies shown on product pages and the help pages. Mirrors the API's shipping settings. */
export const deliveryPolicy = [
  `Free standard delivery on orders over ${money(FREE_SHIPPING_THRESHOLD_CENTS)}; otherwise ${money(SHIPPING_FLAT_CENTS)}.`,
  'Orders are dispatched once payment is confirmed, and you can follow each order from your account.',
]

export const returnsPolicy = [
  'Return unworn items with their tags within 30 days of delivery.',
  'Unpaid orders can be cancelled from your order page; the items go straight back into stock.',
]

export const careAdvice = [
  'Always follow the care label sewn into the garment; it gives the exact fibre content and washing instructions.',
  'Wool and cashmere: hand wash cold or dry clean, dry flat. Denim: wash inside out and cold to keep the colour. Leather and waxed cotton: wipe clean, never machine wash.',
]
