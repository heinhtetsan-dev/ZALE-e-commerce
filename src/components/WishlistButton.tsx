import { useLocation, useNavigate } from 'react-router'
import { useWishlist } from '../wishlist/useWishlist'
import { HeartIcon } from './ui'

export function WishlistButton({ productId, compact = false }: { productId: string; compact?: boolean }) {
  const wishlist = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()
  const saved = wishlist.has(productId)

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!wishlist.enabled) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    wishlist.toggle(productId)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      className={`grid place-items-center transition ${compact ? 'size-9 rounded-full bg-cream/95 hover:bg-cream' : 'size-[54px] border border-sand-400 hover:border-ink'} text-ink`}
    >
      <HeartIcon filled={saved} className={compact ? 'size-[18px]' : 'size-5'} />
    </button>
  )
}
