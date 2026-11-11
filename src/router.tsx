import type { ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { Contained } from './components/Contained'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { Spinner } from './components/ui'
import { AccountPage } from './pages/AccountPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { HelpPage } from './pages/HelpPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductListPage } from './pages/ProductListPage'
import { RegisterPage } from './pages/RegisterPage'
import { RouteErrorPage } from './pages/RouteErrorPage'
import { WishlistPage } from './pages/WishlistPage'

const authed = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>

const fullBleedRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'shop', element: <ProductListPage /> },
  { path: 'products/:slug', element: <ProductDetailPage /> },
]

// Admin screens and the Stripe payment form are split into separate chunks,
// so shoppers on mobile never download them unless they need them.
const pageRoutes: RouteObject[] = [
  { path: 'help/:topic', element: <HelpPage /> },
  { path: 'cart', element: <CartPage /> },
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
  { path: 'checkout', element: authed(<CheckoutPage />) },
  {
    path: 'orders/:id/pay',
    lazy: () => import('./pages/PaymentPage').then((m) => ({ element: authed(<m.PaymentPage />) })),
  },
  { path: 'orders/:id/confirmation', element: authed(<OrderConfirmationPage />) },
  { path: 'account', element: authed(<AccountPage />) },
  { path: 'account/orders', element: authed(<OrdersPage />) },
  { path: 'account/orders/:id', element: authed(<OrderDetailPage />) },
  { path: 'wishlist', element: authed(<WishlistPage />) },
  {
    path: 'admin',
    lazy: () =>
      import('./admin/AdminLayout').then((m) => ({
        element: (
          <RequireAuth role="ADMIN">
            <m.AdminLayout />
          </RequireAuth>
        ),
      })),
    children: [
      { index: true, lazy: () => import('./admin/AdminDashboardPage').then((m) => ({ Component: m.AdminDashboardPage })) },
      { path: 'products', lazy: () => import('./admin/AdminProductsPage').then((m) => ({ Component: m.AdminProductsPage })) },
      { path: 'products/new', lazy: () => import('./admin/AdminProductEditPage').then((m) => ({ Component: m.AdminProductEditPage })) },
      { path: 'products/:id', lazy: () => import('./admin/AdminProductEditPage').then((m) => ({ Component: m.AdminProductEditPage })) },
      { path: 'orders', lazy: () => import('./admin/AdminOrdersPage').then((m) => ({ Component: m.AdminOrdersPage })) },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter([
  {
    element: <Layout />,
    hydrateFallbackElement: <Spinner />,
    // Fallback if the layout itself fails; page errors are caught below, inside the layout.
    errorElement: <RouteErrorPage />,
    children: [
      {
        errorElement: (
          <Contained>
            <RouteErrorPage />
          </Contained>
        ),
        children: [...fullBleedRoutes, { element: <Contained />, children: pageRoutes }],
      },
    ],
  },
])
