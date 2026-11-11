import type { ReactNode } from 'react'
import { Outlet } from 'react-router'

/** Regular pages sit in the centered content column; home, shop and product pages are full-bleed. */
export function Contained({ children }: { children?: ReactNode }) {
  return <div className="mx-auto w-full max-w-360 px-4 py-8 sm:px-8 sm:py-12">{children ?? <Outlet />}</div>
}
