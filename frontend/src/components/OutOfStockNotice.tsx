import { Link } from 'react-router'
import { formatSize } from '../lib/format'
import type { StockShortage } from '../lib/types'

/**
 * Clear explanation of which sizes ran out, with the other sizes that are
 * still available as one-tap suggestions.
 */
export function OutOfStockNotice({
  shortages,
  onPickAlternative,
}: {
  shortages: StockShortage[]
  onPickAlternative?: (shortage: StockShortage, alternative: StockShortage['alternatives'][number]) => void
}) {
  if (!shortages.length) return null
  return (
    <div role="alert" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      {shortages.map((s) => (
        <div key={s.variantId}>
          <p className="font-semibold">
            {s.available === 0
              ? `Sorry — ${s.productName} in ${formatSize(s.size)} just sold out.`
              : `Only ${s.available} left of ${s.productName} in ${formatSize(s.size)} (you asked for ${s.requested}).`}
          </p>
          {s.alternatives.length > 0 ? (
            <div className="mt-2">
              <p>Still available in:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.alternatives.map((alt) =>
                  onPickAlternative ? (
                    <button
                      key={alt.variantId}
                      type="button"
                      onClick={() => onPickAlternative(s, alt)}
                      className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 font-medium hover:bg-amber-100"
                    >
                      {formatSize(alt.size)}
                    </button>
                  ) : (
                    <span key={alt.variantId} className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 font-medium">
                      {formatSize(alt.size)}
                    </span>
                  ),
                )}
              </div>
            </div>
          ) : (
            <p className="mt-1">
              No other sizes are in stock right now.{' '}
              <Link to="/" className="font-semibold underline">
                Browse similar items
              </Link>
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
