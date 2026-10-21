import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { guides, getCancelToken } from '../services/api'
import SEO from '../components/SEO'
import { GuideSkeletonList } from '../components/Skeleton'
import { useI18n } from '../i18n'
import { classifyApiError, type ApiFailure } from '../utils/apiError'
import { getAllOfflineGuides } from '../utils/offlineStorage'
import TicketGuideCard from '../components/TicketGuideCard'
import { bandMeta, categoryMeta } from '../utils/guideArt'
import type { Guide, GuideFilters, TimeSlot } from '../types'

const TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night']
const TIME_SLOT_EMOJI: Record<TimeSlot, string> = { morning: '🌅', afternoon: '☀️', evening: '🌇', night: '🌙' }

export default function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  // Set by RegisterPage after it uploads a guest's local draft.
  const [publishedNotice, setPublishedNotice] = useState(() => {
    const n = Number(new URLSearchParams(window.location.search).get('published') || 0)
    return Number.isFinite(n) && n > 0 ? n : null
  })
  const [guidesList, setGuidesList] = useState<Guide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiFailure | null>(null)
  // Seconds left on a rate-limit cooldown; the Retry button stays disabled
  // until it reaches zero, then retries on its own.
  const [retryIn, setRetryIn] = useState(0)
  const [offlineCount, setOfflineCount] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Guide[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [nearMeActive, setNearMeActive] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current) }
  }, [search])

  useEffect(() => {
    loadGuides()
  }, [activeCategory, debouncedSearch, nearMeActive, userLocation, timeSlots])

  useEffect(() => {
    if (search.length >= 2) {
      const timer = setTimeout(() => fetchSuggestions(), 300)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
    }
  }, [search])

  const fetchSuggestions = async () => {
    try {
      const res = await guides.list({ search, limit: 5 })
      setSuggestions(res.data?.guides || [])
    } catch {
      setSuggestions([])
    }
  }

  const loadGuides = async () => {
    setIsLoading(true)
    setError(null)
    setOfflineCount(null)
    getCancelToken('guides-list')
    try {
      const filters: GuideFilters = {}
      if (activeCategory !== 'all') {
        if (activeCategory === 'free') {
          filters.accessModel = 'free'
        } else {
          filters.category = activeCategory
        }
      }
      if (debouncedSearch) filters.search = debouncedSearch
      if (timeSlots.length > 0) filters.timeSlots = timeSlots
      if (nearMeActive && userLocation) {
        filters.lat = userLocation.lat
        filters.lng = userLocation.lng
      }
      const res = await guides.list(filters)
      setGuidesList(res.data?.guides || [])
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      const failure = classifyApiError(err)
      if (failure.kind === 'offline') {
        // Show whatever the user saved for offline instead of an empty error
        // screen — the whole point of caching guides on the device.
        const offline = await getAllOfflineGuides().catch(() => [] as Guide[])
        if (offline.length > 0) {
          setGuidesList(offline)
          setOfflineCount(offline.length)
        } else {
          setGuidesList([])
          setError(failure)
        }
      } else {
        setGuidesList([])
        setError(failure)
        if (failure.kind === 'rate-limited' && failure.retryAfterSec) setRetryIn(failure.retryAfterSec)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Tick the rate-limit cooldown down, then retry by itself once it expires.
  useEffect(() => {
    if (retryIn <= 0) return
    const timer = setTimeout(() => setRetryIn((r) => r - 1), 1000)
    return () => clearTimeout(timer)
  }, [retryIn])

  useEffect(() => {
    if (retryIn === 0 && error?.kind === 'rate-limited') loadGuides()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryIn, error])

  const handleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false)
      setUserLocation(null)
      setLocationError(null)
      return
    }
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setNearMeActive(true)
        setLocationError(null)
      },
      () => {
        setLocationError('Location permission denied. Showing all guides.')
        setNearMeActive(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  const handleSuggestionClick = (guide: Guide) => {
    setSearch('')
    setShowSuggestions(false)
    navigate(`/guide/${guide.id}`)
  }

  return (
    <div className="flex flex-col min-h-0">
      <SEO />
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-3 flex items-center gap-2.5 sticky top-0 z-20 shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
          Curio<span style={{ color: 'var(--color-primary)' }}>City</span>
        </h1>
        <div className="flex-1 relative" role="search" ref={searchRef}>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <circle cx="7" cy="7" r="4.5"/>
            <line x1="10.5" y1="10.5" x2="14" y2="14"/>
          </svg>
          <input
            type="text"
            placeholder="City, topic, guide…"
            aria-label="Search guides"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true) }}
            onFocus={() => search.length >= 2 && setShowSuggestions(true)}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-full py-[7px] pl-[30px] pr-8 text-[13px] text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
          />
          {search && (
            <button onClick={() => { setSearch(''); setSuggestions([]); setShowSuggestions(false) }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)] cursor-pointer bg-transparent border-none p-0">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-lg overflow-hidden z-30">
              {suggestions.map((g) => (
                <button key={g.id} onClick={() => handleSuggestionClick(g)}
                  className="w-full px-3 py-2.5 text-left hover:bg-[var(--bg-primary)] dark:hover:bg-[var(--bg-tertiary)] cursor-pointer bg-transparent border-none flex items-center gap-2.5">
                  <span className="text-[13px] font-bold truncate">{g.title}</span>
                  <span className="text-[11px] text-[var(--text-muted)] ml-auto shrink-0">{g.city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-[30px] h-[30px] rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[11px] font-bold text-white cursor-pointer shrink-0">
          ?
        </div>
      </div>

      {locationError && (
        <div className="px-4 py-2 bg-[#FFF3CD] dark:bg-[#3d3522] border-b border-[#FFD43B]/30 text-[12px] text-[#664D03] dark:text-[#FFD43B] flex items-center gap-2 shrink-0">
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="text-[#664D03] dark:text-[#FFD43B] font-bold cursor-pointer bg-transparent border-none text-[12px]">✕</button>
        </div>
      )}

      {publishedNotice !== null && (
        <div role="status" className="px-4 py-2 bg-[#E1F5EE] dark:bg-[#085041]/40 border-b border-[var(--color-primary)]/30 text-[12px] text-[#085041] dark:text-[#E1F5EE] flex items-center gap-2 shrink-0">
          <span>Welcome! Your guide {publishedNotice === 1 ? 'is' : `${publishedNotice} guides are`} now published.</span>
          <button
            onClick={() => { setPublishedNotice(null); navigate(location.pathname, { replace: true }) }}
            className="font-bold cursor-pointer bg-transparent border-none text-[12px] underline"
          >Dismiss</button>
        </div>
      )}

      {offlineCount !== null && (
        <div role="status" className="px-4 py-2 bg-[#FFF3CD] dark:bg-[#3d3522] border-b border-[#FFD43B]/30 text-[12px] text-[#664D03] dark:text-[#FFD43B] flex items-center gap-2 shrink-0">
          <span>Offline — showing {offlineCount} saved {offlineCount === 1 ? 'guide' : 'guides'}</span>
          <button onClick={loadGuides} className="font-bold cursor-pointer bg-transparent border-none text-[12px] underline">Try again</button>
        </div>
      )}

      {/* Feed — filters live here so they scroll away; only the header sticks */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-[11px] min-h-0">
        {/* Time-of-day tiles — single-select, band gradients from the ticket art */}
        <div className="grid grid-cols-4 gap-2 shrink-0">
          {TIME_SLOTS.map((slot) => {
            const meta = bandMeta(slot)
            const active = timeSlots.length === 1 && timeSlots[0] === slot
            return (
              <button
                key={slot}
                onClick={() => setTimeSlots(active ? [] : [slot])}
                aria-pressed={active}
                className="rounded-2xl py-2.5 flex flex-col items-center gap-0.5 cursor-pointer transition-all active:scale-95 border-2"
                style={{
                  background: `linear-gradient(165deg, ${meta.gradient[0]}, ${meta.gradient[1]})`,
                  color: meta.textColor,
                  borderColor: active ? 'var(--text-primary)' : 'transparent',
                  boxShadow: active ? '0 2px 10px rgba(0,0,0,.18)' : '0 1px 4px rgba(0,0,0,.08)',
                }}
              >
                <span className="text-[19px] leading-none" aria-hidden="true">{TIME_SLOT_EMOJI[slot]}</span>
                <span className="text-[10px] font-extrabold leading-none">{t(`time.${slot}` as any)}</span>
              </button>
            )
          })}
        </div>

        {/* Circular theme chips + Near Me + Free (mockup's th-row) */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 shrink-0" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={handleNearMe}
            aria-pressed={nearMeActive}
            className="shrink-0 flex flex-col items-center gap-1 cursor-pointer"
          >
            <span
              className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-[17px] border-2 transition-all"
              style={nearMeActive
                ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
                : { background: 'var(--bg-secondary)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
            >📍</span>
            <span className="text-[9px] font-bold text-[var(--text-secondary)] leading-none">Near Me</span>
          </button>
          {['all', 'food', 'architecture', 'history', 'art', 'nature', 'characters'].map((cat) => {
            const meta = cat === 'all' ? null : categoryMeta(cat)
            const active = activeCategory === cat
            const color = meta?.color || 'var(--color-primary)'
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={active}
                className="shrink-0 flex flex-col items-center gap-1 cursor-pointer"
              >
                <span
                  className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-[17px] border-2 transition-all"
                  style={active
                    ? { background: color, borderColor: color, color: '#fff' }
                    : { background: 'var(--bg-secondary)', borderColor: color, color }}
                >{meta?.emoji || '✨'}</span>
                <span className="text-[9px] font-bold text-[var(--text-secondary)] leading-none whitespace-nowrap">{meta?.label || 'All'}</span>
              </button>
            )
          })}
          <button
            onClick={() => setActiveCategory(activeCategory === 'free' ? 'all' : 'free')}
            aria-pressed={activeCategory === 'free'}
            className="shrink-0 flex flex-col items-center gap-1 cursor-pointer"
          >
            <span
              className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-[17px] border-2 transition-all"
              style={activeCategory === 'free'
                ? { background: '#BA7517', borderColor: '#BA7517', color: '#fff' }
                : { background: 'var(--bg-secondary)', borderColor: '#BA7517', color: '#BA7517' }}
            >🏷</span>
            <span className="text-[9px] font-bold text-[var(--text-secondary)] leading-none">Free</span>
          </button>
        </div>

        {isLoading ? (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading guides</span>
            <GuideSkeletonList count={3} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="text-3xl" aria-hidden="true">{error.kind === 'rate-limited' ? '⏳' : '📡'}</span>
            <p className="text-sm text-[var(--text-secondary)] text-center">{error.message}</p>
            <button
              onClick={loadGuides}
              disabled={retryIn > 0}
              aria-label="Retry loading guides"
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retryIn > 0 ? `Retry in ${retryIn}s` : 'Retry'}
            </button>
          </div>
        ) : (guidesList || []).length === 0 ? (
          <div role="status" className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <span className="text-3xl" aria-hidden="true">🔍</span>
            <p className="text-sm text-[var(--text-secondary)]">
              {search || activeCategory !== 'all' || nearMeActive || timeSlots.length > 0
                ? 'No guides match your filters — try a different category or clear the search.'
                : 'No guides yet — be the first to create one!'}
            </p>
            {search || activeCategory !== 'all' || nearMeActive || timeSlots.length > 0 ? (
              <button onClick={() => { setSearch(''); setActiveCategory('all'); setNearMeActive(false); setTimeSlots([]) }} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold border-none cursor-pointer">Clear filters</button>
            ) : (
              <Link to="/create" className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold no-underline">Create a guide</Link>
            )}
          </div>
        ) : (
          (guidesList || []).map((guide) => (
            <TicketGuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} />
          ))
        )}
      </div>
    </div>
  )
}
