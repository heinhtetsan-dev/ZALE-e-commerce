export const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name A–Z' },
] as const

export type Sort = (typeof SORTS)[number]['value']

/** Shopping audience. Unisex items appear under both. */
export type Audience = 'men' | 'women'

export interface CatalogFilters {
  q: string
  gender?: Audience
  brand: string[]
  category: string[]
  color: string[]
  size: string[]
  minPrice?: number
  maxPrice?: number
  sort: Sort
  page: number
}

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])
const int = (v: string | null) => {
  if (v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined
}

/** Filters live in the URL so results are shareable and survive refresh/back. */
export function parseFilters(params: URLSearchParams): CatalogFilters {
  const sort = params.get('sort')
  const page = Number(params.get('page'))
  const gender = params.get('gender')
  return {
    q: params.get('q') ?? '',
    gender: gender === 'men' || gender === 'women' ? gender : undefined,
    brand: list(params.get('brand')),
    category: list(params.get('category')),
    color: list(params.get('color')),
    size: list(params.get('size')),
    minPrice: int(params.get('minPrice')),
    maxPrice: int(params.get('maxPrice')),
    sort: SORTS.some((s) => s.value === sort) ? (sort as Sort) : 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

export function filtersToParams(f: CatalogFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.gender) p.set('gender', f.gender)
  if (f.q) p.set('q', f.q)
  if (f.brand.length) p.set('brand', f.brand.join(','))
  if (f.category.length) p.set('category', f.category.join(','))
  if (f.color.length) p.set('color', f.color.join(','))
  if (f.size.length) p.set('size', f.size.join(','))
  if (f.minPrice !== undefined) p.set('minPrice', String(f.minPrice))
  if (f.maxPrice !== undefined) p.set('maxPrice', String(f.maxPrice))
  if (f.sort !== 'newest') p.set('sort', f.sort)
  if (f.page > 1) p.set('page', String(f.page))
  return p
}

/** Counts sidebar filters; the audience is a tab, not a filter chip. */
export const activeFilterCount = (f: CatalogFilters) =>
  f.brand.length + f.category.length + f.color.length + f.size.length + (f.minPrice !== undefined || f.maxPrice !== undefined ? 1 : 0)

export const toggle = <T,>(arr: T[], value: T) => (arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value])
