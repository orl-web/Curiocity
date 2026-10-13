import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { guides, getCancelToken } from '../services/api'
import SEO from '../components/SEO'
import { GuideSkeletonList } from '../components/Skeleton'
import { useI18n } from '../i18n'
import { classifyApiError, type ApiFailure } from '../utils/apiError'
import { getAllOfflineGuides } from '../utils/offlineStorage'
import type { Guide, GuideFilters, TimeSlot } from '../types'

const TIME_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night']
const TIME_SLOT_EMOJI: Record<TimeSlot, string> = { morning: '🌅', afternoon: '☀️', evening: '🌇', night: '🌙' }

const categories = [
  { id: 'all', label: 'All' },
  { id: 'food', label: '🍽 Food' },
  { id: 'architecture', label: '🏛 Architecture' },
  { id: 'history', label: '📜 History' },
  { id: 'art', label: '🎨 Art' },
  { id: 'nature', label: '🌿 Nature' },
  { id: 'characters', label: '🧑 Characters' },
  { id: 'free', label: 'Free' },
]

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

      {/* Status Bar */}
      <div className="px-4 py-[5px] bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-[11px] text-[var(--text-muted)] flex items-center gap-[5px] shrink-0" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
        <div className="w-[5px] h-[5px] rounded-full" style={{ background: 'var(--color-primary)' }}></div>
        <span aria-live="polite">{guidesList?.length || 0} {t('home.guidesAvailable')}</span>
      </div>

      {/* Category Filter */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-2 flex gap-[6px] overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3 py-[5px] rounded-full border text-[12px] cursor-pointer whitespace-nowrap transition-all active:scale-95 ${
              activeCategory === cat.id
                ? 'font-bold text-white'
                : 'bg-[var(--bg-secondary)] border-black/20 dark:border-white/18 text-[var(--text-secondary)]'
            }`}
            style={activeCategory === cat.id ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : undefined}
          >
            {cat.label}
          </button>
        ))}
        <button
          onClick={handleNearMe}
          className={`shrink-0 px-3 py-[5px] rounded-full border text-[12px] cursor-pointer whitespace-nowrap transition-all active:scale-95 ${
            nearMeActive
              ? 'font-bold text-white'
              : 'bg-[var(--bg-secondary)] border-black/20 dark:border-white/18 text-[var(--text-secondary)]'
          }`}
          style={nearMeActive ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : undefined}
        >
          📍 Near Me
        </button>
      </div>

      {/* Time-of-day filter */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-2 flex gap-[6px] overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none', background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <span className="shrink-0 self-center text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide">{t('time.filter')}</span>
        {TIME_SLOTS.map((slot) => (
          <button
            key={slot}
            onClick={() => setTimeSlots((prev) => prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot])}
            aria-pressed={timeSlots.includes(slot)}
            className={`shrink-0 px-3 py-[5px] rounded-full border text-[12px] cursor-pointer whitespace-nowrap transition-all active:scale-95 ${
              timeSlots.includes(slot)
                ? 'bg-[#7B61FF] border-[#7B61FF] text-white font-bold'
                : 'bg-[var(--bg-secondary)] border-black/20 dark:border-white/18 text-[var(--text-secondary)]'
            }`}
          >
            {TIME_SLOT_EMOJI[slot]} {t(`time.${slot}` as any)}
          </button>
        ))}
        {timeSlots.length > 0 && (
          <button
            onClick={() => setTimeSlots([])}
            className="shrink-0 px-3 py-[5px] rounded-full border border-black/20 dark:border-white/18 text-[12px] cursor-pointer whitespace-nowrap bg-transparent text-[var(--text-secondary)]"
          >
            ✕
          </button>
        )}
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

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-[11px] min-h-0">
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
          (guidesList || []).map((guide, index) => (
            <GuideCard key={guide.id} guide={guide} index={index} onClick={() => navigate(`/guide/${guide.id}`)} />
          ))
        )}
      </div>
    </div>
  )
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

const placeholderColors = [
  ['#1D9E75', '#158563'], ['#E24B4A', '#c43c3c'], ['#BA7517', '#9a6114'],
  ['#378ADD', '#2d73b8'], ['#8B5CF6', '#7340d9'], ['#EC4899', '#d63384'],
  ['#F59E0B', '#d97706'], ['#06B6D4', '#0891b2'],
]

const categoryIcons: Record<string, string> = {
  food: '🍽', architecture: '🏛', history: '📜', art: '🎨', nature: '🌿', characters: '🧑', general: '📍',
}

const categoryColors: Record<string, string> = {
  food: 'bg-[#E1F5EE] text-[#085041]',
  architecture: 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-black/10',
  history: 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-black/10',
  art: 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-black/10',
  nature: 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-black/10',
  characters: 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-black/10',
  general: 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-black/10',
}

function GuideCard({ guide, onClick, index }: { guide: Guide; onClick: () => void; index: number }) {
  const hash = hashCode(guide.id + guide.title)
  const [bg, accent] = placeholderColors[hash % placeholderColors.length]
  const icon = categoryIcons[guide.category] || '📍'
  const isFirstTwo = index < 2

  const mapSvg = useMemo(() => {
    if (!isFirstTwo) return null
    const stops = guide.stops || []
    const valid = stops.filter(s => s.latitude && s.longitude)
    if (valid.length === 0) return null
    const lats = valid.map(s => Number(s.latitude))
    const lngs = valid.map(s => Number(s.longitude))
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const pad = 0.005
    const w = 176, h = 140
    const toX = (lng: number) => ((lng - (minLng - pad)) / ((maxLng + pad) - (minLng - pad))) * w
    const toY = (lat: number) => h - ((lat - (minLat - pad)) / ((maxLat + pad) - (minLat - pad))) * h
    const points = valid.map((s, i) => {
      const x = toX(Number(s.longitude))
      const y = toY(Number(s.latitude))
      return `<circle cx="${x}" cy="${y}" r="8" fill="${i === 0 ? '#E24B4A' : '#1D9E75'}" stroke="white" stroke-width="2"/>` +
        `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="white" font-size="8" font-weight="700">${i + 1}</text>`
    }).join('')
    const pathD = valid.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(Number(s.longitude))},${toY(Number(s.latitude))}`).join(' ')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect width="${w}" height="${h}" fill="#E8F5E9" rx="8"/>` +
      `<path d="${pathD}" fill="none" stroke="#1D9E75" stroke-width="2" stroke-dasharray="4,3" opacity="0.6"/>` +
      points + `</svg>`
  }, [guide, isFirstTwo])

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden cursor-pointer hover:border-[var(--color-primary)] active:scale-[0.98] transition-all" onClick={onClick}>
      <div className="p-3">
        <div className="flex gap-[11px]">
          <div className="w-[86px] h-[76px] rounded-lg border border-[var(--border-color)] flex-shrink-0 overflow-hidden relative">
            {isFirstTwo && mapSvg ? (
              <div dangerouslySetInnerHTML={{ __html: mapSvg }} className="w-full h-full" />
            ) : (guide as any).coverImageUrl || guide.coverImage ? (
              <img src={(guide as any).coverImageUrl || guide.coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: `linear-gradient(135deg, ${bg}, ${accent})` }}>
                {icon}
              </div>
            )}
            {/* Price badge bottom-left on miniature */}
            {guide.priceModel !== 'free' && (
              <div className="absolute bottom-1 left-1 px-1.5 py-[2px] rounded-[6px] text-[9px] font-bold bg-black/60 text-white backdrop-blur-sm">
                {guide.priceModel === 'paid' ? '€0.99' : 'Ad'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold leading-[1.3] mb-1 line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>{guide.title}</div>
            <div className="flex items-center gap-[5px] mb-[5px]">
              <div className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] text-white font-bold shrink-0" style={{ background: 'var(--color-primary)' }}>
                {guide.user?.displayName?.charAt(0) || '?'}
              </div>
              <span className="text-[12px] text-[var(--text-secondary)] truncate">{guide.user?.displayName || 'Creator'}</span>
            </div>
            <div className="flex flex-wrap gap-[5px]">
              <span className={`px-2 py-[3px] rounded-[10px] text-[11px] font-bold ${categoryColors[guide.category] || 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}>
                {guide.category}
              </span>
              {guide.duration && (
                <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                  ⏱ {guide.duration}
                </span>
              )}
              {guide.distance && (
                <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                  📏 {guide.distance}
                </span>
              )}
              {guide.timeSlots && guide.timeSlots.length > 0 && guide.timeSlots.length < 4 && (
                <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#7B61FF]/10 text-[#7B61FF] border border-[#7B61FF]/20">
                  {guide.timeSlots.map((s) => TIME_SLOT_EMOJI[s]).join(' ')}
                </span>
              )}
              {guide.validUntil && (
                <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#E24B4A]/10 text-[#E24B4A] border border-[#E24B4A]/20">
                  ⏱ Limited
                </span>
              )}
              {guide.recurrence && (
                <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#378ADD]/10 text-[#378ADD] border border-[#378ADD]/20">
                  🔁
                </span>
              )}
            </div>
            {Number(guide.rating) > 0 && (
              <div className="text-[11px] text-[#BA7517] mt-1">{Number(guide.rating).toFixed(1)}★</div>
            )}
          </div>
        </div>
      </div>
      <div className="px-3 py-2 border-t border-[var(--border-color)] flex items-center justify-between">
        <span className="text-[12px] font-bold">
          {guide.priceModel === 'free' ? (
            <span className="text-[var(--color-primary)]">Free</span>
          ) : guide.priceModel === 'paid' ? (
            <span className="text-[#BA7517]">€0.99</span>
          ) : (
            <span className="text-[var(--text-secondary)]">Watch ad</span>
          )}
        </span>
        <span className="text-[12px] text-[var(--text-muted)]">
          {guide.distance_km != null && <span className="text-[var(--color-primary)] font-bold mr-2">{guide.distance_km} km</span>}
          {guide.city}
        </span>
      </div>
    </div>
  )
}
