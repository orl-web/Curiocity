import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { users } from '../services/api'
import SEO from '../components/SEO'
import { GuideSkeletonList } from '../components/Skeleton'
import { classifyApiError } from '../utils/apiError'
import TicketGuideCard from '../components/TicketGuideCard'
import type { Guide } from '../types'

export default function FollowingPage() {
  const navigate = useNavigate()
  const [guides, setGuides] = useState<Guide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFeed()
  }, [])

  const loadFeed = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await users.meFeed()
      setGuides(res.data?.guides || [])
    } catch (err) {
      setGuides([])
      setError(classifyApiError(err).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0">
      <SEO title="Feed" description="Guides from creators you follow on CurioCity" />
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-3 sticky top-0 z-20 shrink-0">
        <h1 className="text-lg font-bold text-[var(--color-primary)] tracking-tight">Feed</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-[11px] min-h-0">
        {isLoading ? (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading feed</span>
            <GuideSkeletonList count={3} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-[var(--text-secondary)] text-center">{error}</p>
            <button onClick={loadFeed} aria-label="Retry loading feed" className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold border-none cursor-pointer">Retry</button>
          </div>
        ) : guides.length === 0 ? (
          <div role="status" className="flex flex-col items-center justify-center py-12 gap-3">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="#b4b2a9" strokeWidth="1.5" className="w-12 h-12">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-sm text-[var(--text-secondary)] text-center">Follow creators to see their guides here</p>
          </div>
        ) : (
          guides.map((guide) => (
            <TicketGuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} />
          ))
        )}
      </div>
    </div>
  )
}
