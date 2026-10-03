import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import JobList from './pages/JobList.jsx'
import JobDetail from './pages/JobDetail.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminApplications from './pages/AdminApplications.jsx'

function Protected({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">Job Board</Link>
          <nav>
            <NavLink to="/" end>Jobs</NavLink>
            {isAdmin ? (
              <>
                <NavLink to="/admin">Dashboard</NavLink>
                <button
                  className="link-btn"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink to="/admin/login">Admin</NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
          <Route path="/admin/jobs/:id" element={<Protected><AdminApplications /></Protected>} />
          <Route path="*" element={<p className="empty">Page not found. <Link to="/">Back to jobs</Link></p>} />
        </Routes>
      </main>
    </>
  )
}
