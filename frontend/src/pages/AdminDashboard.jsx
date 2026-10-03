import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../auth.jsx'
import { Field, Pagination, StatusBadge, fmtDate } from '../components.jsx'

const EMPTY = { title: '', company: '', location: '', type: 'Full-time', salary_min: '', salary_max: '', description: '' }

function validate(f) {
  const e = {}
  for (const k of ['title', 'company', 'location', 'description']) if (!f[k].trim()) e[k] = 'This field is required'
  const min = f.salary_min === '' ? null : Number(f.salary_min)
  const max = f.salary_max === '' ? null : Number(f.salary_max)
  if (min != null && (!Number.isInteger(min) || min < 0)) e.salary_min = 'Enter a whole number ≥ 0'
  if (max != null && (!Number.isInteger(max) || max < 0)) e.salary_max = 'Enter a whole number ≥ 0'
  if (!e.salary_min && !e.salary_max && min != null && max != null && min > max) e.salary_max = 'Max must be ≥ min'
  return e
}

function PostJob({ types, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      await api.createJob(form)
      setForm(EMPTY)
      onCreated()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(err.errors)
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2>Post a job</h2>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="grid2">
        <Field label="Title" error={errors.title}><input value={form.title} onChange={set('title')} maxLength={150} /></Field>
        <Field label="Company" error={errors.company}><input value={form.company} onChange={set('company')} maxLength={150} /></Field>
        <Field label="Location" error={errors.location}><input value={form.location} onChange={set('location')} maxLength={150} /></Field>
        <Field label="Type" error={errors.type}>
          <select value={form.type} onChange={set('type')}>{types.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Salary min" error={errors.salary_min}><input type="number" min="0" value={form.salary_min} onChange={set('salary_min')} /></Field>
        <Field label="Salary max" error={errors.salary_max}><input type="number" min="0" value={form.salary_max} onChange={set('salary_max')} /></Field>
      </div>
      <Field label="Description" error={errors.description}><textarea rows={4} value={form.description} onChange={set('description')} maxLength={5000} /></Field>
      <button className="btn" disabled={busy}>{busy ? 'Posting…' : 'Post job'}</button>
    </form>
  )
}

export default function AdminDashboard() {
  const { logout } = useAuth()
  const [types, setTypes] = useState([])
  const [statuses, setStatuses] = useState([])
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(
    (p = page) =>
      api
        .listJobs({ status: 'all', page: p })
        .then((d) => (setData(d), setError('')))
        .catch((e) => {
          if (e.status === 401) logout()
          setError(e.message)
        }),
    [page, logout],
  )

  useEffect(() => {
    api.meta().then((m) => (setTypes(m.types), setStatuses(m.statuses))).catch(() => {})
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const changeStatus = async (id, status) => {
    try {
      await api.setStatus(id, status)
      load()
    } catch (e) {
      if (e.status === 401) logout()
      setError(e.message)
    }
  }

  return (
    <>
      <h1>Admin dashboard</h1>
      {types.length > 0 && <PostJob types={types} onCreated={() => (page === 1 ? load(1) : setPage(1))} />}
      {error && <p className="alert alert-error">{error}</p>}
      <section className="panel">
        <h2>All jobs {data && <span className="muted">({data.total})</span>}</h2>
        {!data ? <p className="empty">Loading…</p> : data.jobs.length === 0 ? <p className="empty">No jobs yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Title</th><th>Company</th><th>Posted</th><th>Status</th><th>Applications</th><th>Change status</th></tr>
              </thead>
              <tbody>
                {data.jobs.map((j) => (
                  <tr key={j.id}>
                    <td><Link to={`/jobs/${j.id}`}>{j.title}</Link></td>
                    <td>{j.company}</td>
                    <td>{fmtDate(j.created_at)}</td>
                    <td><StatusBadge status={j.status} /></td>
                    <td><Link to={`/admin/jobs/${j.id}`}>View ({j._count.applications})</Link></td>
                    <td>
                      <select value={j.status} onChange={(e) => changeStatus(j.id, e.target.value)} aria-label={`Status for ${j.title}`}>
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      </section>
    </>
  )
}
