import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useCart } from '../cart/useCart'
import { ProductReviews } from '../components/ProductReviews'
import { ErrorBox, Notice, ProductImage, Spinner, Stars } from '../components/ui'
import { WishlistButton } from '../components/WishlistButton'
import { api, ApiError, errorMessage } from '../lib/api'
import { formatSize, money, stockLabel } from '../lib/format'
import type { ProductDetail, Variant } from '../lib/types'

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const queryClient = useQueryClient()
  const product = useQuery({ queryKey: ['product', slug], queryFn: () => api<ProductDetail>(`/products/${slug}`) })
  const { add } = useCart()
  const [selected, setSelected] = useState<Variant | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [sizeError, setSizeError] = useState(false)

  if (product.isPending) return <Spinner />
  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404
    return (
      <ErrorBox
        title={notFound ? 'Product not found' : 'Could not load this product'}
        message={notFound ? 'It may have been removed. Browse our other shoes instead.' : errorMessage(product.error)}
        onRetry={notFound ? undefined : () => product.refetch()}
      />
    )
  }

  const p = product.data
  // Keep the selection in sync with fresh stock data after refetches.
  const current = selected ? (p.variants.find((v) => v.id === selected.id) ?? null) : null
  const inStockSizes = p.variants.filter((v) => v.stock > 0)

  const handleAdd = async () => {
    setMessage(null)
    if (!current) {
      setSizeError(true)
      return
    }
    try {
      await add.mutateAsync({
        variantId: current.id,
        quantity: 1,
        size: current.size,
        stock: current.stock,
        product: { id: p.id, slug: p.slug, name: p.name, brand: p.brand.name, color: p.color, priceCents: p.priceCents, image: p.images[0] ?? null },
      })
      setMessage({ tone: 'success', text: `Added ${p.name} (${formatSize(current.size)}) to your cart.` })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') {
        // Stock changed since the page loaded: refresh the size grid.
        await queryClient.invalidateQueries({ queryKey: ['product', slug] })
      }
      setMessage({ tone: 'error', text: errorMessage(err) })
    }
  }

  return (
    <div>
      <nav className="mb-4 text-sm text-stone-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:underline">
          Shop
        </Link>{' '}
        /{' '}
        <Link to={`/?category=${p.category.slug}`} className="hover:underline">
          {p.category.name}
        </Link>{' '}
        / <span className="text-stone-900">{p.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="card overflow-hidden">
            <ProductImage src={p.images[imageIndex] ?? null} alt={p.name} className="aspect-square w-full" />
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {p.images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={`size-20 overflow-hidden rounded-lg border-2 ${i === imageIndex ? 'border-stone-900' : 'border-transparent'}`}
                >
                  <ProductImage src={img} alt="" className="size-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">{p.brand.name}</p>
          <div className="mt-1 flex items-start gap-3">
            <h1 className="flex-1 text-2xl font-bold tracking-tight sm:text-3xl">{p.name}</h1>
            <WishlistButton productId={p.id} />
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-stone-600">
            {p.ratingCount > 0 ? (
              <>
                <Stars value={p.ratingAvg} />
                <a href="#reviews" className="hover:underline">
                  {p.ratingAvg.toFixed(1)} ({p.ratingCount} review{p.ratingCount === 1 ? '' : 's'})
                </a>
              </>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>
          <p className="mt-4 text-2xl font-bold">{money(p.priceCents)}</p>
          <p className="mt-1 text-sm text-stone-600">
            {p.category.name} · {p.color}
          </p>

          <fieldset className="mt-6">
            <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
              <span>Select size (EU)</span>
              {current && <span className={current.stockStatus === 'low_stock' ? 'text-amber-700' : 'text-emerald-700'}>{stockLabel(current.stock)}</span>}
            </legend>
            {p.variants.length === 0 ? (
              <p className="text-sm text-stone-600">No sizes available.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Size">
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
                        setMessage(null)
                      }}
                      className={`relative rounded-lg border py-3 text-sm font-semibold transition ${
                        isSelected
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : out
                            ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 line-through'
                            : 'border-stone-300 bg-white hover:border-stone-900'
                      }`}
                    >
                      {v.size}
                      {v.stockStatus === 'low_stock' && !isSelected && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-500" aria-hidden />}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="mt-2 text-xs text-stone-500">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-amber-500 align-middle" /> Low stock · crossed out = sold out
            </p>
            {sizeError && (
              <p className="mt-2 text-sm font-medium text-red-600" role="alert">
                Please select a size first.
              </p>
            )}
          </fieldset>

          {inStockSizes.length === 0 && p.variants.length > 0 && (
            <div className="mt-4">
              <Notice tone="warning">This shoe is sold out in every size. Check back soon or browse similar styles.</Notice>
            </div>
          )}

          <button type="button" className="btn-accent mt-6 w-full py-3.5 text-base" onClick={handleAdd} disabled={add.isPending || inStockSizes.length === 0}>
            {add.isPending ? 'Adding…' : 'Add to cart'}
          </button>

          {message && (
            <div className="mt-4" role={message.tone === 'error' ? 'alert' : 'status'}>
              {message.tone === 'success' ? (
                <Notice tone="success">
                  {message.text}{' '}
                  <Link to="/cart" className="font-semibold underline">
                    View cart
                  </Link>
                </Notice>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">{message.text}</p>
                  {inStockSizes.filter((v) => v.id !== current?.id).length > 0 && (
                    <p className="mt-1">Available sizes: {inStockSizes.filter((v) => v.id !== current?.id).map((v) => v.size).join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 border-t border-stone-200 pt-6">
            <h2 className="text-sm font-semibold">Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">{p.description}</p>
          </div>
        </div>
      </div>

      <ProductReviews productId={p.id} ratingAvg={p.ratingAvg} ratingCount={p.ratingCount} slug={p.slug} />
    </div>
  )
}
