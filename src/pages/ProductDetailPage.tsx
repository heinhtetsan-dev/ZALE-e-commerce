import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAddToBag } from '../cart/useAddToBag'
import { AccordionItem } from '../components/Accordion'
import { ProductReviews } from '../components/ProductReviews'
import { SizeGuideDialog } from '../components/SizeGuide'
import { ErrorBox, ProductImage, Spinner, Stars } from '../components/ui'
import { WishlistButton } from '../components/WishlistButton'
import { api, ApiError, errorMessage } from '../lib/api'
import { swatchStyle } from '../lib/colors'
import { money, stockLabel } from '../lib/format'
import { careAdvice, deliveryPolicy, returnsPolicy } from '../lib/policies'
import type { ProductDetail, Variant } from '../lib/types'

const TILE_TONES = ['bg-sand-300', 'bg-sand-200', 'bg-sand-200', 'bg-sand-400']
const audienceOf = (g: ProductDetail['gender']) => (g === 'MEN' ? 'men' : g === 'WOMEN' ? 'women' : null)

function Gallery({ p }: { p: ProductDetail }) {
  const images = p.images.length ? p.images : [null]
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {images.map((img, i) => (
          <div key={img ?? i} className={`${TILE_TONES[i % TILE_TONES.length]} ${images.length === 1 ? 'col-span-2 aspect-4/5' : 'aspect-3/4'}`}>
            <ProductImage src={img} alt={i === 0 ? `${p.name} in ${p.colorway ?? p.color}` : `${p.name}, view ${i + 1}`} className="size-full" />
          </div>
        ))}
      </div>
      {p.imageCredit && (
        <p className="mt-2 text-xs text-taupe">
          {p.imageSourceUrl ? (
            <a href={p.imageSourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {p.imageCredit}
            </a>
          ) : (
            p.imageCredit
          )}
        </p>
      )}
    </div>
  )
}

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const product = useQuery({ queryKey: ['product', slug], queryFn: () => api<ProductDetail>(`/products/${slug}`) })
  const { addToBag, isAdding } = useAddToBag()
  const [selected, setSelected] = useState<Variant | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const closeGuide = useCallback(() => setGuideOpen(false), [])

  // Switching color reuses this component: reset per-product selections.
  const [shownSlug, setShownSlug] = useState(slug)
  if (shownSlug !== slug) {
    setShownSlug(slug)
    setSelected(null)
    setError(null)
    setSizeError(false)
  }

  if (product.isPending) return <Spinner />
  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404
    return (
      <div className="mx-auto max-w-360 px-4 py-10 sm:px-8">
        <ErrorBox
          title={notFound ? 'Product not found' : 'Could not load this product'}
          message={notFound ? 'It may have been removed. Browse the rest of the shop instead.' : errorMessage(product.error)}
          onRetry={notFound ? undefined : () => product.refetch()}
        />
      </div>
    )
  }

  const p = product.data
  const audience = audienceOf(p.gender)
  // Keep the selection in sync with fresh stock data after refetches.
  const current = selected ? (p.variants.find((v) => v.id === selected.id) ?? null) : null
  const inStockSizes = p.variants.filter((v) => v.stock > 0)
  const otherSizes = inStockSizes.filter((v) => v.id !== current?.id)

  const handleAdd = async () => {
    setError(null)
    if (!current) {
      setSizeError(true)
      return
    }
    try {
      await addToBag({
        variantId: current.id,
        quantity: 1,
        size: current.size,
        stock: current.stock,
        product: { id: p.id, slug: p.slug, name: p.name, brand: p.brand.name, color: p.colorway ?? p.color, priceCents: p.priceCents, image: p.images[0] ?? null },
      })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-360 px-4 py-6 sm:px-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:gap-14">
        <Gallery p={p} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="Breadcrumb" className="eyebrow">
            <Link to={audience ? `/shop?gender=${audience}` : '/shop'} className="hover:text-ink">
              {audience === 'men' ? 'Men' : audience === 'women' ? 'Women' : 'Unisex'}
            </Link>
            <span aria-hidden> · </span>
            <Link to={`/shop?${audience ? `gender=${audience}&` : ''}category=${p.category.slug}`} className="hover:text-ink">
              {p.category.name}
            </Link>
          </nav>
          <h1 className="display mt-3 text-4xl sm:text-5xl">{p.name}</h1>
          <p className="mt-4 text-xl font-semibold">{money(p.priceCents)}</p>
          {p.ratingCount > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-xs text-taupe hover:text-ink">
              <Stars value={p.ratingAvg} /> {p.ratingAvg.toFixed(1)} ({p.ratingCount})
            </a>
          )}

          <div className="mt-8">
            <p className="text-sm">
              Color: <span className="font-semibold">{p.colorway ?? p.color}</span>
            </p>
            {p.colorways.length > 1 && (
              <ul className="mt-3 flex flex-wrap gap-3" aria-label="Other colors">
                {p.colorways.map((c) => {
                  const isCurrent = c.slug === p.slug
                  return (
                    <li key={c.slug}>
                      <Link
                        to={`/products/${c.slug}`}
                        aria-current={isCurrent ? 'page' : undefined}
                        title={`${c.colorway ?? c.color}${c.inStock ? '' : ' (sold out)'}`}
                        aria-label={`${c.colorway ?? c.color}${c.inStock ? '' : ', sold out'}`}
                        className={`block size-11 rounded-full border-[3px] border-cream ${isCurrent ? 'ring-2 ring-ink' : 'ring-1 ring-sand-400 hover:ring-ink'} ${c.inStock ? '' : 'opacity-50'}`}
                        style={swatchStyle(c.color, c.colorway)}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <fieldset className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <legend className="text-sm">Size</legend>
              <button type="button" className="text-sm link-underline" onClick={() => setGuideOpen(true)}>
                Size guide
              </button>
            </div>
            {p.variants.length === 0 ? (
              <p className="text-sm text-taupe">No sizes available.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2.5" role="radiogroup" aria-label="Size">
                {p.variants.map((v) => {
                  const out = v.stock === 0
                  const isSelected = current?.id === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={out}
                      title={stockLabel(v.stock)}
                      onClick={() => {
                        setSelected(v)
                        setSizeError(false)
                        setError(null)
                      }}
                      className={`h-14 border text-sm transition ${
                        isSelected
                          ? 'border-ink bg-ink text-cream'
                          : out
                            ? 'cursor-not-allowed border-dashed border-sand-400 text-taupe/60 line-through'
                            : 'border-sand-400 hover:border-ink'
                      }`}
                    >
                      {v.size}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="mt-2 min-h-5 text-xs" aria-live="polite">
              {sizeError ? (
                <span className="text-red-700" role="alert">
                  Please select a size first.
                </span>
              ) : current ? (
                <span className={current.stockStatus === 'low_stock' ? 'text-amber-800' : 'text-taupe'}>{stockLabel(current.stock)}</span>
              ) : null}
            </p>
          </fieldset>

          {inStockSizes.length === 0 && p.variants.length > 0 && (
            <p className="mb-3 text-sm text-taupe">Sold out in every size. Check back soon or explore similar styles.</p>
          )}

          <div className="flex gap-2">
            <button type="button" className="btn-primary h-[54px] flex-1 text-sm tracking-[0.24em]" onClick={handleAdd} disabled={isAdding || inStockSizes.length === 0}>
              {isAdding ? 'Adding…' : 'Add to bag'}
            </button>
            <WishlistButton productId={p.id} />
          </div>

          {error && (
            <div className="mt-4 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
              <p className="font-medium">{error}</p>
              {otherSizes.length > 0 && <p className="mt-1">Available sizes: {otherSizes.map((v) => v.size).join(', ')}</p>}
            </div>
          )}

          <div className="mt-8 border-t border-sand-300">
            <AccordionItem title="Description" defaultOpen>
              <p>{p.description}</p>
              <p className="mt-3 text-xs">
                {p.brand.name} · {p.category.name}
              </p>
            </AccordionItem>
            <AccordionItem title="Fabric & care">
              {careAdvice.map((t) => (
                <p key={t} className="mb-2 last:mb-0">
                  {t}
                </p>
              ))}
            </AccordionItem>
            <AccordionItem title="Delivery & returns">
              {[...deliveryPolicy, ...returnsPolicy].map((t) => (
                <p key={t} className="mb-2 last:mb-0">
                  {t}
                </p>
              ))}
            </AccordionItem>
          </div>
        </div>
      </div>

      <ProductReviews productId={p.id} ratingAvg={p.ratingAvg} ratingCount={p.ratingCount} slug={p.slug} />
      {guideOpen && <SizeGuideDialog onClose={closeGuide} />}
    </div>
  )
}
