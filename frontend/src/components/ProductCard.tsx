// ============================================================
// ProductCard.tsx — Shop စာမျက်နှာနဲ့ Home မှာပြတဲ့
// ပစ္စည်းကတ်တစ်ချပ် (ပုံ + နာမည် + ဈေး)။
// Hover လုပ်ရင် "Quick add" ခလုတ်ပေါ်လာပြီး product page
// မသွားဘဲ size ရွေး ခြင်းထည့်လို့ရတယ်။
// ============================================================

import { useState } from 'react'
import { Link } from 'react-router'
import { useAddToBag } from '../cart/useAddToBag'
import { errorMessage } from '../lib/api'
import { money } from '../lib/format'
import type { ProductCard as Product } from '../lib/types'
import { ProductImage } from './ui'
import { WishlistButton } from './WishlistButton'

// ကတ်တွေရဲ့ နောက်ခံအရောင်တွေ — ကတ်တိုင်း တစ်ရောင်တည်းမဖြစ်အောင်
// tone နံပါတ်အလိုက် လှည့်သုံးတယ်
const TILE_TONES = ['bg-sand-300', 'bg-sand-200', 'bg-sand-400', 'bg-sand-100']

/** Pick a size right on the card and add it without opening the product page. */
// (ကတ်ပေါ်မှာတင် size ရွေးခွင့်ပေးတဲ့ panel — "Quick add" နှိပ်မှ ပေါ်လာတယ်)
function QuickAdd({ product, onDone }: { product: Product; onDone: () => void }) {
  const { addToBag, isAdding } = useAddToBag()
  const [error, setError] = useState<string | null>(null)

  // Size ခလုတ်တစ်ခုနှိပ်ရင် — အဲ့ဒီ size ကို ၁ ခု ခြင်းထည့်
  const add = async (size: Product['sizes'][number]) => {
    setError(null)
    try {
      await addToBag({
        variantId: size.variantId,
        quantity: 1,
        size: size.size,
        stock: size.stock,
        // Guest cart က server မမေးဘဲ ပြနိုင်အောင် product info ကို snapshot တွဲပို့
        product: { id: product.id, slug: product.slug, name: product.name, brand: product.brand.name, color: product.colorway ?? product.color, priceCents: product.priceCents, image: product.image },
      })
      onDone() // အောင်မြင်ရင် panel ပိတ်
    } catch (err) {
      setError(errorMessage(err)) // မအောင်မြင်ရင် panel ထဲမှာပဲ error ပြ
    }
  }

  return (
    <div className="absolute inset-x-2 bottom-2 bg-cream/95 p-3 shadow-sm backdrop-blur" role="group" aria-label={`Quick add ${product.name}`}>
      <p className="eyebrow mb-2 text-ink">Select size</p>
      <div className="flex flex-wrap gap-1.5">
        {/* Size တစ်ခုချင်းစီကို ခလုတ်အဖြစ်ပြ — ပြတ်နေတဲ့ size ဆို disabled + မျဉ်းဖြတ်ပြ */}
        {product.sizes.map((s) => (
          <button
            key={s.variantId}
            type="button"
            disabled={s.stock === 0 || isAdding}
            onClick={() => add(s)}
            className="min-w-10 border border-sand-400 bg-paper px-2 py-1.5 text-xs hover:border-ink disabled:cursor-not-allowed disabled:border-dashed disabled:text-taupe/60 disabled:line-through"
            aria-label={s.stock === 0 ? `${s.size}, sold out` : `Add size ${s.size}`}
          >
            {s.size}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function ProductCard({ product, tone = 0 }: { product: Product; tone?: number }) {
  const [picking, setPicking] = useState(false) // size ရွေးတဲ့ panel ပွင့်နေလား
  const oneSize = product.sizes.length === 1
  const { addToBag, isAdding } = useAddToBag()
  const [error, setError] = useState<string | null>(null)

  // One-size items (bags, caps…) skip the size step.
  // (Size တစ်မျိုးတည်းရှိတဲ့ပစ္စည်းဆို size ရွေးစရာမလို — တန်းထည့်။
  //  Size များရင်တော့ QuickAdd panel ကို ဖွင့်ပြ။)
  const quickAdd = async () => {
    if (!oneSize) return setPicking((p) => !p)
    const only = product.sizes[0]!
    setError(null)
    try {
      await addToBag({
        variantId: only.variantId,
        quantity: 1,
        size: only.size,
        stock: only.stock,
        product: { id: product.id, slug: product.slug, name: product.name, brand: product.brand.name, color: product.colorway ?? product.color, priceCents: product.priceCents, image: product.image },
      })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <article className="group relative flex flex-col">
      {/* ပုံအပိုင်း — aspect-3/4 = အမြဲ 3:4 အချိုးထိန်းထား */}
      <div className={`relative aspect-3/4 overflow-hidden ${TILE_TONES[tone % TILE_TONES.length]}`}>
        {/* ပုံကိုနှိပ်ရင် product page သွား။ tabIndex={-1} က keyboard နဲ့သုံးသူအတွက်
            အောက်က နာမည် link နဲ့ ထပ်နေလို့ ဒီ link ကို ကျော်ခိုင်းထားတာ */}
        <Link to={`/products/${product.slug}`} tabIndex={-1} aria-hidden>
          <ProductImage src={product.image} alt="" className="size-full transition duration-500 group-hover:scale-[1.03]" />
        </Link>
        
        {/* ပစ္စည်းပြတ်နေရင် "Sold out" တံဆိပ်ပြ */}
        {!product.inStock && <span className="eyebrow absolute left-3 top-3 bg-cream px-2 py-1 text-ink">Sold out</span>}


        <div className="absolute right-3 top-3">
          <WishlistButton productId={product.id} compact />
        </div>
        {/* Quick add ခလုတ် — desktop မှာ hover မှပေါ် (sm:opacity-0 → group-hover:opacity-100)၊
            mobile မှာ hover မရှိလို့ အမြဲပြထား (opacity-100) */}
        {product.inStock && !picking && (
          <button
            type="button"
            onClick={quickAdd}
            disabled={isAdding}
            className="btn absolute inset-x-2 bottom-2 bg-cream/95 py-2.5 text-ink opacity-100 backdrop-blur transition hover:bg-cream sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          >
            {isAdding ? 'Adding…' : oneSize ? 'Add to bag' : 'Quick add'}
          </button>
        )}
        {/* Size ရွေးနေတုန်းဆို QuickAdd panel ပြ */}
        {picking && <QuickAdd product={product} onDone={() => setPicking(false)} />}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      {/* ကတ်အောက်ပိုင်း — နာမည်၊ ဈေး၊ အရောင် */}
      <Link to={`/products/${product.slug}`} className="mt-3 text-sm hover:underline">
        <h3>{product.name}</h3>
      </Link>
      <p className="mt-0.5 text-sm font-medium">{money(product.priceCents)}</p>
      <p className="mt-1 text-xs text-taupe">
        {product.colorway ?? product.color}
        {product.swatches.length > 1 && ` · ${product.swatches.length} colors`}
      </p>
    </article>
  )
}
