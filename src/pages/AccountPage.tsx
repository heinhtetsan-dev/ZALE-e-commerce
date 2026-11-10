import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context'
import { passwordSchema, profileSchema } from '../auth/schemas'
import { FormField } from '../components/FormField'
import { ErrorBox, Notice, PageTitle } from '../components/ui'
import { api, ApiError, errorMessage } from '../lib/api'
import { formatDate } from '../lib/format'
import { fieldErrorsOf } from '../lib/forms'
import type { User } from '../lib/types'

function ProfileForm({ user }: { user: User }) {
  const { setUser } = useAuth()
  const [name, setName] = useState(user.name)
  const [error, setError] = useState<string>()
  const save = useMutation({
    mutationFn: (n: string) => api<{ user: User }>('/auth/me', { method: 'PATCH', body: { name: n } }),
    onSuccess: ({ user: u }) => setUser(u),
  })

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const parsed = profileSchema.safeParse({ name })
        if (!parsed.success) return setError(fieldErrorsOf(parsed.error).name)
        setError(undefined)
        save.mutate(parsed.data.name)
      }}
    >
      <FormField id="profile-name" label="Name" value={name} error={error} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <FormField id="profile-email" label="Email" value={user.email} disabled readOnly />
      {save.isSuccess && <Notice tone="success">Profile updated.</Notice>}
      {save.isError && <ErrorBox message={errorMessage(save.error)} />}
      <button type="submit" className="btn-primary" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const empty = { currentPassword: '', newPassword: '', confirm: '' }
  const [values, setValues] = useState(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const change = useMutation({
    mutationFn: (v: { currentPassword: string; newPassword: string }) => api<void>('/auth/change-password', { method: 'POST', body: v }),
    onSuccess: () => setValues(empty),
    onError: (err) => {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    },
  })
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: e.target.value })

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const parsed = passwordSchema.safeParse(values)
        if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error))
        setErrors({})
        change.mutate({ currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword })
      }}
    >
      <FormField id="currentPassword" label="Current password" type="password" autoComplete="current-password" value={values.currentPassword} error={errors.currentPassword} onChange={set('currentPassword')} />
      <FormField id="newPassword" label="New password" type="password" autoComplete="new-password" value={values.newPassword} error={errors.newPassword} onChange={set('newPassword')} />
      <FormField id="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" value={values.confirm} error={errors.confirm} onChange={set('confirm')} />
      {change.isSuccess && <Notice tone="success">Password changed.</Notice>}
      {change.isError && !Object.keys(errors).length && <ErrorBox message={errorMessage(change.error)} />}
      <button type="submit" className="btn-secondary" disabled={change.isPending}>
        {change.isPending ? 'Updating…' : 'Change password'}
      </button>
    </form>
  )
}

export function AccountPage() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle subtitle={`Member since ${formatDate(user.createdAt)}`}>My account</PageTitle>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link to="/account/orders" className="card flex items-center justify-between p-4 font-semibold hover:bg-stone-50">
          Order history <span aria-hidden>→</span>
        </Link>
        <Link to="/wishlist" className="card flex items-center justify-between p-4 font-semibold hover:bg-stone-50">
          Wishlist <span aria-hidden>→</span>
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <ProfileForm user={user} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Password</h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  )
}
