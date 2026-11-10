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
      className={`grid place-items-center rounded-full transition ${compact ? 'size-9 bg-white/90 shadow-sm backdrop-blur hover:bg-white' : 'size-11 border border-stone-300 bg-white hover:border-stone-900'} ${saved ? 'text-red-600' : 'text-stone-700'}`}
    >
      <HeartIcon filled={saved} className={compact ? 'size-5' : 'size-6'} />
    </button>
  )
}
