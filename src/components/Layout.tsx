import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context'
import { useBag } from '../cart/bag'
import { BagDrawer } from '../cart/BagDrawer'
import { useCart } from '../cart/useCart'
import { money } from '../lib/format'
import { FREE_SHIPPING_THRESHOLD_CENTS } from '../lib/shipping'
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './icons'
import { HeartIcon } from './ui'

const NAV = [
  { to: '/shop', label: 'New in', match: (p: URLSearchParams) => !p.get('gender') && !p.get('category') },
  { to: '/shop?gender=women', label: 'Women', match: (p: URLSearchParams) => p.get('gender') === 'women' },
  { to: '/shop?gender=men', label: 'Men', match: (p: URLSearchParams) => p.get('gender') === 'men' },
  { to: '/shop?category=accessories', label: 'Accessories', match: (p: URLSearchParams) => p.get('category') === 'accessories' && !p.get('gender') },
]

const FOOTER_LINKS = [
  { to: '/help/shipping', label: 'Shipping' },
  { to: '/help/returns', label: 'Returns' },
  { to: '/help/size-guide', label: 'Size guide' },
  { to: '/help/contact', label: 'Contact' },
]

function SearchBar({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])
  return (
    <form
      role="search"
      className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!q.trim()) return
        navigate(`/shop?q=${encodeURIComponent(q.trim())}`)
        onClose()
      }}
    >
      <SearchIcon className="size-5 shrink-0 text-taupe" />
      <label className="flex-1">
        <span className="sr-only">Search the shop</span>
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          placeholder="Search coats, knitwear, jeans…"
          className="w-full border-0 border-b border-ink bg-transparent py-2 text-lg outline-none placeholder:text-taupe/70"
          maxLength={100}
        />
      </label>
      <button type="button" onClick={onClose} className="p-2" aria-label="Close search">
        <CloseIcon />
      </button>
    </form>
  )
}

export function Layout() {
  const { user, isAdmin, logout } = useAuth()
  const { cart } = useCart()
  const bag = useBag()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()

  // Close menus whenever the route changes (state adjusted during render).
  const here = location.pathname + location.search
  const [menuPath, setMenuPath] = useState(here)
  if (menuPath !== here) {
    setMenuPath(here)
    setMenuOpen(false)
  }

  const params = new URLSearchParams(location.search)
  const isActive = (match: (p: URLSearchParams) => boolean) => location.pathname === '/shop' && match(params)
  const navClass = (active: boolean) =>
    `text-[13px] uppercase tracking-[0.14em] underline-offset-[6px] ${active ? 'underline decoration-1' : 'hover:underline decoration-1'}`

  // Protected pages send a signed-out user home (see RequireAuth); others stay put.
  const handleLogout = logout

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-paper focus:p-2">
        Skip to content
      </a>
      <p className="bg-ink px-4 py-2 text-center text-xs tracking-wide text-cream">
        Free delivery on orders over {money(FREE_SHIPPING_THRESHOLD_CENTS)} · Easy 30-day returns
      </p>
      <header className="sticky top-0 z-30 border-b border-sand-300 bg-cream/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-360 grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-[72px] sm:px-8">
          <div className="flex items-center gap-7">
            <button
              type="button"
              className="-ml-2 p-2 lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MenuIcon open={menuOpen} />
            </button>
            <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
              {NAV.map((n) => (
                <Link key={n.label} to={n.to} className={navClass(isActive(n.match))} aria-current={isActive(n.match) ? 'page' : undefined}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link to="/" className="font-serif text-3xl tracking-[0.32em] sm:text-4xl" aria-label="ZALE home">
            ZALE
          </Link>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            {isAdmin && (
              <Link to="/admin" className="mr-2 hidden text-[13px] uppercase tracking-[0.14em] hover:underline sm:inline">
                Admin
              </Link>
            )}
            <button type="button" className="p-2" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((s) => !s)}>
              <SearchIcon />
            </button>
            <Link to={user ? '/account' : '/login'} state={user ? undefined : { from: here }} className="hidden p-2 sm:block" aria-label={user ? 'Account' : 'Log in'}>
              <UserIcon />
            </Link>
            <Link to="/wishlist" className="hidden p-2 sm:block" aria-label="Wishlist">
              <HeartIcon filled={false} className="size-5" />
            </Link>
            <button type="button" onClick={() => bag.open()} className="flex items-center gap-1 p-2 text-sm" aria-label={`Bag, ${cart.itemCount} items`}>
              <BagIcon />
              <span className="tabular-nums">({cart.itemCount})</span>
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-sand-300">
            <SearchBar onClose={() => setSearchOpen(false)} />
          </div>
        )}

        {menuOpen && (
          <nav className="border-t border-sand-300 px-4 py-4 lg:hidden" aria-label="Mobile">
            <ul className="space-y-1">
              {NAV.map((n) => (
                <li key={n.label}>
                  <Link to={n.to} className="block py-2 text-sm uppercase tracking-[0.14em]">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-3 space-y-1 border-t border-sand-300 pt-3 text-sm">
              {user ? (
                <>
                  <li>
                    <Link to="/account" className="block py-2">
                      Account
                    </Link>
                  </li>
                  <li>
                    <Link to="/account/orders" className="block py-2">
                      Orders
                    </Link>
                  </li>
                  <li>
                    <Link to="/wishlist" className="block py-2">
                      Wishlist
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link to="/admin" className="block py-2">
                        Admin
                      </Link>
                    </li>
                  )}
                  <li>
                    <button type="button" onClick={handleLogout} className="block py-2">
                      Log out
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link to="/login" state={{ from: here }} className="block py-2">
                    Log in
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        )}
      </header>

      <main id="main" className="w-full flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-sand-300">
        <div className="mx-auto flex max-w-360 flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link to="/" className="font-serif text-2xl tracking-[0.32em]">
            ZALE
          </Link>
          <nav aria-label="Help" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
      <BagDrawer />
      <ScrollRestoration />
    </div>
  )
}
