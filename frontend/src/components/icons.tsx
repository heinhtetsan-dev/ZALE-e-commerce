const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const SearchIcon = ({ className = 'size-5' }: { className?: string }) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
)

export const UserIcon = ({ className = 'size-5' }: { className?: string }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4" />
  </svg>
)

export const BagIcon = ({ className = 'size-5' }: { className?: string }) => (
  <svg {...base} className={className}>
    <path d="M5.5 8h13l-1 12.5h-11z" />
    <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
  </svg>
)

export const MenuIcon = ({ open, className = 'size-6' }: { open: boolean; className?: string }) => (
  <svg {...base} className={className}>{open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
)

export const CloseIcon = ({ className = 'size-5' }: { className?: string }) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const ChevronIcon = ({ className = 'size-3' }: { className?: string }) => (
  <svg viewBox="0 0 10 10" className={className} aria-hidden fill="currentColor">
    <path d="M2 1l6 4-6 4z" />
  </svg>
)
