import { useState, useEffect } from 'react'

const TOKEN_KEY = 'text2graph.token'

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY))

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken('')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  async function authRequest(path, body) {
    const res = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail || 'Something went wrong. Please try again.')
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    setToken(data.token)
    return data
  }

  const login = (email, password) => authRequest('login', { email, password })
  const register = (payload) => authRequest('register', payload)
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setUser(null)
  }

  return { user, token, loading, login, register, logout }
}
