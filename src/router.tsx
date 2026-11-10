import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import { AdminDashboardPage } from './admin/AdminDashboardPage'
import { AdminLayout } from './admin/AdminLayout'
import { AdminOrdersPage } from './admin/AdminOrdersPage'
import { AdminProductEditPage } from './admin/AdminProductEditPage'
import { AdminProductsPage } from './admin/AdminProductsPage'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { AccountPage } from './pages/AccountPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { PaymentPage } from './pages/PaymentPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductListPage } from './pages/ProductListPage'
import { RegisterPage } from './pages/RegisterPage'

const authed = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <ProductListPage /> },
      { path: 'products/:slug', element: <ProductDetailPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'checkout', element: authed(<CheckoutPage />) },
      { path: 'orders/:id/pay', element: authed(<PaymentPage />) },
      { path: 'orders/:id/confirmation', element: authed(<OrderConfirmationPage />) },
      { path: 'account', element: authed(<AccountPage />) },
      { path: 'account/orders', element: authed(<OrdersPage />) },
      { path: 'account/orders/:id', element: authed(<OrderDetailPage />) },
      {
        path: 'admin',
        element: (
          <RequireAuth role="ADMIN">
            <AdminLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'products', element: <AdminProductsPage /> },
          { path: 'products/new', element: <AdminProductEditPage /> },
          { path: 'products/:id', element: <AdminProductEditPage /> },
          { path: 'orders', element: <AdminOrdersPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
