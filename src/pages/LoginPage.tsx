import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context'
import { loginSchema } from '../auth/schemas'
import { FormField } from '../components/FormField'
import { ErrorBox } from '../components/ui'
import { errorMessage } from '../lib/api'
import { fieldErrorsOf, redirectTarget } from '../lib/forms'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user && !submitting) return <Navigate to={redirectTarget(location.state)} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const parsed = loginSchema.safeParse(values)
    if (!parsed.success) return setErrors(fieldErrorsOf(parsed.error))
    setErrors({})
    setSubmitting(true)
    try {
      const u = await login(parsed.data.email, parsed.data.password)
      navigate(u.role === 'ADMIN' && redirectTarget(location.state) === '/' ? '/admin' : redirectTarget(location.state), { replace: true })
    } catch (err) {
      setFormError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-stone-600">Log in to check out, track orders and save favourites.</p>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {formError && <ErrorBox title="Could not log in" message={formError} />}
          <FormField id="email" label="Email" type="email" autoComplete="email" value={values.email} error={errors.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            error={errors.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
          />
          <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-600">
          New here?{' '}
          <Link to="/register" state={location.state} className="font-semibold text-stone-900 underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
