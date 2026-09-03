import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { payments, users } from '../services/api'
import type { Guide } from '../types'

interface Earnings {
  totalEarnings: number
  pendingEarnings: number
}

interface GuideAnalytics extends Guide {
  savesCount?: number
  stopsCount?: number
  viewCount?: number
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [earnings, setEarnings] = useState<Earnings>({ totalEarnings: 0, pendingEarnings: 0 })
  const [guides, setGuides] = useState<GuideAnalytics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [earningsRes, guidesRes] = await Promise.all([
        payments.creatorEarnings(),
        users.meGuides(),
      ])
      setEarnings(earningsRes.data)
      setGuides(guidesRes.data.guides || [])
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      setError('Failed to load analytics. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const totalSaves = guides.reduce((sum, g) => sum + (g.savesCount || 0), 0)
  const publishedGuides = guides.filter((g) => g.isPublished)

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:bg-[#f5f5f3]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4L6 9l5 5"/>
          </svg>
        </button>
        <div className="flex-1 text-lg font-bold text-[#1D9E75]">
          creator analytics
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" aria-live="polite" aria-busy="true" role="status">
            <div className="w-7 h-7 border-[2.5px] border-[#e5e4e7] border-t-[#1D9E75] rounded-full animate-spin"></div>
            <span className="sr-only">Loading analytics</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] text-center">{error}</p>
            <button onClick={loadAnalytics} aria-label="Retry loading analytics" className="px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer">Retry</button>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-lg p-4 text-center">
              <div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wide mb-1">Total Earnings</div>
              <div className="text-3xl font-bold text-[#1D9E75]">€{earnings.totalEarnings.toFixed(2)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-lg p-3">
                <div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wide mb-1">Pending</div>
                <div className="text-lg font-bold">€{earnings.pendingEarnings.toFixed(2)}</div>
              </div>
              <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-lg p-3">
                <div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wide mb-1">Published</div>
                <div className="text-lg font-bold">{publishedGuides.length}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-lg p-3">
              <div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wide mb-1">Total Saves</div>
              <div className="text-lg font-bold">{totalSaves}</div>
            </div>

            <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-black/10 dark:border-white/9">
                <div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wide">Your Guides</div>
              </div>
              {guides.length === 0 ? (
                <div className="text-center py-8 text-[#5f5e5a] dark:text-[#a8a7a0] text-sm">No guides yet</div>
              ) : (
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {guides.map((guide) => (
                    <div key={guide.id} className="px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-[#f5f5f3] dark:hover:bg-[#272725] transition-colors" onClick={() => navigate(`/guide/${guide.id}`)}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold truncate">{guide.title}</div>
                        <div className="text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] mt-[1px]">{guide.city}</div>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] shrink-0">
                        <span>{guide.stopsCount || 0} stops</span>
                        <span>{guide.savesCount || 0} saves</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
