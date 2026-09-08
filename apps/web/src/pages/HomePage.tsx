import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { guides, getCancelToken } from '../services/api'
import SEO from '../components/SEO'
import type { Guide, GuideFilters } from '../types'

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
  const [guidesList, setGuidesList] = useState<Guide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Guide[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
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
  }, [activeCategory, debouncedSearch, nearMeActive, userLocation])

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
      if (nearMeActive && userLocation) {
        filters.lat = userLocation.lat
        filters.lng = userLocation.lng
      }
      const res = await guides.list(filters)
      setGuidesList(res.data?.guides || [])
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      setGuidesList([])
      setError('Failed to load guides. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

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
      <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-3 flex items-center gap-2.5 sticky top-0 z-20 shrink-0">
        <h1 className="text-lg font-bold text-[#1D9E75] tracking-tight">
          Curio<span className="text-[#1D9E75]">City</span>
        </h1>
        <div className="flex-1 relative" role="search" ref={searchRef}>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b4b2a9] dark:text-[#706f6a]">
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
            className="w-full bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 rounded-full py-[7px] pl-[30px] pr-8 text-[13px] text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75]"
          />
          {search && (
            <button onClick={() => { setSearch(''); setSuggestions([]); setShowSuggestions(false) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#b4b2a9] dark:text-[#706f6a] hover:text-[#5f5e5a] dark:hover:text-[#a8a7a0] cursor-pointer bg-transparent border-none p-0">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl shadow-lg overflow-hidden z-30">
              {suggestions.map((g) => (
                <button key={g.id} onClick={() => handleSuggestionClick(g)}
                  className="w-full px-3 py-2.5 text-left hover:bg-[#f5f5f3] dark:hover:bg-[#272725] cursor-pointer bg-transparent border-none flex items-center gap-2.5">
                  <span className="text-[13px] font-bold truncate">{g.title}</span>
                  <span className="text-[11px] text-[#b4b2a9] dark:text-[#706f6a] ml-auto shrink-0">{g.city}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-[30px] h-[30px] rounded-full bg-[#1D9E75] flex items-center justify-center text-[11px] font-bold text-white cursor-pointer shrink-0">
          ?
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-[5px] bg-[#f5f5f3] dark:bg-[#272725] border-b border-black/10 dark:border-white/9 text-[11px] text-[#b4b2a9] dark:text-[#706f6a] flex items-center gap-[5px] shrink-0">
        <div className="w-[5px] h-[5px] rounded-full bg-[#1D9E75]"></div>
        <span aria-live="polite">{guidesList?.length || 0} guides available</span>
      </div>

      {/* Category Filter */}
      <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-2 flex gap-[6px] overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3 py-[5px] rounded-full border text-[12px] cursor-pointer whitespace-nowrap transition-all active:scale-95 ${
              activeCategory === cat.id
                ? 'bg-[#1D9E75] border-[#1D9E75] text-white font-bold'
                : 'bg-white dark:bg-[#1e1e1c] border-black/20 dark:border-white/18 text-[#5f5e5a] dark:text-[#a8a7a0]'
            }`}
          >
            {cat.label}
          </button>
        ))}
        <button
          onClick={handleNearMe}
          className={`shrink-0 px-3 py-[5px] rounded-full border text-[12px] cursor-pointer whitespace-nowrap transition-all active:scale-95 ${
            nearMeActive
              ? 'bg-[#1D9E75] border-[#1D9E75] text-white font-bold'
              : 'bg-white dark:bg-[#1e1e1c] border-black/20 dark:border-white/18 text-[#5f5e5a] dark:text-[#a8a7a0]'
          }`}
        >
          📍 Near Me
        </button>
      </div>

      {locationError && (
        <div className="px-4 py-2 bg-[#FFF3CD] dark:bg-[#3d3522] border-b border-[#FFD43B]/30 text-[12px] text-[#664D03] dark:text-[#FFD43B] flex items-center gap-2 shrink-0">
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="text-[#664D03] dark:text-[#FFD43B] font-bold cursor-pointer bg-transparent border-none text-[12px]">✕</button>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-[11px] min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" aria-live="polite" aria-busy="true" role="status">
            <div className="w-7 h-7 border-[2.5px] border-[#e5e4e7] border-t-[#1D9E75] rounded-full animate-spin"></div>
            <span className="sr-only">Loading guides</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] text-center">{error}</p>
            <button onClick={loadGuides} className="px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer">Retry</button>
          </div>
        ) : (guidesList || []).length === 0 ? (
          <div role="status" className="text-center py-12 text-[#5f5e5a] dark:text-[#a8a7a0] text-sm">No guides found</div>
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
  architecture: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
  history: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
  art: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
  nature: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
  characters: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
  general: 'bg-[#f5f5f3] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10',
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
    <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl overflow-hidden cursor-pointer hover:border-[#1D9E75] active:scale-[0.98] transition-all" onClick={onClick}>
      <div className="p-3">
        <div className="flex gap-[11px]">
          <div className="w-[86px] h-[76px] rounded-lg border border-black/10 dark:border-white/9 flex-shrink-0 overflow-hidden relative">
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
              {guide.duration && (
                <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#f5f5f3] dark:bg-[#272725] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10 dark:border-white/9">
                  ⏱ {guide.duration}
                </span>
              )}
              {guide.distance && (
                <span className="px-2 py-[3px] rounded-[10px] text-[11px] font-bold bg-[#f5f5f3] dark:bg-[#272725] text-[#5f5e5a] dark:text-[#a8a7a0] border border-black/10 dark:border-white/9">
                  📏 {guide.distance}
                </span>
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
