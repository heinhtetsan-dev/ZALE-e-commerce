import { describe, expect, it } from 'vitest'
import { fillDays } from './chartData'
import { productFormSchema, variantsSchema } from './productForm'

describe('productFormSchema', () => {
  const base = {
    name: 'Shoe',
    slug: '',
    description: 'Nice',
    brandId: 'b',
    categoryId: 'c',
    color: 'Red',
    colorway: 'University Red/White',
    gender: 'MEN' as const,
    styleGroup: 'hoodie',
    price: '129.99',
    images: 'https://cdn.x/a.jpg\n\nproducts/b.jpg',
    imageCredit: '',
    imageSourceUrl: '',
    isActive: true,
  }

  it('converts price to cents, splits images and drops an empty slug', () => {
    const r = productFormSchema.parse(base)
    expect(r).toMatchObject({ price: 12999, slug: undefined, images: ['https://cdn.x/a.jpg', 'products/b.jpg'] })
  })

  it('rejects bad prices, slugs and image URLs', () => {
    expect(productFormSchema.safeParse({ ...base, price: '12.345' }).success).toBe(false)
    expect(productFormSchema.safeParse({ ...base, slug: 'Bad Slug' }).success).toBe(false)
    expect(productFormSchema.safeParse({ ...base, images: 'http://insecure/a.jpg' }).success).toBe(false)
    expect(productFormSchema.safeParse({ ...base, styleGroup: 'Air Max' }).success).toBe(false)
    expect(productFormSchema.safeParse({ ...base, imageSourceUrl: 'http://x.org/a' }).success).toBe(false)
  })
})

describe('variantsSchema', () => {
  it('requires unique size labels and non-negative integer stock', () => {
    expect(variantsSchema.safeParse([{ size: 'M', stock: 3 }, { size: '32', stock: 1 }, { size: 'One Size', stock: 2 }]).success).toBe(true)
    expect(variantsSchema.safeParse([{ size: '', stock: 3 }]).success).toBe(false)
    expect(variantsSchema.safeParse([{ size: 'M<script>', stock: 3 }]).success).toBe(false)
    expect(variantsSchema.safeParse([{ size: 'M', stock: -1 }]).success).toBe(false)
    expect(variantsSchema.safeParse([{ size: 'M', stock: 1 }, { size: 'm', stock: 2 }]).success).toBe(false)
  })
})

describe('fillDays', () => {
  it('fills gaps with zero days across the range', () => {
    const days = fillDays('2026-03-01T10:00:00Z', '2026-03-04T09:00:00Z', [{ date: '2026-03-02', revenueCents: 500, orders: 1 }])
    expect(days.map((d) => [d.date, d.revenueCents])).toEqual([
      ['2026-03-01', 0],
      ['2026-03-02', 500],
      ['2026-03-03', 0],
      ['2026-03-04', 0],
    ])
  })
})
