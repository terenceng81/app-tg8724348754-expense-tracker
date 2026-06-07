'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
export default function AuthPage() {
  const { data: session, isPending } = authClient.useSession()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) window.location.href = '/app'
  }, [session])

  if (isPending || session) {
    return (
      <div className="boot-screen">
        <div className="boot-inner">
          <div className="boot-logo">Led<em>ger</em></div>
          <div className="boot-spinner" />
        </div>
      </div>
    )
  }

  const isSignup = mode === 'signup'

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = isSignup
        ? await authClient.signUp.email({
            email: email.trim(),
            password,
            name: email.split('@')[0],
          })
        : await authClient.signIn.email({
            email: email.trim(),
            password,
          })

      if (result?.error) {
        setError(result.error.message || 'Something went wrong. Try again.')
        return
      }
      window.location.href = '/app'
    } catch (err) {
      setError(err?.message || 'Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      {/* Left editorial panel */}
      <div className="auth-left">
        <div className="auth-logo-mark">
          <span className="hexmark">⬡</span>
          Ledger
        </div>

        <div className="auth-headline anim-1">
          <h1>Know where<br /><em>your money</em><br />really goes.</h1>
          <p>
            Log expenses in seconds, visualise your spending by category,
            and understand your habits every month.
          </p>
        </div>

        <div className="auth-features anim-2">
          <div className="auth-feat"><span className="feat-dot" />Track expenses with categories &amp; notes</div>
          <div className="auth-feat"><span className="feat-dot" />Monthly summary with live chart breakdown</div>
          <div className="auth-feat"><span className="feat-dot" />Private — your data, always</div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-right">
        <div className="auth-form-box anim-2">
          <h2>{isSignup ? 'Create account' : 'Welcome back'}</h2>
          <p className="auth-sub">
            {isSignup
              ? 'Start tracking your spending today.'
              : 'Sign in to see your expense history.'}
          </p>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${!isSignup ? 'active' : ''}`}
              onClick={() => { setMode('signin'); setError('') }}
            >
              Sign in
            </button>
            <button
              className={`auth-tab ${isSignup ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError('') }}
            >
              Sign up
            </button>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="field-group">
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="field-group">
              <label>Password</label>
              <input
                type="password"
                placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={isSignup ? 8 : 1}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </div>
            {error && <p className="form-error">⚠ {error}</p>}
            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : isSignup ? 'Create my account →' : 'Sign in →'}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button
              className="link-btn"
              onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setError('') }}
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
