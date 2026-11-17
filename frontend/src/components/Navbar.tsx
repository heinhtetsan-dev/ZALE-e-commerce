// ============================================================
// Navbar.tsx — ထိပ်ဆုံးက navigation bar (header) တစ်ခုလုံး။
// Layout.tsx ထဲကနေ ခွဲထုတ်ထားတာ — ပါဝင်တာတွေ:
//   - Desktop nav links (New in / Women / Men / Accessories)
//   - Logo
//   - ညာဘက် icon တွေ (Admin, Search, Account, Wishlist, Bag)
//   - Search bar (မှန်ဘီလူးနှိပ်မှ ဖြန့်ပြ)
//   - Mobile hamburger menu
// Props မလိုဘူး — လိုတဲ့ data အကုန်ကို Context hook တွေ
// (useAuth, useCart, useBag) ကနေ ကိုယ်တိုင်ဆွဲယူတယ်။
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context'
import { useBag } from '../cart/bag'
import { useCart } from '../cart/useCart'
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './icons'
import { HeartIcon } from './ui'

// Nav link တွေ။ `match` function က "လက်ရှိ URL ရဲ့ query params နဲ့
// ဒီ link ကိုက်လား" စစ်ပေးတယ် — ကိုက်ရင် underline ပြဖို့။
// ဥပမာ /shop?gender=women မှာ ရှိနေရင် "Women" က active ဖြစ်မယ်။
const NAV = [
  { to: '/shop', label: 'New in', match: (p: URLSearchParams) => !p.get('gender') && !p.get('category') },
  { to: '/shop?gender=women', label: 'Women', match: (p: URLSearchParams) => p.get('gender') === 'women' },
  { to: '/shop?gender=men', label: 'Men', match: (p: URLSearchParams) => p.get('gender') === 'men' },
  { to: '/shop?category=accessories', label: 'Accessories', match: (p: URLSearchParams) => p.get('category') === 'accessories' && !p.get('gender') },
]

// ရှာဖွေရေးဘား — header က မှန်ဘီလူးခလုတ်နှိပ်မှ ပေါ်လာတယ်။
// Submit လုပ်ရင် /shop?q=... ကိုသွားပြီး ProductListPage က q ကိုဖတ်ပြီး ရှာပေးတယ်။
function SearchBar({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate() // code ထဲကနေ page ပြောင်းဖို့ react-router ရဲ့ hook
  const [q, setQ] = useState('') // ရိုက်ထည့်နေတဲ့ စာသား
  const input = useRef<HTMLInputElement>(null)
  // Bar ပေါ်လာတာနဲ့ input ထဲကို cursor အလိုအလျောက်ရောက်အောင် focus ပေးတယ်
  useEffect(() => input.current?.focus(), [])
  return (
    <form
      // role="search" = screen reader တွေကို "ဒီ form က website ရှာဖွေရေး form ပါ"
      // လို့ ကြေညာပေးတဲ့ ARIA landmark။
      role="search"
      className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault() // browser ရဲ့ default form submit (page reload) ကို တားတယ်
        if (!q.trim()) return // ဘာမှမရိုက်ဘဲ Enter နှိပ်ရင် ဘာမှမလုပ်
        navigate(`/shop?q=${encodeURIComponent(q.trim())}`)
        onClose() // ရှာပြီးရင် search bar ပိတ်
      }}
    >
      <SearchIcon className="size-5 shrink-0 text-taupe" />
      <label className="flex-1">
        {/* sr-only = မမြင်ရပေမယ့် screen reader ကဖတ်ပြတဲ့ label */}
        <span className="sr-only">Search the shop</span>
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()} // Esc နှိပ်ရင် ပိတ်
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

export function Navbar() {
  // Context ၃ ခုကနေ data ဆွဲယူတယ် — main.tsx မှာ ပတ်ထားတဲ့ Provider တွေဆီကလာတာ
  const { user, isAdmin, logout } = useAuth() // login အခြေအနေ
  const { cart } = useCart() // ခြင်းထဲ ပစ္စည်းဘယ်နှခုလဲ ပြဖို့
  const bag = useBag() // bag drawer ဖွင့်ဖို့
  const [menuOpen, setMenuOpen] = useState(false) // mobile hamburger menu
  const [searchOpen, setSearchOpen] = useState(false) // search bar ပွင့်/ပိတ်
  const location = useLocation() // လက်ရှိ URL

  // Page ပြောင်းသွားရင် mobile menu အလိုအလျောက်ပိတ် — useEffect မသုံးဘဲ
  // render အတွင်းမှာတင် state ညှိတဲ့ React ရဲ့ တရားဝင် pattern။
  // (useEffect နဲ့လုပ်ရင် menu ပွင့်လျက် တစ်ချက်မြင်ရပြီးမှ ပိတ်သွားမှာမို့)
  const here = location.pathname + location.search
  const [menuPath, setMenuPath] = useState(here)
  if (menuPath !== here) {
    setMenuPath(here)
    setMenuOpen(false)
  }

  // NAV link တစ်ခု active လား စစ်တယ် — /shop မှာရှိပြီး query params ကိုက်မှ active
  const params = new URLSearchParams(location.search)
  const isActive = (match: (p: URLSearchParams) => boolean) => location.pathname === '/shop' && match(params)
  const navClass = (active: boolean) =>
    `text-[13px] uppercase tracking-[0.14em] underline-offset-[6px] ${active ? 'underline decoration-1' : 'hover:underline decoration-1'}`

  return (
    // sticky top-0 = scroll ချလည်း header က ထိပ်မှာကပ်နေမယ်
    <header className="sticky top-0 z-30 border-b border-sand-300 bg-cream/95 backdrop-blur">
      {/* grid-cols-[1fr_auto_1fr] = ဘယ်(nav)-အလယ်(logo)-ညာ(icons) သုံးတိုင် —
          logo က အမြဲ အလယ်တည့်တည့်ကျအောင် */}
      <div className="mx-auto grid h-16 max-w-360 grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-[72px] sm:px-8">
        <div className="flex items-center gap-7">
          {/* Hamburger ခလုတ် — lg:hidden မို့ မိုဘိုင်းမှာပဲပေါ်တယ် */}
          <button
            type="button"
            className="-ml-2 p-2 lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MenuIcon open={menuOpen} />
          </button>
          {/* Desktop nav — hidden lg:flex မို့ screen ကျယ်မှပေါ်တယ် */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} className={navClass(isActive(n.match))} aria-current={isActive(n.match) ? 'page' : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Logo — နှိပ်ရင် home ပြန်သွား */}
        <Link to="/" className="font-serif text-3xl tracking-[0.32em] sm:text-4xl" aria-label="ZALE home">
          ZALE
        </Link>

        {/* ညာဘက် icon တွေ */}
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          {/* Admin link — isAdmin (role === 'ADMIN') မှသာ ပေါ်တယ် */}
          {isAdmin && (
            <Link to="/admin" className="mr-2 hidden text-[13px] uppercase tracking-[0.14em] hover:underline sm:inline">
              Admin
            </Link>
          )}
          <button type="button" className="p-2" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((s) => !s)}>
            <SearchIcon />
          </button>
          {/* Login ဝင်ထားရင် account၊ မဝင်ထားရင် login ကိုသွား။
              state={{ from: here }} = login ပြီးရင် ဒီနေရာပြန်ရောက်အောင် လိပ်စာမှတ်ပေးလိုက်တာ */}
          <Link to={user ? '/account' : '/login'} state={user ? undefined : { from: here }} className="hidden p-2 sm:block" aria-label={user ? 'Account' : 'Log in'}>
            <UserIcon />
          </Link>
          <Link to="/wishlist" className="hidden p-2 sm:block" aria-label="Wishlist">
            <HeartIcon filled={false} className="size-5" />
          </Link>
          {/* Bag ခလုတ် — နှိပ်ရင် page မပြောင်းဘဲ BagDrawer ကို ဖွင့်တယ် */}
          <button type="button" onClick={() => bag.open()} className="flex items-center gap-1 p-2 text-sm" aria-label={`Bag, ${cart.itemCount} items`}>
            <BagIcon />
            <span className="tabular-nums">({cart.itemCount})</span>
          </button>
        </div>
      </div>

      {/* Search ခလုတ်နှိပ်ထားရင် header အောက်မှာ SearchBar ဖြန့်ပြ */}
      {searchOpen && (
        <div className="border-t border-sand-300">
          <SearchBar onClose={() => setSearchOpen(false)} />
        </div>
      )}

      {/* Mobile menu — hamburger နှိပ်ထားမှပေါ်တယ် (lg:hidden = desktop မှာမပေါ်) */}
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
          {/* ဒုတိယအပိုင်း — login ဝင်ထား/မထားပေါ် မူတည်ပြီး ကွဲပြားတယ် */}
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
                  <button type="button" onClick={logout} className="block py-2">
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
  )
}
