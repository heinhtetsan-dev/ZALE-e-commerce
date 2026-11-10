import { useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context'
import { useCart } from '../cart/useCart'

const YEAR = new Date().getFullYear()

const navLinkClass =({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:text-stone-900'}`

export function Layout() {
  const { user, isAdmin, logout } = useAuth()
  const { cart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Close the mobile menu whenever the route changes (state adjusted during render).
  const [menuPath, setMenuPath] = useState(location.pathname)
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname)
    setMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const links = (
    <>
      <NavLink to="/" end className={navLinkClass}>
        Shop
      </NavLink>
      {user && (
        <>
          <NavLink to="/wishlist" className={navLinkClass}>
            Wishlist
          </NavLink>
          <NavLink to="/account/orders" className={navLinkClass}>
            Orders
          </NavLink>
          <NavLink to="/account" end className={navLinkClass}>
            Account
          </NavLink>
        </>
      )}
      {isAdmin && (
        <NavLink to="/admin" className={navLinkClass}>
          Admin
        </NavLink>
      )}
    </>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <button
            type="button"
            className="-ml-2 rounded-lg p-2 md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">S</span>
            <span>Stride</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <button type="button" onClick={handleLogout} className="btn-ghost hidden sm:inline-flex">
                Log out
              </button>
            ) : (
              <Link to="/login" state={{ from: location.pathname + location.search }} className="btn-ghost">
                Log in
              </Link>
            )}
            <Link to="/cart" className="btn-primary relative" aria-label={`Cart, ${cart.itemCount} items`}>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.5L21 8H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="17" cy="20" r="1" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {cart.itemCount > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                  {cart.itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-stone-200 px-4 py-3 md:hidden" aria-label="Mobile">
            {links}
            {user && (
              <button type="button" onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-600">
                Log out
              </button>
            )}
          </nav>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:justify-between sm:px-6">
          <p>© {YEAR} Stride Shoe Shop</p>
          <p>Free shipping on orders over $100 · 30-day returns</p>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
