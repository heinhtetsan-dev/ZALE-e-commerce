const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const money = (cents: number) => currency.format(cents / 100)

export const formatSize = (size: number) => `EU ${size}`

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export const genderLabel = (g: 'MEN' | 'WOMEN' | 'UNISEX') => ({ MEN: "Men's", WOMEN: "Women's", UNISEX: 'Unisex' })[g]

export const stockLabel =(stock: number) => (stock <= 0 ? 'Out of stock' : stock < 5 ? `Only ${stock} left` : 'In stock')
