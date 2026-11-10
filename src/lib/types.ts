export type Role = 'CUSTOMER' | 'ADMIN'
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type OrderStatus = 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
}

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Ref {
  id: string
  name: string
  slug: string
}

export interface ProductCard {
  id: string
  slug: string
  name: string
  color: string
  priceCents: number
  image: string | null
  brand: Ref
  category: Ref
  ratingAvg: number
  ratingCount: number
  availableSizes: number[]
  inStock: boolean
  isActive: boolean
  createdAt: string
}

export interface Variant {
  id: string
  size: number
  stock: number
  stockStatus: StockStatus
}

export interface ProductDetail extends ProductCard {
  description: string
  images: string[]
  variants: Variant[]
}

export interface Facets {
  brands: Array<{ name: string; slug: string; count: number }>
  categories: Array<{ name: string; slug: string; count: number }>
  colors: Array<{ name: string; count: number }>
  sizes: number[]
  price: { min: number; max: number }
}

export type CartIssue = 'unavailable' | 'out_of_stock' | 'insufficient_stock' | null

export interface ServerCartItem {
  id: string
  quantity: number
  variant: { id: string; size: number; stock: number; stockStatus: StockStatus }
  product: { id: string; slug: string; name: string; brand: string; color: string; priceCents: number; image: string | null; isActive: boolean }
  lineTotalCents: number
  issue: CartIssue
}

export interface ServerCart {
  items: ServerCartItem[]
  itemCount: number
  subtotalCents: number
}

export interface ShippingAddress {
  fullName: string
  line1: string
  line2?: string | null
  city: string
  postalCode: string
  country: string
  phone?: string | null
}

export interface OrderItem {
  id: string
  productId: string
  variantId: string
  productName: string
  productSlug: string
  image: string | null
  size: number
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
}

export interface Order {
  id: string
  number: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  subtotalCents: number
  shippingCents: number
  totalCents: number
  shippingAddress: ShippingAddress
  items: OrderItem[]
  itemCount: number
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  customer?: { id: string; name: string; email: string }
}

export interface PaymentSession {
  mode: 'stripe' | 'mock'
  clientSecret: string | null
}

export interface StockShortage {
  variantId: string
  productId: string
  productName: string
  productSlug: string
  size: number
  requested: number
  available: number
  alternatives: Array<{ variantId: string; size: number; stock: number }>
}

export interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  createdAt: string
  updatedAt: string
  verifiedPurchase: boolean
  author: { id: string; name: string }
}
