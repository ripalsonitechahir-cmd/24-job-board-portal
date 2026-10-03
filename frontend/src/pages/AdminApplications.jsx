import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth.jsx'
import { StatusBadge, fmtDate } from '../components.jsx'

export default function AdminApplications() {
  const { id } = useParams()
  const { logout } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .applications(id)
      .then(setData)
      .catch((e) => {
        if (e.status === 401) logout()
        setError(e.status === 404 ? 'Job not found.' : e.message)
      })
  }, [id, logout])

  if (error) return <p className="alert alert-error">{error} <Link to="/admin">Back</Link></p>
  if (!data) return <p className="empty">Loading…</p>
  const { job, applications } = data

  return (
    <>
      <p><Link to="/admin">← Dashboard</Link></p>
      <div className="row-between">
        <h1>Applications: {job.title}</h1>
        <StatusBadge status={job.status} />
      </div>
      <p className="muted">{job.company} · {job.location}</p>
      <section className="panel">
        {applications.length === 0 ? <p className="empty">No applications yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Candidate</th><th>Email</th><th>Resume</th><th>Note</th><th>Applied</th></tr></thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id}>
                    <td>{a.candidate_name}</td>
                    <td><a href={`mailto:${a.email}`}>{a.email}</a></td>
                    <td><a href={a.resume_url} target="_blank" rel="noopener noreferrer">Open resume</a></td>
                    <td className="prewrap">{a.note || '—'}</td>
                    <td>{fmtDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
