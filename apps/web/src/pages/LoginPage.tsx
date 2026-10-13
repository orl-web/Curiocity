import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'
import SEO from '../components/SEO'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.loginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] dark:bg-[#161614] flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <SEO title="Login" description="Sign in to your CurioCity account" />
      <div className="w-full max-w-[400px] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
            Curio<span className="text-[var(--color-primary)]">City</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2" style={{ color: 'var(--text-secondary)' }}>{t('auth.signInSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('common.email')}</label>
            <input
              id="login-email"
              type="email"
              value={email}
              aria-required="true"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('common.password')}</label>
            <input
              id="login-password"
              type="password"
              value={password}
              aria-required="true"
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50"
          >
            {isLoading ? t('auth.signingIn') : t('common.signIn')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[var(--text-secondary)]" style={{ color: 'var(--text-secondary)' }}>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-[var(--color-primary)] font-bold no-underline">{t('common.signUp')}</Link>
        </div>
        <div className="mt-3 text-center">
          <button
            onClick={() => { localStorage.setItem('onboarding_complete', 'true'); navigate('/'); }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer underline"
          >
            {t('auth.skipOffline')}
          </button>
        </div>
      </div>
    </div>
  )
}
