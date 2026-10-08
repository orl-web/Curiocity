import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, Suspense, lazy } from 'react'
import { AuthProvider } from './hooks/useAuth'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import OfflineIndicator from './components/OfflineIndicator'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

const GuidePage = lazy(() => import('./pages/GuidePage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const CreatorPage = lazy(() => import('./pages/CreatorPage'))
const CreatePage = lazy(() => import('./pages/CreatePage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const FollowingPage = lazy(() => import('./pages/FollowingPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
      <div className="w-7 h-7 border-[2.5px] border-[#e5e4e7] border-t-[#1D9E75] rounded-full animate-spin"></div>
      <span className="sr-only">Loading page</span>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const [onboardingComplete] = useState(() => localStorage.getItem('onboarding_complete'))

  return (
    <ErrorBoundary>
      <AuthProvider>
        <OfflineIndicator />
        {!onboardingComplete && location.pathname === '/' && (
          <Navigate to="/onboarding" replace />
        )}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/guide/:id" element={<GuidePage />} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/feed" element={<ProtectedRoute><FollowingPage /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
              <Route path="/u/:username" element={<CreatorPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  )
}
