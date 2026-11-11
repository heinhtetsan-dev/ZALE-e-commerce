import { describe, expect, it } from 'vitest'
import { activeFilterCount, filtersToParams, parseFilters, toggle } from './filters'

describe('catalog filters', () => {
  it('parses URL params with defaults and ignores garbage', () => {
    const f = parseFilters(new URLSearchParams('category=jeans&size=M,XL,32&minPrice=-5&maxPrice=9000&sort=bogus&page=0'))
    expect(f).toEqual({
      q: '',
      gender: undefined,
      category: ['jeans'],
      color: [],
      size: ['M', 'XL', '32'],
      minPrice: undefined,
      maxPrice: 9000,
      sort: 'newest',
      page: 1,
    })
  })

  it('no longer filters by brand (old links with ?brand= are ignored)', () => {
    const f = parseFilters(new URLSearchParams('brand=levis,barbour&color=Blue'))
    expect(f).not.toHaveProperty('brand')
    expect(filtersToParams(f).toString()).toBe('color=Blue')
  })

  it('round-trips through URL params, omitting defaults', () => {
    const f = parseFilters(new URLSearchParams('q=air&category=running&color=Black&sort=price_asc&page=3'))
    expect(filtersToParams(f).toString()).toBe('q=air&category=running&color=Black&sort=price_asc&page=3')
    expect(filtersToParams(parseFilters(new URLSearchParams())).toString()).toBe('')
  })

  it('counts active filters and toggles values', () => {
    expect(activeFilterCount(parseFilters(new URLSearchParams('category=a,b&size=M&minPrice=100')))).toBe(4)
    expect(toggle(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggle(['a'], 'b')).toEqual(['a', 'b'])
  })
})
