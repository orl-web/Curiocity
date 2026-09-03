import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
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
      await register(formData)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] dark:bg-[#161614] flex items-center justify-center p-4">
      <SEO title="Register" description="Create your CurioCity account and start exploring" />
      <div className="w-full max-w-[400px] bg-white dark:bg-[#1e1e1c] rounded-xl border border-black/10 dark:border-white/9 p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1D9E75]">
            Curio<span className="text-[#1D9E75]">City</span>
          </h1>
          <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-displayname" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Display Name</label>
            <input
              id="register-displayname"
              type="text"
              name="displayName"
              value={formData.displayName}
              aria-required="true"
              onChange={handleChange}
              required
              className="bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-username" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Username</label>
            <input
              id="register-username"
              type="text"
              name="username"
              value={formData.username}
              aria-required="true"
              onChange={handleChange}
              required
              className="bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-email" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Email</label>
            <input
              id="register-email"
              type="email"
              name="email"
              value={formData.email}
              aria-required="true"
              onChange={handleChange}
              required
              className="bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-password" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Password</label>
            <input
              id="register-password"
              type="password"
              name="password"
              value={formData.password}
              aria-required="true"
              onChange={handleChange}
              required
              minLength={8}
              className="bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[#5f5e5a] dark:text-[#a8a7a0]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#1D9E75] font-bold no-underline">Sign in</Link>
        </div>
        <div className="mt-3 text-center">
          <button
            onClick={() => { localStorage.setItem('onboarding_complete', 'true'); navigate('/'); }}
            className="text-xs text-[#b4b2a9] dark:text-[#706f6a] hover:text-[#5f5e5a] bg-transparent border-none cursor-pointer underline"
          >
            Skip — use offline
          </button>
        </div>
      </div>
    </div>
  )
}
