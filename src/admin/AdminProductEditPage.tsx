import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FormField } from '../components/FormField'
import { ErrorBox, FieldError, Notice, Spinner } from '../components/ui'
import { api, ApiError, errorMessage } from '../lib/api'
import { fieldErrorsOf } from '../lib/forms'
import { productFormSchema, variantsSchema, type ProductFormValues } from './productForm'
import type { AdminProduct, Lookup } from './types'

const emptyForm: ProductFormValues = {
  name: '',
  slug: '',
  description: '',
  brandId: '',
  categoryId: '',
  color: '',
  colorway: '',
  gender: 'UNISEX',
  styleGroup: '',
  price: '',
  images: '',
  imageCredit: '',
  imageSourceUrl: '',
  isActive: true,
}

const toForm = (p: AdminProduct): ProductFormValues => ({
  name: p.name,
  slug: p.slug,
  description: p.description,
  brandId: p.brandId ?? p.brand.id,
  categoryId: p.categoryId ?? p.category.id,
  color: p.color,
  colorway: p.colorway ?? '',
  gender: p.gender,
  styleGroup: p.styleGroup ?? '',
  price: (p.priceCents / 100).toFixed(2),
  images: (p.imageRefs ?? p.images).join('\n'),
  imageCredit: p.imageCredit ?? '',
  imageSourceUrl: p.imageSourceUrl ?? '',
  isActive: p.isActive,
})

function ProductForm({ product, brands, categories }: { product?: AdminProduct; brands: Lookup[]; categories: Lookup[] }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<ProductFormValues>(product ? toForm(product) : emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: (body: unknown) =>
      product ? api<AdminProduct>(`/admin/products/${product.id}`, { method: 'PATCH', body }) : api<AdminProduct>('/admin/products', { method: 'POST', body }),
    onSuccess: (p) => {
      queryClient.setQueryData(['admin', 'product', p.id], p)
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['facets'] })
      setSaved(true)
      if (!product) navigate(`/admin/products/${p.id}`, { replace: true, state: { created: true } })
    },
    onError: (err) => {
      if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k === 'priceCents' ? 'price' : k.replace(/^images\.\d+$/, 'images'), v])))
    },
  })

  const set = (key: keyof ProductFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSaved(false)
    setValues({ ...values, [key]: e.target.value })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = productFormSchema.safeParse(values)
    if (!parsed.success) return setErrors(Object.fromEntries(Object.entries(fieldErrorsOf(parsed.error)).map(([k, v]) => [k.replace(/^images\.\d+$/, 'images'), v])))
    setErrors({})
    const { price, ...rest } = parsed.data
    save.mutate({ ...rest, priceCents: price })
  }

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5">
      <h2 className="text-lg font-semibold">Details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="name" label="Name" value={values.name} error={errors.name} onChange={set('name')} />
        <FormField id="slug" label="URL slug (optional)" placeholder="auto from name" value={values.slug} error={errors.slug} onChange={set('slug')} />
        <div>
          <label className="label" htmlFor="brandId">
            Brand
          </label>
          <select id="brandId" className="input" value={values.brandId} onChange={set('brandId')} aria-invalid={!!errors.brandId}>
            <option value="">Choose…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.brandId} />
        </div>
        <div>
          <label className="label" htmlFor="categoryId">
            Category
          </label>
          <select id="categoryId" className="input" value={values.categoryId} onChange={set('categoryId')} aria-invalid={!!errors.categoryId}>
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError message={errors.categoryId} />
        </div>
        <div>
          <label className="label" htmlFor="gender">
            Gender
          </label>
          <select id="gender" className="input" value={values.gender} onChange={set('gender')}>
            <option value="MEN">Men's</option>
            <option value="WOMEN">Women's</option>
            <option value="UNISEX">Unisex (listed under both)</option>
          </select>
        </div>
        <FormField id="price" label="Price (USD)" inputMode="decimal" value={values.price} error={errors.price} onChange={set('price')} />
        <FormField id="color" label="Base color (for filters)" placeholder="e.g. White" value={values.color} error={errors.color} onChange={set('color')} />
        <FormField id="colorway" label="Colorway name" placeholder="e.g. White/Black-Infrared" value={values.colorway} error={errors.colorway} onChange={set('colorway')} />
        <div className="sm:col-span-2">
          <FormField
            id="styleGroup"
            label="Style group (links colorways of the same model)"
            placeholder="e.g. air-max-90"
            value={values.styleGroup}
            error={errors.styleGroup}
            onChange={set('styleGroup')}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea id="description" rows={4} className="input" value={values.description} onChange={set('description')} aria-invalid={!!errors.description} />
        <FieldError message={errors.description} />
      </div>
      <div>
        <label className="label" htmlFor="images">
          Images (one CDN URL or object key per line)
        </label>
        <textarea id="images" rows={3} className="input font-mono text-xs" value={values.images} onChange={set('images')} placeholder="https://cdn.example.com/products/shoe.jpg" aria-invalid={!!errors.images} />
        <FieldError message={errors.images} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="imageCredit" label="Photo credit (required by CC licenses)" placeholder="Photo: Jane Doe, CC BY-SA 4.0" value={values.imageCredit} error={errors.imageCredit} onChange={set('imageCredit')} />
        <FormField id="imageSourceUrl" label="Photo source URL" placeholder="https://commons.wikimedia.org/wiki/File:…" value={values.imageSourceUrl} error={errors.imageSourceUrl} onChange={set('imageSourceUrl')} />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-stone-900"
          checked={values.isActive}
          onChange={(e) => {
            setSaved(false)
            setValues({ ...values, isActive: e.target.checked })
          }}
        />
        Visible in the shop
      </label>
      {save.isError && !Object.keys(errors).length && <ErrorBox message={errorMessage(save.error)} />}
      {saved && product && <Notice tone="success">Product saved.</Notice>}
      <button type="submit" className="btn-primary" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
      </button>
    </form>
  )
}

interface SizeRow {
  key: number
  size: string
  stock: string
}

let rowKey = 0

function StockEditor({ product }: { product: AdminProduct }) {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<SizeRow[]>(() => product.variants.map((v) => ({ key: rowKey++, size: String(v.size), stock: String(v.stock) })))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: (variants: Array<{ size: number; stock: number }>) => api<AdminProduct>(`/admin/products/${product.id}/variants`, { method: 'PUT', body: { variants } }),
    onSuccess: (p) => {
      queryClient.setQueryData(['admin', 'product', p.id], p)
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['product', p.slug] })
      setRows(p.variants.map((v) => ({ key: rowKey++, size: String(v.size), stock: String(v.stock) })))
      setSaved(true)
    },
  })

  const update = (key: number, field: 'size' | 'stock', value: string) => {
    setSaved(false)
    setRows(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = variantsSchema.safeParse(rows.map((r) => ({ size: r.size === '' ? NaN : Number(r.size), stock: r.stock === '' ? NaN : Number(r.stock) })))
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error))
    setErrors({})
    save.mutate(parsed.data)
  }

  const total = rows.reduce((n, r) => n + (Number(r.stock) || 0), 0)

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Stock per size</h2>
        <span className="text-sm text-stone-600">{total} pairs total</span>
      </div>
      <p className="text-xs text-stone-500">Set the absolute stock for each EU size. Removing a size that has been ordered sets its stock to 0 instead.</p>
      {rows.length === 0 && <p className="text-sm text-stone-600">No sizes yet.</p>}
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-start gap-2">
            <div className="w-24">
              <label className="sr-only" htmlFor={`size-${r.key}`}>
                Size
              </label>
              <input id={`size-${r.key}`} className="input" inputMode="decimal" placeholder="Size" value={r.size} onChange={(e) => update(r.key, 'size', e.target.value)} aria-invalid={!!errors[`${i}.size`]} />
              <FieldError message={errors[`${i}.size`]} />
            </div>
            <div className="flex-1">
              <label className="sr-only" htmlFor={`stock-${r.key}`}>
                Stock for size {r.size}
              </label>
              <input id={`stock-${r.key}`} className="input" inputMode="numeric" placeholder="Stock" value={r.stock} onChange={(e) => update(r.key, 'stock', e.target.value)} aria-invalid={!!errors[`${i}.stock`]} />
              <FieldError message={errors[`${i}.stock`]} />
            </div>
            <button type="button" className="btn-ghost px-3 text-red-700" aria-label={`Remove size ${r.size}`} onClick={() => setRows(rows.filter((x) => x.key !== r.key))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <FieldError message={errors['']} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => setRows([...rows, { key: rowKey++, size: '', stock: '0' }])}>
          + Add size
        </button>
        <button type="submit" className="btn-primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save stock'}
        </button>
      </div>
      {save.isError && <ErrorBox message={errorMessage(save.error)} />}
      {saved && <Notice tone="success">Stock updated.</Notice>}
    </form>
  )
}

export function AdminProductEditPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const brands = useQuery({ queryKey: ['admin', 'brands'], queryFn: () => api<{ items: Lookup[] }>('/admin/brands').then((r) => r.items), staleTime: Infinity })
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: () => api<{ items: Lookup[] }>('/admin/categories').then((r) => r.items), staleTime: Infinity })
  const product = useQuery({ queryKey: ['admin', 'product', id], queryFn: () => api<AdminProduct>(`/admin/products/${id}`), enabled: !isNew })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const remove = useMutation({
    mutationFn: () => api<{ deleted: boolean; deactivated: boolean }>(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate('/admin/products', { replace: true })
    },
  })

  if (brands.isPending || categories.isPending || (!isNew && product.isPending)) return <Spinner />
  const loadError = brands.error ?? categories.error ?? product.error
  if (loadError) return <ErrorBox message={errorMessage(loadError)} />

  return (
    <div>
      <Link to="/admin/products" className="text-sm text-stone-600 hover:underline">
        ← All products
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold sm:text-3xl">{isNew ? 'New product' : product.data!.name}</h1>
        {!isNew && product.data!.isActive && (
          <Link to={`/products/${product.data!.slug}`} className="btn-ghost">
            View in shop ↗
          </Link>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <ProductForm key={product.data?.id ?? 'new'} product={product.data} brands={brands.data!} categories={categories.data!} />
        {!isNew && (
          <div className="space-y-6">
            <StockEditor key={product.data!.id} product={product.data!} />
            <section className="card space-y-3 p-5">
              <h2 className="text-lg font-semibold text-red-700">Delete product</h2>
              <p className="text-sm text-stone-600">Products that have been ordered are hidden instead of deleted, so order history stays intact.</p>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <button type="button" className="btn-danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
                    Yes, delete
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" className="btn-secondary text-red-700" onClick={() => setConfirmDelete(true)}>
                  Delete…
                </button>
              )}
              {remove.isError && <ErrorBox message={errorMessage(remove.error)} />}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
