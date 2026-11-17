// ============================================================
// router.tsx — URL လမ်းကြောင်းတစ်ခုချင်းစီကို ဘယ် Page component နဲ့
// ပြမလဲ သတ်မှတ်တဲ့ "လမ်းညွှန်မြေပုံ" ဖိုင်။
// ဥပမာ: /shop → ProductListPage, /cart → CartPage
// ============================================================

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

// Helper function — page တစ်ခုကို <RequireAuth> နဲ့ ပတ်ပေးတယ်။
// RequireAuth က login မဝင်ရသေးရင် /login ကို redirect လုပ်ပေးတယ်။
const authed = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>

// "Full-bleed" routes — စာမျက်နှာအပြည့် (ဘေးအနားမထား) ပြချင်တဲ့ page တွေ။
// ဥပမာ Home page က hero ပုံကြီးကို screen အပြည့် ပြချင်လို့။
const fullBleedRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> }, // index: true = "/" (ပင်မစာမျက်နှာ)
  { path: 'shop', element: <ProductListPage /> },
  { path: 'products/:slug', element: <ProductDetailPage /> }, // :slug = ပြောင်းလဲနိုင်တဲ့အပိုင်း (ဥပမာ /products/air-max-90)
]

// Admin screens and the Stripe payment form are split into separate chunks,
// so shoppers on mobile never download them unless they need them.
// (အောက်မှာ lazy: () => import(...) သုံးထားတာက "code splitting" —
//  အဲ့ဒီ page ကို တကယ်သွားမှသာ JavaScript ကို download လုပ်တယ်။)
const pageRoutes: RouteObject[] = [
  { path: 'help/:topic', element: <HelpPage /> },
  { path: 'cart', element: <CartPage /> },
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
  // checkout ကစပြီး login လိုအပ်တဲ့ page တွေကို authed(...) နဲ့ ကာကွယ်ထားတယ်
  { path: 'checkout', element: authed(<CheckoutPage />) },
  {
    // ငွေချေစာမျက်နှာ — Stripe library က ကြီးလို့ သီးသန့် chunk ခွဲထားတယ်
    path: 'orders/:id/pay',
    lazy: () => import('./pages/PaymentPage').then((m) => ({ element: authed(<m.PaymentPage />) })),
  },
  { path: 'orders/:id/confirmation', element: authed(<OrderConfirmationPage />) },
  { path: 'account', element: authed(<AccountPage />) },
  { path: 'account/orders', element: authed(<OrdersPage />) },
  { path: 'account/orders/:id', element: authed(<OrderDetailPage />) },
  { path: 'wishlist', element: authed(<WishlistPage />) },
  {
    // Admin ဧရိယာ — role="ADMIN" ရှိမှ ဝင်လို့ရတယ်၊ သာမန် user ဆို home ပြန်ပို့တယ်
    path: 'admin',
    lazy: () =>
      import('./admin/AdminLayout').then((m) => ({
        element: (
          <RequireAuth role="ADMIN">
            <m.AdminLayout />
          </RequireAuth>
        ),
      })),
    // children = AdminLayout ရဲ့ <Outlet /> နေရာမှာ ပြမယ့် sub-page တွေ
    children: [
      { index: true, lazy: () => import('./admin/AdminDashboardPage').then((m) => ({ Component: m.AdminDashboardPage })) },
      { path: 'products', lazy: () => import('./admin/AdminProductsPage').then((m) => ({ Component: m.AdminProductsPage })) },
      { path: 'products/new', lazy: () => import('./admin/AdminProductEditPage').then((m) => ({ Component: m.AdminProductEditPage })) },
      { path: 'products/:id', lazy: () => import('./admin/AdminProductEditPage').then((m) => ({ Component: m.AdminProductEditPage })) },
      { path: 'orders', lazy: () => import('./admin/AdminOrdersPage').then((m) => ({ Component: m.AdminOrdersPage })) },
      { path: 'customers', lazy: () => import('./admin/AdminCustomersPage').then((m) => ({ Component: m.AdminCustomersPage })) },
      { path: 'reviews', lazy: () => import('./admin/AdminReviewsPage').then((m) => ({ Component: m.AdminReviewsPage })) },
    ],
  },
  // '*' = အပေါ်က ဘယ် route နဲ့မှ မကိုက်ရင် 404 page ပြမယ်
  { path: '*', element: <NotFoundPage /> },
]

// Route tree ကို အလွှာလိုက် တည်ဆောက်တယ်:
//   Layout (header + footer) → အတွင်းမှာ page content
//   fullBleedRoutes က အပြည့်ပြ၊ ကျန် pageRoutes ကို <Contained> (ဘေးအနားထည့်တဲ့ container) ထဲမှာပြ
export const router = createBrowserRouter([
  {
    element: <Layout />,
    hydrateFallbackElement: <Spinner />,
    // Fallback if the layout itself fails; page errors are caught below, inside the layout.
    // (Layout ကိုယ်တိုင် error တက်ရင်သုံးမယ့် နောက်ဆုံးခံ error page)
    errorElement: <RouteErrorPage />,
    children: [
      {
        // Page တစ်ခုခုမှာ error တက်ရင် header/footer မပျက်ဘဲ
        // အလယ်မှာပဲ error message ပြပေးတယ်
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
