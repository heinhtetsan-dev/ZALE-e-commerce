import { useState } from 'react'
import { Link } from 'react-router'
import { useAddToBag } from '../cart/useAddToBag'
import { errorMessage } from '../lib/api'
import { swatchStyle } from '../lib/colors'
import { money } from '../lib/format'
import type { ProductCard as Product } from '../lib/types'
import { ProductImage } from './ui'
import { WishlistButton } from './WishlistButton'

const TILE_TONES = ['bg-sand-300', 'bg-sand-200', 'bg-sand-400', 'bg-sand-100']

/** Pick a size right on the card and add it without opening the product page. */
function QuickAdd({ product, onDone }: { product: Product; onDone: () => void }) {
  const { addToBag, isAdding } = useAddToBag()
  const [error, setError] = useState<string | null>(null)

  const add = async (size: Product['sizes'][number]) => {
    setError(null)
    try {
      await addToBag({
        variantId: size.variantId,
        quantity: 1,
        size: size.size,
        stock: size.stock,
        product: { id: product.id, slug: product.slug, name: product.name, brand: product.brand.name, color: product.colorway ?? product.color, priceCents: product.priceCents, image: product.image },
      })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="absolute inset-x-2 bottom-2 bg-cream/95 p-3 shadow-sm backdrop-blur" role="group" aria-label={`Quick add ${product.name}`}>
      <p className="eyebrow mb-2 text-ink">Select size</p>
      <div className="flex flex-wrap gap-1.5">
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
  const [picking, setPicking] = useState(false)
  const oneSize = product.sizes.length === 1
  const { addToBag, isAdding } = useAddToBag()
  const [error, setError] = useState<string | null>(null)

  // One-size items (bags, caps…) skip the size step.
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
      <div className={`relative aspect-3/4 overflow-hidden ${TILE_TONES[tone % TILE_TONES.length]}`}>
        <Link to={`/products/${product.slug}`} tabIndex={-1} aria-hidden>
          <ProductImage src={product.image} alt="" className="size-full transition duration-500 group-hover:scale-[1.03]" />
        </Link>
        {!product.inStock && <span className="eyebrow absolute left-3 top-3 bg-cream px-2 py-1 text-ink">Sold out</span>}
        <div className="absolute right-3 top-3">
          <WishlistButton productId={product.id} compact />
        </div>
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
        {picking && <QuickAdd product={product} onDone={() => setPicking(false)} />}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      <Link to={`/products/${product.slug}`} className="mt-3 text-sm hover:underline">
        <h3>{product.name}</h3>
      </Link>
      <p className="mt-0.5 text-sm font-medium">{money(product.priceCents)}</p>
      {product.swatches.length > 1 ? (
        <ul className="mt-2 flex gap-1.5" aria-label="Colors">
          {product.swatches.map((s) => (
            <li key={s.slug}>
              <Link
                to={`/products/${s.slug}`}
                aria-label={s.colorway ?? s.color}
                title={s.colorway ?? s.color}
                aria-current={s.slug === product.slug ? 'true' : undefined}
                className={`block size-3.5 rounded-full ring-offset-2 ring-offset-cream ${s.slug === product.slug ? 'ring-1 ring-ink' : 'ring-1 ring-sand-400'}`}
                style={swatchStyle(s.color, s.colorway)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-taupe">{product.colorway ?? product.color}</p>
      )}
    </article>
  )
}
