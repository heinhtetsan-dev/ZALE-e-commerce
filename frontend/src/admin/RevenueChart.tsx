import { useState } from 'react'
import { money } from '../lib/format'
import type { Day } from './chartData'

const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

const niceMax = (v: number) => {
  if (v <= 0) return 10000
  const pow = 10 ** Math.floor(Math.log10(v))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v)!
  return step * pow
}

/** Single-series daily revenue bars with a per-bar hover tooltip and a table view. */
export function RevenueChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const W = 720
  const H = 220
  const pad = { top: 12, right: 8, bottom: 26, left: 56 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const max = niceMax(Math.max(...days.map((d) => d.revenueCents), 0))
  const slot = innerW / Math.max(days.length, 1)
  const gap = 2
  const barW = Math.max(1, slot - gap)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const labelEvery = Math.ceil(days.length / 6)
  const active = hover !== null ? days[hover] : null

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" className="text-xs font-semibold text-stone-600 underline" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>
      {showTable ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-stone-500">
              <tr>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 text-right font-medium">Orders</th>
                <th className="py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {days.map((d) => (
                <tr key={d.date}>
                  <td className="py-1.5">{shortDate(d.date)}</td>
                  <td className="py-1.5 text-right tabular-nums">{d.orders}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(d.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[480px]" role="img" aria-label="Revenue per day bar chart">
            {ticks.map((t) => {
              const y = pad.top + innerH - (t / max) * innerH
              return (
                <g key={t}>
                  <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="#e7e5e4" strokeWidth={1} />
                  <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-stone-500 text-[11px] tabular-nums">
                    {t === 0 ? '$0' : `$${Math.round(t / 100).toLocaleString()}`}
                  </text>
                </g>
              )
            })}
            {days.map((d, i) => {
              const h = (d.revenueCents / max) * innerH
              const x = pad.left + i * slot + gap / 2
              const y = pad.top + innerH - h
              const r = Math.min(4, barW / 2, h)
              return (
                <g key={d.date}>
                  {h > 0 && (
                    <path
                      d={`M${x},${pad.top + innerH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${pad.top + innerH} Z`}
                      fill="#ea580c"
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                  )}
                  {i % labelEvery === 0 && (
                    <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="fill-stone-500 text-[11px]">
                      {shortDate(d.date)}
                    </text>
                  )}
                  {/* Full-height hit target, larger than the bar itself. */}
                  <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
                    <title>{`${shortDate(d.date)}: ${money(d.revenueCents)} from ${d.orders} order${d.orders === 1 ? '' : 's'}`}</title>
                  </rect>
                </g>
              )
            })}
            <line x1={pad.left} x2={W - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="#a8a29e" strokeWidth={1} />
          </svg>
          {active && hover !== null && (
            <div
              className="pointer-events-none absolute top-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md"
              style={{ left: `clamp(0px, calc(${((pad.left + hover * slot + slot / 2) / W) * 100}% - 70px), calc(100% - 140px))`, width: 140 }}
              role="status"
            >
              <p className="font-semibold text-stone-900">{shortDate(active.date)}</p>
              <p className="tabular-nums text-stone-900">{money(active.revenueCents)}</p>
              <p className="text-stone-500">
                {active.orders} order{active.orders === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
