import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context'
import { registerSchema } from '../auth/schemas'
import { FormField } from '../components/FormField'
import { ErrorBox } from '../components/ui'
import { ApiError, errorMessage } from '../lib/api'
import { fieldErrorsOf, redirectTarget } from '../lib/forms'

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user && !submitting) return <Navigate to={redirectTarget(location.state)} replace />

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const parsed = registerSchema.safeParse(values)
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error))
    setErrors({})
    setSubmitting(true)
    try {
      await register(parsed.data.name, parsed.data.email, parsed.data.password)
      navigate(redirectTarget(location.state), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setErrors({ email: 'An account with this email already exists' })
      else if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors)
      else setFormError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-stone-600">Your bag will be saved to your account.</p>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {formError && <ErrorBox title="Could not create account" message={formError} />}
          <FormField id="name" label="Name" autoComplete="name" value={values.name} error={errors.name} onChange={set('name')} />
          <FormField id="email" label="Email" type="email" autoComplete="email" value={values.email} error={errors.email} onChange={set('email')} />
          <FormField id="password" label="Password" type="password" autoComplete="new-password" value={values.password} error={errors.password} onChange={set('password')} />
          <FormField id="confirm" label="Confirm password" type="password" autoComplete="new-password" value={values.confirm} error={errors.confirm} onChange={set('confirm')} />
          <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-stone-900 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
