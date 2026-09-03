import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
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
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] dark:bg-[#161614] flex items-center justify-center p-4">
      <SEO title="Login" description="Sign in to your CurioCity account" />
      <div className="w-full max-w-[400px] bg-white dark:bg-[#1e1e1c] rounded-xl border border-black/10 dark:border-white/9 p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1D9E75]">
            Curio<span className="text-[#1D9E75]">City</span>
          </h1>
          <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              aria-required="true"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              aria-required="true"
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#1D9E75]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[#5f5e5a] dark:text-[#a8a7a0]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#1D9E75] font-bold no-underline">Sign up</Link>
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
