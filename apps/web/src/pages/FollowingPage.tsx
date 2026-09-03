import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { users } from '../services/api'
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
    } catch {
      setGuides([])
      setError('Failed to load feed. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-3 sticky top-0 z-20 shrink-0">
        <h1 className="text-lg font-bold text-[#1D9E75] tracking-tight">Feed</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-[11px] min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" aria-live="polite" aria-busy="true" role="status">
            <div className="w-7 h-7 border-[2.5px] border-[#e5e4e7] border-t-[#1D9E75] rounded-full animate-spin"></div>
            <span className="sr-only">Loading feed</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] text-center">{error}</p>
            <button onClick={loadFeed} className="px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer">Retry</button>
          </div>
        ) : guides.length === 0 ? (
          <div role="status" className="flex flex-col items-center justify-center py-12 gap-3">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="#b4b2a9" strokeWidth="1.5" className="w-12 h-12">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] text-center">Follow creators to see their guides here</p>
          </div>
        ) : (
          guides.map((guide) => (
            <GuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} />
          ))
        )}
      </div>
    </div>
  )
}

function GuideCard({ guide, onClick }: { guide: Guide; onClick: () => void }) {
  const categoryColors: Record<string, string> = {
    food: 'bg-[#E1F5EE] text-[#085041]',
    architecture: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
    history: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
    art: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
    nature: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
  }

  return (
    <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl overflow-hidden cursor-pointer hover:border-[#1D9E75] transition-colors" onClick={onClick}>
      <div className="p-3">
        <div className="flex gap-[11px]">
          <div className="w-[86px] h-[76px] rounded-lg bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 flex-shrink-0 overflow-hidden">
            {guide.coverImage || guide.coverImageUrl ? (
              <img src={guide.coverImage || guide.coverImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#b4b2a9] dark:text-[#706f6a] text-xs">
                {guide.city?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold leading-[1.3] mb-1 line-clamp-2">{guide.title}</div>
            <div className="flex items-center gap-[5px] mb-[5px]">
              <div className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] text-white font-bold shrink-0" style={{ background: '#1D9E75' }}>
                {guide.user?.displayName?.charAt(0) || '?'}
              </div>
              <span className="text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] truncate">{guide.user?.displayName || 'Creator'}</span>
            </div>
            <div className="flex flex-wrap gap-[5px]">
              <span className={`px-2 py-[3px] rounded-[10px] text-[11px] font-bold ${categoryColors[guide.category] || 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0]'}`}>
                {guide.category}
              </span>
              {guide.priceModel === 'free' && (
                <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#E1F5EE] text-[#085041]">Free</span>
              )}
              {guide.priceModel === 'paid' && (
                <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#BA7517]/10 text-[#BA7517]">€0.99</span>
              )}
            </div>
            {Number(guide.rating) > 0 && (
              <div className="text-[11px] text-[#BA7517] mt-1">{Number(guide.rating).toFixed(1)}★</div>
            )}
          </div>
        </div>
      </div>
      <div className="px-3 py-2 border-t border-black/10 dark:border-white/9 flex items-center justify-between">
        <span className="text-[12px] font-bold">
          {guide.priceModel === 'free' ? (
            <span className="text-[#1D9E75]">Free</span>
          ) : guide.priceModel === 'paid' ? (
            <span className="text-[#BA7517]">€0.99</span>
          ) : (
            <span className="text-[#5f5e5a] dark:text-[#a8a7a0]">Watch ad</span>
          )}
        </span>
        <span className="text-[12px] text-[#b4b2a9] dark:text-[#706f6a]">
          {guide.distance_km != null && <span className="text-[#1D9E75] font-bold mr-2">{guide.distance_km} km</span>}
          {guide.city}
        </span>
      </div>
    </div>
  )
}
