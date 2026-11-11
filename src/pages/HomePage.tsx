import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Newsletter } from '../components/Newsletter'
import { ProductCard } from '../components/ProductCard'
import { ProductImage } from '../components/ui'
import { api } from '../lib/api'
import type { Page, ProductCard as Product } from '../lib/types'

/** First product image for a query, used as editorial photography on the home page. */
function useFeatureImage(query: Record<string, string>) {
  return useQuery({
    queryKey: ['products', 'feature', query],
    queryFn: () => api<Page<Product>>('/products', { query: { ...query, pageSize: 1 } }).then((p) => p.items[0]?.image ?? null),
    staleTime: 10 * 60_000,
  }).data
}

const TILES: Array<{ label: string; to: string; tone: string; query: Record<string, string> }> = [
  { label: 'Women', to: '/shop?gender=women', tone: 'bg-sand-200', query: { gender: 'women', category: 'dresses' } },
  { label: 'Men', to: '/shop?gender=men', tone: 'bg-sand-400', query: { gender: 'men', category: 'jackets-and-coats' } },
  { label: 'Accessories', to: '/shop?category=accessories', tone: 'bg-sand-100', query: { category: 'accessories' } },
]

function CategoryTile({ tile }: { tile: (typeof TILES)[number] }) {
  const image = useFeatureImage(tile.query)
  return (
    <Link to={tile.to} className={`group relative block aspect-5/4 overflow-hidden ${tile.tone}`}>
      {image && <ProductImage src={image} alt="" className="absolute inset-0 size-full opacity-90 transition duration-700 group-hover:scale-[1.03]" />}
      <div className="absolute inset-0 bg-linear-to-t from-cream/90 via-cream/20 to-transparent" />
      <div className="absolute bottom-6 left-6">
        <h2 className="display text-4xl">{tile.label}</h2>
        <p className="mt-1 text-xs uppercase tracking-[0.18em]">Shop now →</p>
      </div>
    </Link>
  )
}

export function HomePage() {
  const campaign = useFeatureImage({ gender: 'women', category: 'jackets-and-coats' })
  const arrivals = useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: () => api<Page<Product>>('/products', { query: { sort: 'newest', pageSize: 4 } }),
  })

  return (
    <div>
      <section className="mx-auto grid max-w-360 items-center gap-10 px-4 py-10 sm:px-8 md:grid-cols-2 md:py-14">
        <div className="max-w-md">
          <p className="eyebrow">Autumn / Winter</p>
          <h1 className="display mt-5 text-6xl sm:text-7xl">Quiet layers for colder days</h1>
          <p className="mt-6 text-base leading-relaxed text-taupe">
            Wool coats, soft knits and denim made to be worn on repeat. Discover the key pieces of the season, chosen to layer well and last.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop?gender=women" className="btn-primary px-7 py-3.5">
              Shop women
            </Link>
            <Link to="/shop?gender=men" className="btn-secondary px-7 py-3.5">
              Shop men
            </Link>
          </div>
        </div>
        <div className="aspect-10/9 overflow-hidden bg-sand-300">
          {campaign && <ProductImage src={campaign} alt="Autumn/Winter collection" className="size-full" />}
        </div>
      </section>

      <section className="mx-auto grid max-w-360 gap-4 px-4 sm:px-8 md:grid-cols-3" aria-label="Shop by category">
        {TILES.map((t) => (
          <CategoryTile key={t.label} tile={t} />
        ))}
      </section>

      <section className="mx-auto max-w-360 px-4 py-16 sm:px-8" aria-labelledby="arrivals-title">
        <div className="mb-8 flex items-end justify-between">
          <h2 id="arrivals-title" className="display text-4xl sm:text-5xl">
            New arrivals
          </h2>
          <Link to="/shop?sort=newest" className="text-xs uppercase tracking-[0.18em] link-underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {arrivals.data?.items.map((p, i) => <ProductCard key={p.id} product={p} tone={i} />) ??
            Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-3/4 animate-pulse bg-sand-200" />)}
        </div>
      </section>

      <Newsletter />
    </div>
  )
}
