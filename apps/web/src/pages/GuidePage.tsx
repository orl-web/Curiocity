import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { guides, reviews, comments } from '../services/api'
import SEO from '../components/SEO'
import type { Guide, GuideStop, Review, Comment } from '../types'
import { useAuth } from '../hooks/useAuth'
import LeafletMap from '../components/LeafletMap'
import { exportGpx, exportKml, exportJson } from '../utils/gpsExporters'
import { saveGuideOffline, isGuideOffline, deleteOfflineGuide, getGuideOffline } from '../utils/offlineStorage'
import { classifyApiError } from '../utils/apiError'
import { haversineKm, bearingDeg, normalizeDeg, compassPoint } from '../utils/geo'
import { useDeviceHeading } from '../hooks/useDeviceHeading'

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
  const [actionError, setActionError] = useState<string | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [isSavingOffline, setIsSavingOffline] = useState(false)
  const [isPurchased, setIsPurchased] = useState(false)

  // Walk mode: a full-screen compass that walks the reader through this
  // guide's stops in order, advancing as they arrive.
  const [walkActive, setWalkActive] = useState(false)
  const [walkIdx, setWalkIdx] = useState(0)
  const [walkPos, setWalkPos] = useState<{ lat: number; lng: number } | null>(null)
  const walkWatchRef = useRef<number | null>(null)
  const { heading: walkHeading, state: headingState, requestHeading } = useDeviceHeading(walkActive)

  // Stops that can actually be walked, keeping original indices for scroll sync.
  const walkStops = (guide?.stops || [])
    .map((stop, index) => ({ stop, index }))
    .filter(({ stop }) => stop.latitude != null && stop.longitude != null && !isNaN(Number(stop.latitude)) && !isNaN(Number(stop.longitude)))

  const startWalk = () => {
    setWalkActive(true)
    setWalkIdx(0)
    // Lock page scroll behind the overlay.
    document.body.style.overflow = 'hidden'
    if ('geolocation' in navigator) {
      walkWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => setWalkPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setWalkPos(null),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      )
    }
  }

  const stopWalk = () => {
    setWalkActive(false)
    document.body.style.overflow = ''
    if (walkWatchRef.current != null) {
      navigator.geolocation.clearWatch(walkWatchRef.current)
      walkWatchRef.current = null
    }
  }

  // Auto-advance when the reader arrives at the current stop (within 60m).
  useEffect(() => {
    if (!walkActive || !walkPos || walkStops.length === 0) return
    const target = walkStops[Math.min(walkIdx, walkStops.length - 1)]
    if (!target) return
    const km = haversineKm(walkPos.lat, walkPos.lng, Number(target.stop.latitude), Number(target.stop.longitude))
    if (km <= 0.06 && walkIdx < walkStops.length - 1) setWalkIdx((i) => i + 1)
  }, [walkActive, walkPos, walkIdx, walkStops])

  // The map collapses as soon as the reader scrolls past it, so the stops and
  // reviews get the full screen height. Height is written straight to the DOM
  // instead of through state: doing it via React would re-render the whole page
  // (reviews, comments, replies) on every scroll frame.
  const MAP_MAX_HEIGHT = 260
  const MAP_COLLAPSE_DISTANCE = 160
  const mapWrapRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const collapseTickingRef = useRef(false)

  const collapseMapOnScroll = useCallback(() => {
    if (collapseTickingRef.current) return
    collapseTickingRef.current = true
    requestAnimationFrame(() => {
      collapseTickingRef.current = false
      const wrap = mapWrapRef.current
      const scroller = contentRef.current
      if (!wrap || !scroller) return
      const progress = Math.min(scroller.scrollTop / MAP_COLLAPSE_DISTANCE, 1)
      wrap.style.height = `${Math.round(MAP_MAX_HEIGHT * (1 - progress))}px`
    })
  }, [MAP_MAX_HEIGHT, MAP_COLLAPSE_DISTANCE])

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
        setActionError('Failed to copy link')
        setTimeout(() => setActionError(null), 3000)
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
      setActionError('Failed to post review. Please try again.')
      setTimeout(() => setActionError(null), 3000)
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
      setActionError('Failed to post comment. Please try again.')
      setTimeout(() => setActionError(null), 3000)
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
      setError(classifyApiError(err).message)
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
        <div className="w-7 h-7 border-[2.5px] border-[#e5e4e7] border-t-[var(--color-primary)] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-[var(--text-secondary)]">{error || 'Guide not found'}</p>
        <button onClick={() => id && loadGuide(id)} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold border-none cursor-pointer">Retry</button>
        <button onClick={() => navigate('/')} aria-label="Go back to home" className="text-[var(--color-primary)] font-bold text-sm border-none bg-transparent cursor-pointer">Go back</button>
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
      {/* Header — z-[80] so the ⋯ menu (z-70) and toasts clear the map below,
          which is now contained by isolation:isolate on its own container. */}
      <div className="relative z-[80] bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={handleBack} aria-label="Go back" className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:bg-[var(--bg-primary)]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4L6 9l5 5"/>
          </svg>
        </button>
        <span className="flex-1 text-[15px] font-bold line-clamp-2 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{guide.title}</span>
        {/* All guide actions live behind one ⋯ button. Five separate icons
            crowded the header and pushed the title into a single truncated line. */}
        <div className="relative">
          <button
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            aria-label="Guide actions"
            aria-haspopup="menu"
            aria-expanded={showActionsMenu}
            className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-secondary)] text-[15px] font-bold cursor-pointer shrink-0"
          >⋯</button>
          {showActionsMenu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowActionsMenu(false)} />
              <div role="menu" className="absolute right-0 top-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-lg z-[70] overflow-hidden min-w-[190px]">
                <button role="menuitem" onClick={() => { handleShare(); setShowActionsMenu(false) }} className="w-full px-4 py-2.5 text-left text-[13px] font-bold hover:bg-[var(--bg-tertiary)] flex items-center gap-2 border-b border-[var(--border-color)] transition-colors">
                  <span className="text-base">🔗</span> Share
                </button>
                <button role="menuitem" onClick={() => { startWalk(); setShowActionsMenu(false) }} disabled={walkStops.length === 0} className="w-full px-4 py-2.5 text-left text-[13px] font-bold hover:bg-[var(--bg-tertiary)] flex items-center gap-2 border-b border-[var(--border-color)] transition-colors disabled:opacity-50">
                  <span className="text-base">🚶</span> {walkStops.length === 0 ? 'Walk (no located stops)' : 'Walk route'}
                </button>
                <button role="menuitem" onClick={() => { handleSave(); setShowActionsMenu(false) }} className="w-full px-4 py-2.5 text-left text-[13px] font-bold hover:bg-[var(--bg-tertiary)] flex items-center gap-2 border-b border-[var(--border-color)] transition-colors">
                  <span className="text-base">{isSaved ? '★' : '☆'}</span> {isSaved ? 'Saved — tap to unsave' : 'Save guide'}
                </button>
                <button role="menuitem" onClick={() => { handleToggleOffline(); setShowActionsMenu(false) }} disabled={isSavingOffline} className="w-full px-4 py-2.5 text-left text-[13px] font-bold hover:bg-[var(--bg-tertiary)] flex items-center gap-2 border-b border-[var(--border-color)] transition-colors disabled:opacity-50">
                  <span className="text-base">{isOffline ? '✓' : '⬇'}</span> {isSavingOffline ? 'Saving…' : isOffline ? 'Available offline' : 'Save for offline'}
                </button>
                <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] border-t border-[var(--border-color)]">Export route</div>
                <button role="menuitem" onClick={() => { exportGpx(guide); setShowActionsMenu(false) }} className="w-full px-4 py-2 text-left text-[13px] font-bold hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors">
                  <span className="text-base">🗺</span> GPX
                </button>
                <button role="menuitem" onClick={() => { exportKml(guide); setShowActionsMenu(false) }} className="w-full px-4 py-2 text-left text-[13px] font-bold hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors">
                  <span className="text-base">📍</span> KML
                </button>
                <button role="menuitem" onClick={() => { exportJson(guide); setShowActionsMenu(false) }} className="w-full px-4 py-2 text-left text-[13px] font-bold hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors">
                  <span className="text-base">📋</span> JSON
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showCopiedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a18] text-white text-[13px] font-bold px-4 py-2 rounded-full shadow-lg z-[90]">Copied!</div>
      )}
      {actionError && (
        <div role="alert" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#E24B4A] text-white text-[13px] font-bold px-4 py-2 rounded-full shadow-lg z-[90]">{actionError}</div>
      )}

      {/* Map — collapses away as the content scrolls past it */}
      <div
        ref={mapWrapRef}
        role="region"
        aria-label="Guide map"
        className="relative shrink-0 overflow-hidden"
        style={{ height: MAP_MAX_HEIGHT, transition: 'height 200ms ease-out' }}
      >
        <LeafletMap
          stops={guide.stops || []}
          activeStop={activeStop}
          height="100%"
          onStopClick={(i) => {
            setActiveStop(i)
            const el = document.getElementById(`stop-${i}`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        />
      </div>

      {/* Stop Navigation Bar */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-3.5 py-[9px] flex items-center gap-2.5 shrink-0 z-10">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[var(--text-secondary)] truncate">
            {activeStop !== null && guide.stops?.[activeStop] ? (
              <span><strong className="text-[#F27732] dark:text-[var(--text-primary)]">{guide.stops[activeStop].name}</strong></span>
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
            className="w-8 h-8 rounded-full border border-black/20 dark:border-white/18 bg-[var(--bg-tertiary)] flex items-center justify-center cursor-pointer text-[13px] hover:border-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
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
            className="w-8 h-8 rounded-full border border-black/20 dark:border-white/18 bg-[var(--bg-tertiary)] flex items-center justify-center cursor-pointer text-[13px] hover:border-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
          >⏭</button>
          {activeStop !== null && guide.stops?.[activeStop]?.latitude && guide.stops?.[activeStop]?.longitude && (
            <a
              aria-label="Walking directions"
              href={`https://www.google.com/maps/dir/?api=1&destination=${guide.stops[activeStop].latitude},${guide.stops[activeStop].longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-black/20 dark:border-white/18 bg-[var(--bg-tertiary)] flex items-center justify-center cursor-pointer text-[13px] hover:border-[var(--color-primary)]"
            >🚶</a>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        onScroll={collapseMapOnScroll}
        className={`flex-1 overflow-y-auto min-h-0 ${(guide.priceModel !== 'free' && !isPurchased) ? 'relative' : ''}`}
      >
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
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: 'var(--color-primary)' }}>
                {guide.user?.displayName?.charAt(0) || '?'}
              </div>
              <div>
                <div className="text-sm font-bold">{guide.user?.displayName || 'Creator'}</div>
                <div className="text-xs text-[var(--text-secondary)]">{guide.city}</div>
              </div>
            </div>
            {(guide.timeSlots?.length || guide.validUntil || guide.recurrence) ? (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {guide.timeSlots && guide.timeSlots.length > 0 && guide.timeSlots.map((s) => (
                  <span key={s} className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#7B61FF]/10 text-[#7B61FF] border border-[#7B61FF]/20">
                    {{ morning: '🌅', afternoon: '☀️', evening: '🌇', night: '🌙' }[s]} {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                ))}
                {guide.validUntil && (
                  <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#E24B4A]/10 text-[#E24B4A] border border-[#E24B4A]/20">
                    ⏱ {guide.validFrom ? `${new Date(guide.validFrom).toLocaleDateString()} → ` : ''}{new Date(guide.validUntil).toLocaleDateString()}
                  </span>
                )}
                {guide.recurrence && (
                  <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#378ADD]/10 text-[#378ADD] border border-[#378ADD]/20">
                    🔁 {guide.recurrence.daysOfWeek.map((d) => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d]).join(', ')}
                  </span>
                )}
              </div>
            ) : null}
          </div>

          {guide.description && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{guide.description}</p>
          )}

          {/* Costs */}
          {guide.costs && guide.costs.length > 0 && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-[var(--border-color)] text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex justify-between items-center">
                <span>Estimated Costs</span>
              </div>
              {guide.costs.map((cost) => (
                <div key={cost.id} className="px-3.5 py-[9px] flex items-start gap-2.5 border-b border-[var(--border-color)] last:border-b-0">
                  <span className="text-base flex-shrink-0 w-[22px] text-center">
                    {cost.type === 'tickets' ? '🎟' : cost.type === 'meals' ? '🍽' : '🚌'}
                  </span>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold">{cost.name}</div>
                  </div>
                  <span className="text-sm font-bold shrink-0">€{(parseFloat(cost.price) || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="px-3.5 py-2.5 bg-[var(--bg-tertiary)] flex justify-between items-center">
                <span className="text-[13px] text-[var(--text-secondary)]">Total</span>
                <span className="text-lg font-bold text-[var(--color-primary)]">
                  €{guide.costs.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Stops */}
          {guide.stops && guide.stops.length > 0 && (
            <div>
              <div className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-2">Stops</div>
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
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5">
              <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Resources</div>
              {guide.resources.map((res) => (
                <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-[7px] border-b border-[var(--border-color)] last:border-b-0 no-underline">
                  <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-sm flex-shrink-0">
                    {res.icon || '🔗'}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-[#F27732] dark:text-[var(--text-primary)]">{res.title}</div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">{res.url}</div>
                  </div>
                  <span className="text-[var(--text-muted)] text-xs">→</span>
                </a>
              ))}
            </div>
          )}

          {/* Reviews */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Reviews</div>
              {guideReviews.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#F27732] dark:text-[var(--text-primary)]">{reviewAvg.toFixed(1)}</span>
                  <span className="text-[var(--color-primary)] text-sm">★</span>
                  <span className="text-[11px] text-[var(--text-muted)]">({guideReviews.length})</span>
                </div>
              )}
            </div>
            {isAuthenticated && (
              <div className="px-3.5 py-2.5 border-b border-[var(--border-color)]">
                {!showReviewForm ? (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[13px] text-[var(--text-secondary)] cursor-pointer border border-[var(--border-color)] hover:border-[var(--color-primary)] transition-colors"
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
                          className={`text-lg cursor-pointer bg-transparent border-none p-0 ${star <= reviewRating ? 'text-[var(--color-primary)]' : 'text-[#e5e4e7]'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience (optional)"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[13px] text-[#F27732] dark:text-[var(--text-primary)] resize-none h-16 focus:outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--text-muted)]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowReviewForm(false); setReviewText(''); setReviewRating(5) }}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[12px] font-bold text-[var(--text-secondary)] border border-[var(--border-color)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitReview}
                        disabled={reviewSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-[12px] font-bold text-white border-none cursor-pointer disabled:opacity-50"
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
                <div key={review.id} className="px-3.5 py-2.5 border-b border-[var(--border-color)] last:border-b-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {review.user?.displayName?.charAt(0) || '?'}
                    </div>
                    <span className="text-[13px] font-bold flex-1">{review.user?.displayName || 'Anonymous'}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-[var(--color-primary)] text-sm mb-0.5">
                    {Array.from({ length: 5 }, (_, i) => <span key={i}>{i < review.rating ? '★' : '☆'}</span>)}
                  </div>
                  {review.comment || (review as any).text ? (
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-0.5">{review.comment || (review as any).text}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="px-3.5 py-5 text-center text-[13px] text-[var(--text-muted)]">No reviews yet. Be the first to review!</div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Comments</div>
              <span className="text-[11px] text-[var(--text-muted)]">({guideComments.length})</span>
            </div>
            {isAuthenticated && (
              <div className="px-3.5 py-2.5 border-b border-[var(--border-color)] flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {currentUser?.displayName?.charAt(0) || '?'}
                </div>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) handleSubmitComment() }}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[13px] text-[#F27732] dark:text-[var(--text-primary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--text-muted)]"
                />
                <button
                  onClick={() => handleSubmitComment()}
                  disabled={commentSubmitting || !commentText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-[12px] font-bold text-white border-none cursor-pointer disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            )}
            {guideComments.length > 0 ? (
              guideComments.map((comment) => (
                <div key={comment.id}>
                  <div className="px-3.5 py-2.5 border-b border-[var(--border-color)] last:border-b-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {comment.user?.displayName?.charAt(0) || '?'}
                      </div>
                      <span className="text-[13px] font-bold flex-1">{comment.user?.displayName || 'Anonymous'}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed pl-8">{comment.content || (comment as any).text}</p>
                    {isAuthenticated && (
                      <button
                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText('') }}
                        className="ml-8 mt-1 text-[11px] text-[var(--color-primary)] font-bold bg-transparent border-none cursor-pointer p-0"
                      >
                        {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                      </button>
                    )}
                  </div>
                  {(guideReplies[comment.id] || []).map((reply) => (
                    <div key={reply.id} className="px-3.5 py-2.5 pl-12 border-b border-[var(--border-color)] last:border-b-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                          {reply.user?.displayName?.charAt(0) || '?'}
                        </div>
                        <span className="text-[12px] font-bold flex-1">{reply.user?.displayName || 'Anonymous'}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{new Date(reply.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed pl-7">{reply.content || (reply as any).text}</p>
                    </div>
                  ))}
                  {replyingTo === comment.id && (
                    <div className="px-3.5 py-2.5 pl-12 border-b border-[var(--border-color)] flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) handleSubmitComment(comment.id) }}
                        placeholder={`Reply to ${comment.user?.displayName || 'Anonymous'}...`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-[12px] text-[#F27732] dark:text-[var(--text-primary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--text-muted)]"
                      />
                      <button
                        onClick={() => handleSubmitComment(comment.id)}
                        disabled={commentSubmitting || !replyText.trim()}
                        className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)] text-[11px] font-bold text-white border-none cursor-pointer disabled:opacity-50"
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3.5 py-5 text-center text-[13px] text-[var(--text-muted)]">No comments yet. Start the conversation!</div>
            )}
          </div>
        </div>
        {(guide.priceModel !== 'free' && !isPurchased) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 mx-6 text-center max-w-[300px]">
              <div className="text-3xl mb-3">{guide.priceModel === 'paid' ? '🎟' : '📺'}</div>
              <h3 className="text-lg font-bold mb-2">{guide.priceModel === 'paid' ? 'Unlock this guide' : 'Watch an ad to unlock'}</h3>
              <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                {guide.priceModel === 'paid'
                  ? `Pay €0.99 to get full access to this guide and all its stops.`
                  : `Watch a short ad to access this guide for free.`}
              </p>
              <button
                onClick={() => setIsPurchased(true)}
                className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold border-none cursor-pointer active:scale-95 transition-transform"
              >
                {guide.priceModel === 'paid' ? '€0.99 — Unlock' : 'Watch Ad'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-2 mt-2 rounded-lg bg-transparent text-[var(--text-secondary)] text-[12px] font-bold border-none cursor-pointer"
              >
                Go back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Walk mode — dark full-screen compass through this guide's stops */}
      {walkActive && (() => {
        const total = walkStops.length
        const cur = walkStops[Math.min(walkIdx, Math.max(total - 1, 0))]
        const curLat = cur ? Number(cur.stop.latitude) : null
        const curLng = cur ? Number(cur.stop.longitude) : null
        const hasTarget = curLat != null && curLng != null && !isNaN(curLat) && !isNaN(curLng)
        const bearing = hasTarget && walkPos ? bearingDeg(walkPos.lat, walkPos.lng, curLat!, curLng!) : null
        const distKm = hasTarget && walkPos ? haversineKm(walkPos.lat, walkPos.lng, curLat!, curLng!) : null
        const relative = bearing != null ? normalizeDeg(bearing - (walkHeading ?? 0)) : null
        const turn = relative != null ? (relative > 180 ? relative - 360 : relative) : null
        const distLabel = distKm == null ? null : distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`
        const finished = total > 0 && walkIdx >= total - 1 && distKm != null && distKm <= 0.06
        const accent = '#1D9E75'

        return (
          <div className="fixed inset-0 z-[1300] flex flex-col text-white"
            style={{
              background: 'radial-gradient(120% 90% at 50% 30%, #1c1a17 0%, #0c0b0a 62%, #050504 100%)',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <button onClick={stopWalk} aria-label="Exit walk mode"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[15px] cursor-pointer border-none text-white">✕</button>
              <div className="text-center min-w-0 px-2">
                <div className="text-[13px] font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>{guide.title}</div>
                <div className="text-[10px] text-white/50">Walk mode{total > 0 ? ` · Stop ${Math.min(walkIdx + 1, total)} of ${total}` : ''}</div>
              </div>
              <button onClick={() => setWalkIdx((i) => Math.min(Math.max(total - 1, 0), i + 1))} aria-label="Skip to next stop" disabled={total <= 1}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[15px] cursor-pointer border-none text-white disabled:opacity-30">↻</button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col items-center justify-center gap-5 min-h-0 px-6">
              {!walkPos && (
                <div className="text-[12px] text-white/60 text-center max-w-[240px]">
                  Turn on location to see which way to walk.
                </div>
              )}
              {total === 0 ? (
                <div className="text-[13px] text-white/70 text-center max-w-[260px]">This guide has no stops with coordinates yet.</div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-[17px] font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{cur.stop.name}</div>
                    {finished && <div className="text-[12px] text-[#7ED9B6] mt-1">🎉 You made it — last stop reached</div>}
                  </div>

                  <div className="relative shrink-0" style={{ width: 228, height: 228 }}>
                    <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 60px ${accent}33, inset 0 0 40px rgba(0,0,0,.5)` }} />
                    <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden="true"
                      style={{ transform: `rotate(${-(walkHeading ?? 0)}deg)`, transition: 'transform 120ms linear' }}>
                      <circle cx="50" cy="50" r="47" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.18)" strokeWidth="0.8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="0.4" />
                      {Array.from({ length: 36 }).map((_, i) => {
                        const a = (i * 10 * Math.PI) / 180
                        const major = i % 9 === 0
                        const r1 = major ? 38 : 42
                        return <line key={i} x1={50 + r1 * Math.sin(a)} y1={50 - r1 * Math.cos(a)} x2={50 + 46 * Math.sin(a)} y2={50 - 46 * Math.cos(a)}
                          stroke={major ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)'} strokeWidth={major ? 1 : 0.4} />
                      })}
                      <text x="50" y="12" textAnchor="middle" fontSize="7" fontWeight="800" fill="#E24B4A" fontFamily="system-ui">N</text>
                      <text x="90" y="52.5" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="rgba(255,255,255,.55)" fontFamily="system-ui">E</text>
                      <text x="50" y="94" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="rgba(255,255,255,.55)" fontFamily="system-ui">S</text>
                      <text x="10" y="52.5" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="rgba(255,255,255,.55)" fontFamily="system-ui">W</text>
                    </svg>
                    {relative != null && (
                      <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden="true"
                        style={{ transform: `rotate(${relative}deg)`, transition: 'transform 160ms ease-out' }}>
                        <polygon points="50,14 55,52 50,58 45,52" fill="#E24B4A" />
                        <polygon points="50,86 55,48 50,42 45,48" fill="rgba(255,255,255,.85)" />
                      </svg>
                    )}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] pointer-events-none font-bold tabular-nums">{Math.min(walkIdx + 1, total)}</div>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 text-center">
                    {distLabel ? (
                      <div className="text-[26px] font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{distLabel}</div>
                    ) : (
                      <div className="text-[13px] text-white/50">{walkPos ? 'Distance unknown' : 'Enable location for distance'}</div>
                    )}
                    {turn != null && walkHeading != null ? (
                      <div className="text-[12px] text-white/70">Turn {Math.abs(Math.round(turn))}° {turn >= 0 ? 'right' : 'left'}</div>
                    ) : bearing != null ? (
                      <div className="text-[12px] text-white/70">Head {compassPoint(bearing)} ({Math.round(bearing)}°)</div>
                    ) : null}
                    {headingState !== 'granted' && headingState !== 'unsupported' && (
                      <button onClick={requestHeading}
                        className="mt-1 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-[11px] font-bold cursor-pointer">
                        Enable compass
                      </button>
                    )}
                    {headingState === 'unsupported' && (
                      <div className="text-[10px] text-white/40">No compass sensor — showing true north</div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setWalkIdx((i) => Math.max(0, i - 1))} disabled={walkIdx === 0}
                      className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-[12px] font-bold border-none cursor-pointer disabled:opacity-30">← Prev</button>
                    {hasTarget && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${curLat},${curLng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-[12px] font-bold no-underline">Open in Maps</a>
                    )}
                    <button onClick={() => setWalkIdx((i) => Math.min(total - 1, i + 1))} disabled={walkIdx >= total - 1}
                      className="px-4 py-2.5 rounded-xl bg-[#1D9E75] text-white text-[12px] font-bold border-none cursor-pointer disabled:opacity-30">Next →</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function StopCard({ stop, index, isActive, onClick }: { stop: GuideStop; index: number; isActive: boolean; onClick: () => void }) {
  return (
    <div id={`stop-${index}`} className={`border rounded-xl overflow-hidden mb-2.5 bg-[var(--bg-secondary)] transition-colors ${isActive ? 'border-[var(--color-primary)]' : 'border-[var(--border-color)]'}`}>
      <div className="px-3 py-[11px] flex gap-2.5 items-start cursor-pointer" onClick={onClick}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-[1px] ${isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-[#E1F5EE] text-[#085041]'}`}>
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-bold">{stop.name}</div>
          {stop.description && (
            <div className="text-[13px] text-[var(--text-secondary)] mt-[2px] leading-relaxed line-clamp-3">{stop.description}</div>
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
