import { useState } from 'react'
import OscilloscopeBG from '../components/OscilloscopeBG'

export default function AuthForm({ mode, auth, onBack, onSwitch }) {
  const isRegister = mode === 'register'
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isRegister) {
        await auth.register({ first_name: first, last_name: last, email, password })
      } else {
        await auth.login(email, password)
      }
      // success unmounts this component (App re-renders into the app)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="scene">
      <OscilloscopeBG />
      <div className={`auth-wrap ${isRegister ? 'register' : ''}`}>
        <form className="auth-card" onSubmit={submit}>
          <button type="button" className="auth-back" onClick={onBack}>← back</button>
          <h2 className="auth-title">{isRegister ? 'Create your account' : 'Welcome back'}</h2>

          {isRegister && (
            <div className="auth-grid2">
              <label>
                First name
                <input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" required />
              </label>
              <label>
                Last name
                <input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" required />
              </label>
            </div>
          )}

          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 6 : undefined}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>

          <p className="auth-switch">
            {isRegister ? 'Already a member?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => onSwitch(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Log in' : 'Register'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
