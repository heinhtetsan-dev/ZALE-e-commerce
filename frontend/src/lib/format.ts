const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const wholeCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/** $98 for whole amounts, $79.50 otherwise. */
export const money = (cents: number) => (cents % 100 === 0 ? wholeCurrency.format(cents / 100) : currency.format(cents / 100))

export const formatSize = (size: string) => (size === 'One Size' ? size : `Size ${size}`)

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export const genderLabel = (g: 'MEN' | 'WOMEN' | 'UNISEX') => ({ MEN: "Men's", WOMEN: "Women's", UNISEX: 'Unisex' })[g]

export const stockLabel =(stock: number) => (stock <= 0 ? 'Out of stock' : stock < 5 ? `Only ${stock} left` : 'In stock')
