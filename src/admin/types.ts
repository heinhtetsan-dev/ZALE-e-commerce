import type { Order, ProductDetail } from '../lib/types'

export interface AdminProduct extends ProductDetail {
  totalStock?: number
  imageRefs?: string[]
  brandId?: string
  categoryId?: string
}

export interface AdminOrder extends Order {
  customer: { id: string; name: string; email: string }
}

export interface Lookup {
  id: string
  name: string
  slug: string
}

export interface SalesSummary {
  range: { from: string; to: string }
  revenueCents: number
  paidOrders: number
  averageOrderCents: number
  awaitingShipment: number
  ordersByStatus: Record<'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED', number>
  revenueByDay: Array<{ date: string; revenueCents: number; orders: number }>
  topProducts: Array<{ productId: string; name: string; units: number; revenueCents: number }>
  lowStock: Array<{ variantId: string; productId: string; productName: string; image: string | null; size: string; stock: number }>
}

export interface AdminCustomer {
  id: string
  name: string
  email: string
  createdAt: string
  disabledAt: string | null
  orderCount: number
  reviewCount: number
  totalSpentCents: number
}

export interface AdminReviewSummary {
  id: string
  rating: number
  title: string | null
  comment: string | null
  createdAt: string
  product: { id: string; name: string; slug: string }
}

export interface AdminCustomerDetail {
  id: string
  name: string
  email: string
  createdAt: string
  disabledAt: string | null
  orders: Order[]
  reviews: AdminReviewSummary[]
}

export interface AdminReview extends AdminReviewSummary {
  author: { id: string; name: string; email: string }
}
