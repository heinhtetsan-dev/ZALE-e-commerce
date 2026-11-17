// Mirrors the API defaults (SHIPPING_FLAT_CENTS / FREE_SHIPPING_THRESHOLD_CENTS).
// Only used for the cart estimate; the order total always comes from the API.
export const FREE_SHIPPING_THRESHOLD_CENTS = 10000
export const SHIPPING_FLAT_CENTS = 800
export const estimateShipping = (subtotal: number) => (subtotal >= FREE_SHIPPING_THRESHOLD_CENTS || subtotal === 0 ? 0 : SHIPPING_FLAT_CENTS)
