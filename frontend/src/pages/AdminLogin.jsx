import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth.jsx'
import { Field } from '../components.jsx'

export default function AdminLogin() {
  const { isAdmin, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAdmin) return <Navigate to="/admin" replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const v = {}
    if (!form.username.trim()) v.username = 'Username is required'
    if (!form.password) v.password = 'Password is required'
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      const { token } = await api.login(form)
      login(token)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel narrow">
      <h1>Admin login</h1>
      {error && <p className="alert alert-error">{error}</p>}
      <form onSubmit={submit} noValidate>
        <Field label="Username" error={errors.username}>
          <input autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
