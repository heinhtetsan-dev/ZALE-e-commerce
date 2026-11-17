export const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'Name A–Z' },
] as const

export type Sort = (typeof SORTS)[number]['value']

// for unisex 
export type Audience = 'men' | 'women'

export interface CatalogFilters {
  q: string
  gender?: Audience
  category: string[]
  sort: Sort
  page: number
}

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])


export function parseFilters(params: URLSearchParams): CatalogFilters {
  const sort = params.get('sort')
  const page = Number(params.get('page'))
  const gender = params.get('gender')
  return {
    q: params.get('q') ?? '',
    gender: gender === 'men' || gender === 'women' ? gender : undefined,
    category: list(params.get('category')),
    sort: SORTS.some((s) => s.value === sort) ? (sort as Sort) : 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

export function filtersToParams(f: CatalogFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.gender) p.set('gender', f.gender)
  if (f.q) p.set('q', f.q)
  if (f.category.length) p.set('category', f.category.join(','))
  if (f.sort !== 'newest') p.set('sort', f.sort)
  if (f.page > 1) p.set('page', String(f.page))
  return p
}

/** Counts sidebar filters; the audience is a tab, not a filter chip. */
export const activeFilterCount = (f: CatalogFilters) => f.category.length

export const toggle = <T,>(arr: T[], value: T) => (arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value])
