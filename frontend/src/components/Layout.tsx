// ============================================================
// Layout.tsx — Page တိုင်းရဲ့ ဘောင် (frame)။
// Nav bar တစ်ခုလုံးကို Navbar.tsx ထဲ သီးသန့်ခွဲထုတ်ထားပြီး
// ဒီဖိုင်မှာ ကျန်တာက:
//   - Skip link + ထိပ်ဆုံး ကြော်ငြာတန်း
//   - <Navbar /> (header)
//   - <Outlet /> — router က page တွေ လဲလှယ်ပြတဲ့နေရာ
//   - Footer
//   - BagDrawer + ScrollRestoration
// router.tsx မှာ route tree ရဲ့ ထိပ်ဆုံးမှာ ထားထားလို့
// page ဘယ်လိုပြောင်းပြောင်း header/footer က မပျက်ဘူး။
// ============================================================

import { Link, Outlet, ScrollRestoration } from 'react-router'
import { BagDrawer } from '../cart/BagDrawer'
import { money } from '../lib/format'
import { FREE_SHIPPING_THRESHOLD_CENTS } from '../lib/shipping'
import { Navbar } from './Navbar'

// Footer က အကူအညီစာမျက်နှာ link တွေ → HelpPage (/help/:topic) ကိုသွားတယ်
const FOOTER_LINKS = [
  { to: '/help/shipping', label: 'Shipping' },
  { to: '/help/returns', label: 'Returns' },
  { to: '/help/size-guide', label: 'Size guide' },
  { to: '/help/contact', label: 'Contact' },
]

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">

      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-paper focus:p-2">
        Skip to content
      </a>
      {/* ထိပ်ဆုံး ကြော်ငြာတန်း — free shipping limit ကို lib/shipping.ts ကယူပြတယ် */}
      <p className="bg-ink px-4 py-2 text-center text-xs tracking-wide text-cream">
        Free delivery on orders over {money(FREE_SHIPPING_THRESHOLD_CENTS)} · Easy 30-day returns
      </p>

  
      <Navbar />

    
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
