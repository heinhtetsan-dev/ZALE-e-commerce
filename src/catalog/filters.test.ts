import { describe, expect, it } from 'vitest'
import { activeFilterCount, filtersToParams, parseFilters, toggle } from './filters'

describe('catalog filters', () => {
  it('parses URL params with defaults and ignores garbage', () => {
    const f = parseFilters(new URLSearchParams('brand=nike,adidas&size=42,abc,42.5&minPrice=-5&maxPrice=9000&sort=bogus&page=0'))
    expect(f).toEqual({
      q: '',
      brand: ['nike', 'adidas'],
      category: [],
      color: [],
      size: [42, 42.5],
      minPrice: undefined,
      maxPrice: 9000,
      sort: 'newest',
      page: 1,
    })
  })

  it('round-trips through URL params, omitting defaults', () => {
    const f = parseFilters(new URLSearchParams('q=air&category=running&color=Black&sort=price_asc&page=3'))
    expect(filtersToParams(f).toString()).toBe('q=air&category=running&color=Black&sort=price_asc&page=3')
    expect(filtersToParams(parseFilters(new URLSearchParams())).toString()).toBe('')
  })

  it('counts active filters and toggles values', () => {
    expect(activeFilterCount(parseFilters(new URLSearchParams('brand=a,b&size=40&minPrice=100')))).toBe(4)
    expect(toggle(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggle(['a'], 'b')).toEqual(['a', 'b'])
  })
})
