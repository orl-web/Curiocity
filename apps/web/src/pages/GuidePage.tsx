import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { guides, reviews, comments } from '../services/api'
import SEO from '../components/SEO'
import type { Guide, GuideStop, Review, Comment } from '../types'
import { useAuth } from '../hooks/useAuth'
import LeafletMap from '../components/LeafletMap'
import { exportGpx, exportKml, exportJson } from '../utils/gpsExporters'
import { saveGuideOffline, isGuideOffline, deleteOfflineGuide, getGuideOffline } from '../utils/offlineStorage'

export default function GuidePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeStop, setActiveStop] = useState<number | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  const { user: currentUser, isAuthenticated } = useAuth()

  const [guideReviews, setGuideReviews] = useState<Review[]>([])
  const [reviewAvg, setReviewAvg] = useState(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const [guideComments, setGuideComments] = useState<Comment[]>([])
  const [guideReplies, setGuideReplies] = useState<Record<string, Comment[]>>({})
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [showCopiedToast, setShowCopiedToast] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [isSavingOffline, setIsSavingOffline] = useState(false)
  const [isPurchased, setIsPurchased] = useState(false)

  useEffect(() => {
    if (id) loadGuide(id)
  }, [id])

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    Promise.all([
      reviews.list(id).then((res) => {
        setGuideReviews(res.data.reviews)
        const total = res.data.reviews.length
        if (total > 0) {
          setReviewAvg(res.data.reviews.reduce((s, r) => s + r.rating, 0) / total)
        }
      }),
      comments.list(id).then((res) => {
        setGuideComments(res.data.comments)
        const map: Record<string, Comment[]> = {}
        for (const reply of res.data.replies) {
          if (reply.parentId) {
            if (!map[reply.parentId]) map[reply.parentId] = []
            map[reply.parentId].push(reply)
          }
        }
        setGuideReplies(map)
      }),
    ]).catch(() => {})
    return () => controller.abort()
  }, [id])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    const title = guide?.title || 'CurioCity Guide'
    const text = `Check out this guide: ${title}`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShowCopiedToast(true)
        setTimeout(() => setShowCopiedToast(false), 2000)
      } catch {
      }
    }
  }, [guide])

  const handleSubmitReview = async () => {
    if (!id) return
    setReviewSubmitting(true)
    try {
      const res = await reviews.create(id, { rating: reviewRating, text: reviewText || undefined })
      const newReview: Review = { ...res.data, user: currentUser || undefined }
      setGuideReviews((prev) => {
        const next = [newReview, ...prev]
        setReviewAvg(next.reduce((s, r) => s + r.rating, 0) / next.length)
        return next
      })
      setShowReviewForm(false)
      setReviewText('')
      setReviewRating(5)
    } catch {
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleSubmitComment = async (parentId?: string) => {
    if (!id) return
    const text = parentId ? replyText : commentText
    if (!text.trim()) return
    setCommentSubmitting(true)
    try {
      const res = await comments.create(id, { text: text.trim(), parentId })
      const newComment: Comment = { ...res.data, user: currentUser || undefined }
      if (parentId) {
        setGuideReplies((prev) => ({
          ...prev,
          [parentId]: [...(prev[parentId] || []), newComment],
        }))
        setReplyText('')
        setReplyingTo(null)
      } else {
        setGuideComments((prev) => [...prev, newComment])
        setCommentText('')
      }
    } catch {
    } finally {
      setCommentSubmitting(false)
    }
  }

  const loadGuide = async (guideId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await guides.detail(guideId)
      setGuide(res.data)
      setIsSaved(false)
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      // Try loading from IndexedDB when offline
      try {
        const offlineGuide = await getGuideOffline(guideId)
        if (offlineGuide) {
          setGuide(offlineGuide)
          setIsOffline(true)
          return
        }
      } catch {}
      setError('Failed to load guide. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!guide) return
    try {
      if (isSaved) {
        await guides.unsave(guide.id)
        setIsSaved(false)
      } else {
        await guides.save(guide.id)
        setIsSaved(true)
      }
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  useEffect(() => {
    if (!guide) return
    isGuideOffline(guide.id).then(setIsOffline)
  }, [guide])

  const handleToggleOffline = async () => {
    if (!guide) return
    setIsSavingOffline(true)
    try {
      if (isOffline) {
        await deleteOfflineGuide(guide.id)
        setIsOffline(false)
      } else {
        await saveGuideOffline(guide)
        setIsOffline(true)
      }
    } catch (err) {
      console.error('Offline save failed:', err)
    } finally {
      setIsSavingOffline(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 border-[2.5px] border-[#e5e4e7] border-t-[#1D9E75] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-[#5f5e5a] dark:text-[#a8a7a0]">{error || 'Guide not found'}</p>
        <button onClick={() => id && loadGuide(id)} className="px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer">Retry</button>
        <button onClick={() => navigate('/')} aria-label="Go back to home" className="text-[#1D9E75] font-bold text-sm border-none bg-transparent cursor-pointer">Go back</button>
      </div>
    )
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <SEO
        title={guide?.title}
        description={guide?.description || `Explore ${guide?.city} with this curated walking guide`}
        image={`${window.location.origin}/api/guides/${guide?.id}/og-image`}
        url={`https://curiocity.app/guide/${guide?.id}`}
      />
      {/* Header */}
      <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={handleBack} aria-label="Go back" className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:bg-[#f5f5f3]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4L6 9l5 5"/>
          </svg>
        </button>
        <span className="flex-1 text-[15px] font-bold">{guide.title}</span>
        <button onClick={handleShare} aria-label="Share guide" className="cursor-pointer p-1 active:scale-90 transition-transform">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="15" cy="4" r="2.5"/><circle cx="5" cy="10" r="2.5"/><circle cx="15" cy="16" r="2.5"/>
            <path d="M7.2 8.8l5.6-3.6M7.2 11.2l5.6 3.6"/>
          </svg>
        </button>
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} aria-label="Export guide" className="cursor-pointer p-1 active:scale-90 transition-transform">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3v10M6 9l4 4 4-4M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2"/>
            </svg>
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl shadow-lg z-[70] overflow-hidden min-w-[160px]">
                <button onClick={() => { exportGpx(guide); setShowExportMenu(false) }} className="w-full px-4 py-2.5 text-left text-[13px] font-bold hover:bg-[#f5f5f3] dark:hover:bg-[#272725] flex items-center gap-2 border-b border-black/5 dark:border-white/5 active:bg-[#E1F5EE] transition-colors">
                  <span className="text-base">🗺</span> Export GPX
                </button>
                <button onClick={() => { exportKml(guide); setShowExportMenu(false) }} className="w-full px-4 py-2.5 text-left text-[13px] font-bold hover:bg-[#f5f5f3] dark:hover:bg-[#272725] flex items-center gap-2 border-b border-black/5 dark:border-white/5 active:bg-[#E1F5EE] transition-colors">
                  <span className="text-base">📍</span> Export KML
                </button>
                <button onClick={() => { exportJson(guide); setShowExportMenu(false) }} className="w-full px-4 py-2.5 text-left text-[13px] font-bold hover:bg-[#f5f5f3] dark:hover:bg-[#272725] flex items-center gap-2 active:bg-[#E1F5EE] transition-colors">
                  <span className="text-base">📋</span> Export JSON
                </button>
              </div>
            </>
          )}
        </div>
        <button
          onClick={handleToggleOffline}
          disabled={isSavingOffline}
          aria-label={isOffline ? 'Remove from offline' : 'Save for offline'}
          className="cursor-pointer p-1 active:scale-90 transition-transform"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={isOffline ? '#1D9E75' : 'currentColor'} strokeWidth="1.5">
            {isOffline ? (
              <path d="M4 13l4 4L16 3" fill="none"/>
            ) : (
              <>
                <path d="M10 3v10M6 9l4 4 4-4"/>
                <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2"/>
              </>
            )}
          </svg>
        </button>
        <button onClick={handleSave} aria-label={isSaved ? 'Unsave guide' : 'Save guide'} className="cursor-pointer p-1 active:scale-90 transition-transform">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 3h10a1 1 0 011 1v13l-6-3-6 3V4a1 1 0 011-1z" fill={isSaved ? '#1D9E75' : 'none'}/>
          </svg>
        </button>
      </div>
      {showCopiedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a18] text-white text-[13px] font-bold px-4 py-2 rounded-full shadow-lg z-50">Copied!</div>
      )}

      {/* Map */}
      <div role="region" aria-label="Guide map" className="relative shrink-0">
        <LeafletMap
          stops={guide.stops || []}
          activeStop={activeStop}
          onStopClick={(i) => {
            setActiveStop(i)
            const el = document.getElementById(`stop-${i}`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        />
      </div>

      {/* Stop Navigation Bar */}
      <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-3.5 py-[9px] flex items-center gap-2.5 shrink-0 z-10">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] truncate">
            {activeStop !== null && guide.stops?.[activeStop] ? (
              <span><strong className="text-[#F27732] dark:text-[#f5f5f3]">{guide.stops[activeStop].name}</strong></span>
            ) : (
              'Select a stop to view details'
            )}
          </div>
        </div>
        <div className="flex gap-[6px] items-center shrink-0">
          <button
            aria-label="Previous stop"
            onClick={() => {
              if (activeStop === null || activeStop === 0) return
              setActiveStop(activeStop - 1)
              const el = document.getElementById(`stop-${activeStop - 1}`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            disabled={activeStop === null || activeStop === 0}
            className="w-8 h-8 rounded-full border border-black/20 dark:border-white/18 bg-[#f5f5f3] dark:bg-[#272725] flex items-center justify-center cursor-pointer text-[13px] hover:border-[#1D9E75] disabled:opacity-30 disabled:cursor-not-allowed"
          >⏮</button>
          <button
            aria-label="Next stop"
            onClick={() => {
              if (activeStop === null || !guide.stops || activeStop >= guide.stops.length - 1) return
              setActiveStop(activeStop + 1)
              const el = document.getElementById(`stop-${activeStop + 1}`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            disabled={activeStop === null || !guide.stops || activeStop >= guide.stops.length - 1}
            className="w-8 h-8 rounded-full border border-black/20 dark:border-white/18 bg-[#f5f5f3] dark:bg-[#272725] flex items-center justify-center cursor-pointer text-[13px] hover:border-[#1D9E75] disabled:opacity-30 disabled:cursor-not-allowed"
          >⏭</button>
          {activeStop !== null && guide.stops?.[activeStop]?.latitude && guide.stops?.[activeStop]?.longitude && (
            <a
              aria-label="Walking directions"
              href={`https://www.google.com/maps/dir/?api=1&destination=${guide.stops[activeStop].latitude},${guide.stops[activeStop].longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-black/20 dark:border-white/18 bg-[#f5f5f3] dark:bg-[#272725] flex items-center justify-center cursor-pointer text-[13px] hover:border-[#1D9E75]"
            >🚶</a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto min-h-0 ${(guide.priceModel !== 'free' && !isPurchased) ? 'relative' : ''}`}>
        {(guide.priceModel !== 'free' && !isPurchased) && (
          <div className="absolute inset-0 z-20 pointer-events-none" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            <div className="absolute inset-0 bg-white/40 dark:bg-black/40" />
          </div>
        )}
        <div className={`p-4 flex flex-col gap-3.5 ${(guide.priceModel !== 'free' && !isPurchased) ? 'blur-sm' : ''}`}>
          {/* Guide Info */}
          <div>
            <h1 className="text-xl font-bold leading-[1.3]">{guide.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-9 h-9 rounded-full bg-[#1D9E75] flex items-center justify-center text-[13px] font-bold text-white shrink-0">
                {guide.user?.displayName?.charAt(0) || '?'}
              </div>
              <div>
                <div className="text-sm font-bold">{guide.user?.displayName || 'Creator'}</div>
                <div className="text-xs text-[#5f5e5a] dark:text-[#a8a7a0]">{guide.city}</div>
              </div>
            </div>
          </div>

          {guide.description && (
            <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] leading-relaxed">{guide.description}</p>
          )}

          {/* Costs */}
          {guide.costs && guide.costs.length > 0 && (
            <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-black/10 dark:border-white/9 text-[12px] font-bold uppercase tracking-wider text-[#b4b2a9] dark:text-[#706f6a] flex justify-between items-center">
                <span>Estimated Costs</span>
              </div>
              {guide.costs.map((cost) => (
                <div key={cost.id} className="px-3.5 py-[9px] flex items-start gap-2.5 border-b border-black/10 dark:border-white/9 last:border-b-0">
                  <span className="text-base flex-shrink-0 w-[22px] text-center">
                    {cost.type === 'tickets' ? '🎟' : cost.type === 'meals' ? '🍽' : '🚌'}
                  </span>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold">{cost.name}</div>
                  </div>
                  <span className="text-sm font-bold shrink-0">€{(parseFloat(cost.price) || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="px-3.5 py-2.5 bg-[#f5f5f3] dark:bg-[#272725] flex justify-between items-center">
                <span className="text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0]">Total</span>
                <span className="text-lg font-bold text-[#1D9E75]">
                  €{guide.costs.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Stops */}
          {guide.stops && guide.stops.length > 0 && (
            <div>
              <div className="text-[11px] text-[#b4b2a9] dark:text-[#706f6a] font-bold uppercase tracking-wider mb-2">Stops</div>
              {guide.stops.map((stop, index) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={index}
                  isActive={activeStop === index}
                  onClick={() => setActiveStop(index)}
                />
              ))}
            </div>
          )}

          {/* Resources */}
          {guide.resources && guide.resources.length > 0 && (
            <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl p-3.5">
              <div className="text-[12px] font-bold uppercase tracking-wider text-[#b4b2a9] dark:text-[#706f6a] mb-2.5">Resources</div>
              {guide.resources.map((res) => (
                <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-[7px] border-b border-black/10 dark:border-white/9 last:border-b-0 no-underline">
                  <div className="w-7 h-7 rounded-lg bg-[#f5f5f3] dark:bg-[#272725] flex items-center justify-center text-sm flex-shrink-0">
                    {res.icon || '🔗'}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-[#F27732] dark:text-[#f5f5f3]">{res.title}</div>
                    <div className="text-[11px] text-[#b4b2a9] dark:text-[#706f6a] truncate">{res.url}</div>
                  </div>
                  <span className="text-[#b4b2a9] dark:text-[#706f6a] text-xs">→</span>
                </a>
              ))}
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-black/10 dark:border-white/9 flex items-center justify-between">
              <div className="text-[12px] font-bold uppercase tracking-wider text-[#b4b2a9] dark:text-[#706f6a]">Reviews</div>
              {guideReviews.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#F27732] dark:text-[#f5f5f3]">{reviewAvg.toFixed(1)}</span>
                  <span className="text-[#1D9E75] text-sm">★</span>
                  <span className="text-[11px] text-[#b4b2a9] dark:text-[#706f6a]">({guideReviews.length})</span>
                </div>
              )}
            </div>
            {isAuthenticated && (
              <div className="px-3.5 py-2.5 border-b border-black/10 dark:border-white/9">
                {!showReviewForm ? (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-[#f5f5f3] dark:bg-[#272725] text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0] cursor-pointer border border-black/10 dark:border-white/9 hover:border-[#1D9E75] transition-colors"
                  >
                    Write a Review...
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className={`text-lg cursor-pointer bg-transparent border-none p-0 ${star <= reviewRating ? 'text-[#1D9E75]' : 'text-[#e5e4e7]'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience (optional)"
                      className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/9 bg-[#f5f5f3] dark:bg-[#272725] text-[13px] text-[#F27732] dark:text-[#f5f5f3] resize-none h-16 focus:outline-none focus:border-[#1D9E75] placeholder:text-[#b4b2a9]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowReviewForm(false); setReviewText(''); setReviewRating(5) }}
                        className="px-3 py-1.5 rounded-lg bg-[#f5f5f3] dark:bg-[#272725] text-[12px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10 dark:border-white/9 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitReview}
                        disabled={reviewSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-[#1D9E75] text-[12px] font-bold text-white border-none cursor-pointer disabled:opacity-50"
                      >
                        {reviewSubmitting ? 'Posting...' : 'Post Review'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {guideReviews.length > 0 ? (
              guideReviews.map((review) => (
                <div key={review.id} className="px-3.5 py-2.5 border-b border-black/10 dark:border-white/9 last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-[#1D9E75] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {review.user?.displayName?.charAt(0) || '?'}
                    </div>
                    <span className="text-[13px] font-bold flex-1">{review.user?.displayName || 'Anonymous'}</span>
                    <span className="text-[11px] text-[#b4b2a9] dark:text-[#706f6a]">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-[#1D9E75] text-sm mb-0.5">
                    {Array.from({ length: 5 }, (_, i) => <span key={i}>{i < review.rating ? '★' : '☆'}</span>)}
                  </div>
                  {review.comment || (review as any).text ? (
                    <p className="text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0] leading-relaxed mt-0.5">{review.comment || (review as any).text}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="px-3.5 py-5 text-center text-[13px] text-[#b4b2a9] dark:text-[#706f6a]">No reviews yet. Be the first to review!</div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-black/10 dark:border-white/9 flex items-center justify-between">
              <div className="text-[12px] font-bold uppercase tracking-wider text-[#b4b2a9] dark:text-[#706f6a]">Comments</div>
              <span className="text-[11px] text-[#b4b2a9] dark:text-[#706f6a]">({guideComments.length})</span>
            </div>
            {isAuthenticated && (
              <div className="px-3.5 py-2.5 border-b border-black/10 dark:border-white/9 flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#1D9E75] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {currentUser?.displayName?.charAt(0) || '?'}
                </div>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) handleSubmitComment() }}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#f5f5f3] dark:bg-[#272725] text-[13px] text-[#F27732] dark:text-[#f5f5f3] border border-black/10 dark:border-white/9 focus:outline-none focus:border-[#1D9E75] placeholder:text-[#b4b2a9]"
                />
                <button
                  onClick={() => handleSubmitComment()}
                  disabled={commentSubmitting || !commentText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-[#1D9E75] text-[12px] font-bold text-white border-none cursor-pointer disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            )}
            {guideComments.length > 0 ? (
              guideComments.map((comment) => (
                <div key={comment.id}>
                  <div className="px-3.5 py-2.5 border-b border-black/10 dark:border-white/9 last:border-b-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-[#1D9E75] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {comment.user?.displayName?.charAt(0) || '?'}
                      </div>
                      <span className="text-[13px] font-bold flex-1">{comment.user?.displayName || 'Anonymous'}</span>
                      <span className="text-[11px] text-[#b4b2a9] dark:text-[#706f6a]">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0] leading-relaxed pl-8">{comment.content || (comment as any).text}</p>
                    {isAuthenticated && (
                      <button
                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText('') }}
                        className="ml-8 mt-1 text-[11px] text-[#1D9E75] font-bold bg-transparent border-none cursor-pointer p-0"
                      >
                        {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                      </button>
                    )}
                  </div>
                  {(guideReplies[comment.id] || []).map((reply) => (
                    <div key={reply.id} className="px-3.5 py-2.5 pl-12 border-b border-black/10 dark:border-white/9 last:border-b-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-[#1D9E75] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                          {reply.user?.displayName?.charAt(0) || '?'}
                        </div>
                        <span className="text-[12px] font-bold flex-1">{reply.user?.displayName || 'Anonymous'}</span>
                        <span className="text-[10px] text-[#b4b2a9] dark:text-[#706f6a]">{new Date(reply.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] leading-relaxed pl-7">{reply.content || (reply as any).text}</p>
                    </div>
                  ))}
                  {replyingTo === comment.id && (
                    <div className="px-3.5 py-2.5 pl-12 border-b border-black/10 dark:border-white/9 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) handleSubmitComment(comment.id) }}
                        placeholder={`Reply to ${comment.user?.displayName || 'Anonymous'}...`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#f5f5f3] dark:bg-[#272725] text-[12px] text-[#F27732] dark:text-[#f5f5f3] border border-black/10 dark:border-white/9 focus:outline-none focus:border-[#1D9E75] placeholder:text-[#b4b2a9]"
                      />
                      <button
                        onClick={() => handleSubmitComment(comment.id)}
                        disabled={commentSubmitting || !replyText.trim()}
                        className="px-2.5 py-1 rounded-lg bg-[#1D9E75] text-[11px] font-bold text-white border-none cursor-pointer disabled:opacity-50"
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3.5 py-5 text-center text-[13px] text-[#b4b2a9] dark:text-[#706f6a]">No comments yet. Start the conversation!</div>
            )}
          </div>
        </div>
        {(guide.priceModel !== 'free' && !isPurchased) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto">
            <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-2xl shadow-2xl p-6 mx-6 text-center max-w-[300px]">
              <div className="text-3xl mb-3">{guide.priceModel === 'paid' ? '🎟' : '📺'}</div>
              <h3 className="text-lg font-bold mb-2">{guide.priceModel === 'paid' ? 'Unlock this guide' : 'Watch an ad to unlock'}</h3>
              <p className="text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0] mb-4">
                {guide.priceModel === 'paid'
                  ? `Pay €0.99 to get full access to this guide and all its stops.`
                  : `Watch a short ad to access this guide for free.`}
              </p>
              <button
                onClick={() => setIsPurchased(true)}
                className="w-full py-2.5 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer active:scale-95 transition-transform"
              >
                {guide.priceModel === 'paid' ? '€0.99 — Unlock' : 'Watch Ad'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-2 mt-2 rounded-lg bg-transparent text-[#5f5e5a] dark:text-[#a8a7a0] text-[12px] font-bold border-none cursor-pointer"
              >
                Go back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StopCard({ stop, index, isActive, onClick }: { stop: GuideStop; index: number; isActive: boolean; onClick: () => void }) {
  return (
    <div id={`stop-${index}`} className={`border rounded-xl overflow-hidden mb-2.5 bg-white dark:bg-[#1e1e1c] transition-colors ${isActive ? 'border-[#1D9E75]' : 'border-black/10 dark:border-white/9'}`}>
      <div className="px-3 py-[11px] flex gap-2.5 items-start cursor-pointer" onClick={onClick}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-[1px] ${isActive ? 'bg-[#1D9E75] text-white' : 'bg-[#E1F5EE] text-[#085041]'}`}>
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-bold">{stop.name}</div>
          {stop.description && (
            <div className="text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0] mt-[2px] leading-relaxed line-clamp-3">{stop.description}</div>
          )}
        </div>
      </div>
      {isActive && (stop.imageUrl || stop.videoUrl) && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {stop.imageUrl && (
            <img src={stop.imageUrl} alt={stop.name} className="w-full h-[150px] object-cover rounded-lg" />
          )}
        </div>
      )}
    </div>
  )
}
