import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import OfflineIndicator from './components/OfflineIndicator'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import GuidePage from './pages/GuidePage'
import ProfilePage from './pages/ProfilePage'
import CreatorPage from './pages/CreatorPage'
import CreatePage from './pages/CreatePage'
import AnalyticsPage from './pages/AnalyticsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FollowingPage from './pages/FollowingPage'
import OnboardingPage from './pages/OnboardingPage'
import MapPage from './pages/MapPage'
import LandingPage from './pages/LandingPage'

export default function App() {
  const location = useLocation()
  const onboardingComplete = localStorage.getItem('onboarding_complete')

  return (
    <ErrorBoundary>
      <AuthProvider>
        <OfflineIndicator />
        {!onboardingComplete && location.pathname === '/' && (
          <Navigate to="/onboarding" replace />
        )}
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
      </AuthProvider>
    </ErrorBoundary>
  )
}
