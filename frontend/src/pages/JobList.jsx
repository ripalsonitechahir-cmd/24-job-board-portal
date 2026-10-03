import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { Pagination, fmtDate, fmtSalary } from '../components.jsx'

export default function JobList() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const location = params.get('location') || ''
  const type = params.get('type') || ''
  const page = Number(params.get('page')) || 1

  const [form, setForm] = useState({ q, location, type })
  const [types, setTypes] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.meta().then((m) => setTypes(m.types)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .listJobs({ q, location, type, page })
      .then((d) => !cancelled && (setData(d), setError('')))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [q, location, type, page])

  const apply = (next) => {
    const p = {}
    Object.entries(next).forEach(([k, v]) => v && (p[k] = v))
    setParams(p)
  }
  const onSubmit = (e) => {
    e.preventDefault()
    apply({ ...form, page: '' })
  }
  const onReset = () => {
    setForm({ q: '', location: '', type: '' })
    setParams({})
  }

  return (
    <>
      <h1>Find your next job</h1>
      <form className="filters" onSubmit={onSubmit}>
        <input placeholder="Keyword (title, company…)" value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} aria-label="Keyword" />
        <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} aria-label="Location" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="Job type">
          <option value="">All types</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button type="submit" className="btn">Search</button>
        <button type="button" className="btn btn-ghost" onClick={onReset}>Reset</button>
      </form>

      {error && <p className="alert alert-error">{error}</p>}
      {loading && !data && <p className="empty">Loading jobs…</p>}
      {data && (
        <>
          <p className="muted">{data.total} job{data.total === 1 ? '' : 's'} found</p>
          {data.jobs.length === 0 ? (
            <p className="empty">No jobs match your search.</p>
          ) : (
            <ul className="cards">
              {data.jobs.map((j) => (
                <li key={j.id} className="card">
                  <div>
                    <h2><Link to={`/jobs/${j.id}`}>{j.title}</Link></h2>
                    <p>{j.company} · {j.location}</p>
                    <p className="muted">{fmtSalary(j)} · Posted {fmtDate(j.created_at)}</p>
                  </div>
                  <span className="tag">{j.type}</span>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(n) => apply({ q, location, type, page: n > 1 ? String(n) : '' })} />
        </>
      )}
    </>
  )
}
