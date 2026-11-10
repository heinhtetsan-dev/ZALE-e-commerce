import { Link } from 'react-router'
import { money } from '../lib/format'
import type { ProductCard as Product } from '../lib/types'
import { ProductImage, Stars } from './ui'
import { WishlistButton } from './WishlistButton'

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group card relative flex flex-col overflow-hidden transition hover:shadow-md">
      <Link to={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden">
          <ProductImage src={product.image} alt={product.name} className="size-full transition duration-300 group-hover:scale-105" />
          {!product.inStock && (
            <span className="absolute left-2 top-2 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs font-semibold text-white">Sold out</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{product.brand.name}</p>
          <h3 className="line-clamp-2 text-sm font-semibold sm:text-base">{product.name}</h3>
          <p className="text-xs text-stone-500">
            {product.category.name} · {product.color}
          </p>
          {product.ratingCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-stone-500">
              <Stars value={product.ratingAvg} />
              <span>({product.ratingCount})</span>
            </div>
          )}
          <p className="mt-auto pt-2 font-bold">{money(product.priceCents)}</p>
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <WishlistButton productId={product.id} compact />
      </div>
    </article>
  )
}
