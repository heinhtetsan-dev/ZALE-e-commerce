/** Swatch colors for the base `color` values used by the catalog filter. */
const SWATCH: Record<string, string> = {
  black: '#2b2622',
  white: '#f1ece3',
  grey: '#9b958c',
  gray: '#9b958c',
  red: '#8e2a26',
  blue: '#2c3a55',
  green: '#4d5a3c',
  brown: '#6b4a32',
  beige: '#b8a68b',
  pink: '#d9a3a8',
  yellow: '#c99a35',
  orange: '#c46a2b',
  purple: '#5b3f66',
}

export const swatchColor = (name: string) => SWATCH[name.toLowerCase()] ?? '#cfc6b8'

/**
 * Multicolor items get a split swatch instead of a flat fill. Washes of the
 * same base color ("Light Indigo", "Medium Stonewash") are lightened so two
 * blue jeans don't show identical dots.
 */
export const swatchStyle = (name: string, colorway?: string | null): React.CSSProperties => {
  if (name.toLowerCase() === 'multicolor') return { background: 'conic-gradient(#8e2a26 0 25%, #2c3a55 0 50%, #c99a35 0 75%, #4d5a3c 0)' }
  const base = swatchColor(name)
  const shade = /\blight\b/i.test(colorway ?? '') ? 45 : /\bmedium\b/i.test(colorway ?? '') ? 70 : 100
  return { background: shade === 100 ? base : `color-mix(in srgb, ${base} ${shade}%, #f4f0ea)` }
}
