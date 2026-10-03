import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { Field, StatusBadge, fmtDate, fmtSalary } from '../components.jsx'

const EMPTY = { candidate_name: '', email: '', resume_url: '', note: '' }

function validate(f) {
  const e = {}
  if (!f.candidate_name.trim()) e.candidate_name = 'Name is required'
  if (!f.email.trim()) e.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Email is invalid'
  if (!f.resume_url.trim()) e.resume_url = 'Resume link is required'
  else if (!/^https?:\/\/\S+\.\S+/i.test(f.resume_url.trim())) e.resume_url = 'Resume link must be a valid http(s) URL'
  if (f.note.length > 2000) e.note = 'Note is too long'
  return e
}

export default function JobDetail() {
  const { id } = useParams()
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setJob(null)
    setError('')
    api.getJob(id).then(setJob).catch((e) => setError(e.status === 404 ? 'Job not found.' : e.message))
  }, [id])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) return
    setSubmitting(true)
    try {
      await api.apply(id, form)
      setDone(true)
      setForm(EMPTY)
    } catch (err) {
      if (err instanceof ApiError && err.errors && Object.keys(err.errors).length) setErrors(err.errors)
      else setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <p className="alert alert-error">{error} <Link to="/">Back to jobs</Link></p>
  if (!job) return <p className="empty">Loading…</p>

  return (
    <>
      <p><Link to="/">← All jobs</Link></p>
      <article className="panel">
        <div className="row-between">
          <h1>{job.title}</h1>
          <StatusBadge status={job.status} />
        </div>
        <p>{job.company} · {job.location} · <span className="tag">{job.type}</span></p>
        <p className="muted">{fmtSalary(job)} · Posted {fmtDate(job.created_at)}</p>
        <h3>Description</h3>
        <p className="prewrap">{job.description}</p>
      </article>

      <section className="panel">
        <h2>Apply for this job</h2>
        {job.status !== 'open' ? (
          <p className="alert alert-warn">This job is {job.status} and is no longer accepting applications.</p>
        ) : done ? (
          <p className="alert alert-ok">Thanks! Your application has been submitted. <button className="link-btn" onClick={() => setDone(false)}>Submit another</button></p>
        ) : (
          <form onSubmit={submit} noValidate>
            {formError && <p className="alert alert-error">{formError}</p>}
            <Field label="Full name" error={errors.candidate_name}>
              <input value={form.candidate_name} onChange={set('candidate_name')} maxLength={120} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input type="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Resume link (URL)" error={errors.resume_url}>
              <input type="url" placeholder="https://…" value={form.resume_url} onChange={set('resume_url')} />
            </Field>
            <Field label="Note (optional)" error={errors.note}>
              <textarea rows={4} value={form.note} onChange={set('note')} maxLength={2000} />
            </Field>
            <button className="btn" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'}</button>
          </form>
        )}
      </section>
    </>
  )
}
