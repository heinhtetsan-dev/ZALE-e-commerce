import type { ReactNode } from 'react'
import { ChevronIcon } from './icons'

export function AccordionItem({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group border-b border-sand-300">
      <summary className="flex cursor-pointer items-center gap-2.5 py-5 text-xs font-medium uppercase tracking-[0.2em]">
        <ChevronIcon className="size-2.5 transition-transform group-open:rotate-90" />
        {title}
      </summary>
      <div className="pb-6 text-sm leading-relaxed text-taupe">{children}</div>
    </details>
  )
}
