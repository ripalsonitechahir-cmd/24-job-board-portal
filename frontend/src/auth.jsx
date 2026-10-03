import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken())
  const login = useCallback((t) => {
    setToken(t)
    setTokenState(t)
  }, [])
  const logout = useCallback(() => {
    setToken(null)
    setTokenState(null)
  }, [])
  const value = useMemo(() => ({ isAdmin: !!token, login, logout }), [token, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
