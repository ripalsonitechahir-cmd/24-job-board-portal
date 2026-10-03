export const fmtSalary = (j) => {
  const f = (n) => `$${n.toLocaleString('en-US')}`
  if (j.salary_min != null && j.salary_max != null) return `${f(j.salary_min)} – ${f(j.salary_max)}`
  if (j.salary_min != null) return `From ${f(j.salary_min)}`
  if (j.salary_max != null) return `Up to ${f(j.salary_max)}`
  return 'Salary not specified'
}

export const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

export const StatusBadge = ({ status }) => <span className={`badge badge-${status}`}>{status}</span>

export const Field = ({ label, error, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {error && <small className="error" role="alert">{error}</small>}
  </label>
)

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  )
}
