export interface Day {
  date: string
  revenueCents: number
  orders: number
}

/** Fills missing days with zero so gaps in sales are visible, not collapsed. */
export function fillDays(from: string, to: string, days: Day[]): Day[] {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const out: Day[] = []
  const cursor = new Date(`${from.slice(0, 10)}T00:00:00Z`)
  const end = new Date(`${to.slice(0, 10)}T00:00:00Z`)
  while (cursor <= end && out.length < 400) {
    const key = cursor.toISOString().slice(0, 10)
    out.push(byDate.get(key) ?? { date: key, revenueCents: 0, orders: 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}
