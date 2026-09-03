import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" aria-live="polite" role="status">
        <div className="w-7 h-7 border-[2.5px] border-[#e5e4e7] border-t-[#1D9E75] rounded-full animate-spin"></div>
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
