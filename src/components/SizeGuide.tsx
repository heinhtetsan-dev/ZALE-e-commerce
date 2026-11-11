import { useEffect, useRef } from 'react'
import { CloseIcon } from './icons'

// Typical body measurements in centimetres for the shop's size labels.
const TOPS = [
  ['XS', '80–84', '64–68', '86–90'],
  ['S', '86–90', '70–74', '92–96'],
  ['M', '92–98', '76–82', '98–104'],
  ['L', '100–106', '84–90', '106–112'],
  ['XL', '108–114', '92–98', '114–120'],
  ['XXL', '116–122', '100–106', '122–128'],
]

const WAIST = [
  ['24–25', '61–64'],
  ['26–27', '66–69'],
  ['28–29', '71–74'],
  ['30–31', '76–79'],
  ['32–33', '81–84'],
  ['34', '86'],
  ['36', '91'],
  ['38', '97'],
]

export function SizeGuideContent() {
  return (
    <div className="space-y-8 text-sm">
      <p className="text-taupe">
        Measurements are body measurements in centimetres. If you are between sizes, choose the larger size for a relaxed fit. Fits vary by brand, so check
        the product description too.
      </p>
      <section>
        <h3 className="eyebrow mb-3 text-ink">Tops, knitwear, dresses & outerwear</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead className="border-b border-sand-400 text-xs uppercase tracking-[0.12em] text-taupe">
              <tr>
                <th className="py-2 font-medium">Size</th>
                <th className="py-2 font-medium">Chest / bust</th>
                <th className="py-2 font-medium">Waist</th>
                <th className="py-2 font-medium">Hips</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-300">
              {TOPS.map(([size, ...cm]) => (
                <tr key={size}>
                  <td className="py-2 font-medium">{size}</td>
                  {cm.map((v, i) => (
                    <td key={i} className="py-2 tabular-nums">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="eyebrow mb-3 text-ink">Jeans & trousers (waist size)</h3>
        <table className="w-full max-w-sm text-left">
          <thead className="border-b border-sand-400 text-xs uppercase tracking-[0.12em] text-taupe">
            <tr>
              <th className="py-2 font-medium">Size</th>
              <th className="py-2 font-medium">Waist (cm)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-300">
            {WAIST.map(([size, cm]) => (
              <tr key={size}>
                <td className="py-2 font-medium">{size}</td>
                <td className="py-2 tabular-nums">{cm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-taupe">Caps use S/M, M/L and L/XL; bags, scarves and most other accessories are One Size.</p>
    </div>
  )
}

export function SizeGuideDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Size guide">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-xl overflow-y-auto bg-cream p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="display text-3xl">Size guide</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="-mr-2 p-2" aria-label="Close size guide">
            <CloseIcon />
          </button>
        </div>
        <SizeGuideContent />
      </div>
    </div>
  )
}
