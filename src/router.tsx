import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { PaymentPage } from './pages/PaymentPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductListPage } from './pages/ProductListPage'

const authed = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <ProductListPage /> },
      { path: 'products/:slug', element: <ProductDetailPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: authed(<CheckoutPage />) },
      { path: 'orders/:id/pay', element: authed(<PaymentPage />) },
      { path: 'orders/:id/confirmation', element: authed(<OrderConfirmationPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
