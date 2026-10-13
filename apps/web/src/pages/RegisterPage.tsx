import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'
import SEO from '../components/SEO'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { t } = useI18n()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      // register() also uploads any guide draft the visitor built while signed
      // out; pass the count along so the Explore page can confirm it.
      const { published } = await register(formData)
      navigate(published > 0 ? `/?published=${published}` : '/')
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.registerFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] dark:bg-[#161614] flex items-center justify-center p-4">
      <SEO title="Register" description="Create your CurioCity account and start exploring" />
      <div className="w-full max-w-[400px] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">
            Curio<span className="text-[var(--color-primary)]">City</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">{t('auth.createSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-displayname" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('auth.displayName')}</label>
            <input
              id="register-displayname"
              type="text"
              name="displayName"
              value={formData.displayName}
              aria-required="true"
              onChange={handleChange}
              required
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-username" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('auth.username')}</label>
            <input
              id="register-username"
              type="text"
              name="username"
              value={formData.username}
              aria-required="true"
              onChange={handleChange}
              required
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-email" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('common.email')}</label>
            <input
              id="register-email"
              type="email"
              name="email"
              value={formData.email}
              aria-required="true"
              onChange={handleChange}
              required
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-password" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('common.password')}</label>
            <input
              id="register-password"
              type="password"
              name="password"
              value={formData.password}
              aria-required="true"
              onChange={handleChange}
              required
              minLength={8}
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50"
          >
            {isLoading ? t('auth.signingUp') : t('auth.createCta')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[var(--text-secondary)]">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-[var(--color-primary)] font-bold no-underline">{t('common.signIn')}</Link>
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
