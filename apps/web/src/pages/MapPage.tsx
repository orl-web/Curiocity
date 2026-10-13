import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { guides } from '../services/api'
import { getAllOfflineGuides } from '../utils/offlineStorage'
import { getAllImportedLocations } from '../utils/importedLocations'
import { sanitizeHtml } from '../utils/sanitize'
import SEO from '../components/SEO'
import type { Guide, GuideStop, TimeSlot } from '../types'
import type { ImportedLocation } from '../utils/importedLocations'

const ROUTE_COLORS = ['#1D9E75', '#E24B4A', '#378ADD', '#D4537E', '#BA7517', '#7B61FF', '#FF6B35', '#00B4D8']
const SAVED_COLOR = '#BA7517'

const TIME_SLOT_META: Record<TimeSlot, { emoji: string; label: string }> = {
  morning: { emoji: '🌅', label: 'Morning' },
  afternoon: { emoji: '☀️', label: 'Afternoon' },
  evening: { emoji: '🌇', label: 'Evening' },
  night: { emoji: '🌙', label: 'Night' },
}

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍽', architecture: '🏛', history: '📜', art: '🎨', nature: '🌿', characters: '🧑', general: '📍',
}
const CATEGORY_COLORS: Record<string, string> = {
  food: '#E24B4A', architecture: '#378ADD', history: '#BA7517', art: '#D4537E', nature: '#1D9E75', characters: '#7B61FF', general: '#a8a7a0',
}

function categoryIcon(category: string, color: string, size = 28) {
  const emoji = CATEGORY_EMOJI[category] || '📍'
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${size > 24 ? 14 : 11}px;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid #fff;line-height:1;cursor:pointer;">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function stopNumberIcon(num: number, color: string, size = 22, active = false) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${active ? color : '#fff'};color:${active ? '#fff' : color};border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer;">${num}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function userIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#378ADD;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 2px #378ADD, 0 2px 8px rgba(0,0,0,.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

const DURATIONS = ['all', 'short', 'medium', 'long']
const DUR_LABELS: Record<string, string> = { all: 'All', short: '<1h', medium: '1-2h', long: '>2h' }
const CITIES = ['Rome', 'Paris', 'Amsterdam', 'Lisbon', 'Florence', 'Prague', 'Vienna', 'Athens', 'Dublin', 'Kyoto', 'Barcelona', 'Tokyo', 'Milan']

// Durations are free text: '2.5h', '1h 30m', '45m', '90 min'… parseInt() alone truncates
// at the decimal point or space, so '2.5h' became 2 minutes. Returns null when unknown.
function parseDurationMinutes(duration?: string | null): number | null {
  if (!duration) return null
  const s = duration.toLowerCase()
  const hours = s.match(/(\d+(?:\.\d+)?)\s*h/)
  const mins = s.match(/(\d+)\s*m/)
  if (!hours && !mins) return null
  const minutes = (hours ? parseFloat(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1], 10) : 0)
  return minutes > 0 ? Math.round(minutes) : null
}

// Shared by the map markers and the result count so the two can never disagree.
// Unknown durations match only the 'all' bucket.
function matchesFilters(g: Guide, catFilter: string, durFilter: string, timeFilter: TimeSlot[]): boolean {
  if (catFilter !== 'all' && g.category !== catFilter) return false
  if (durFilter !== 'all') {
    const m = parseDurationMinutes(g.duration)
    if (m == null) return false
    if (durFilter === 'short' && m >= 60) return false
    if (durFilter === 'medium' && (m < 60 || m > 120)) return false
    if (durFilter === 'long' && m <= 120) return false
  }
  if (timeFilter.length > 0) {
    const gSlots = g.timeSlots || []
    if (gSlots.length > 0 && !gSlots.some((s) => timeFilter.includes(s))) return false
  }
  return true
}

// Stops that can actually be plotted, preserving their original index so
// numbers in the preview strip still match the guide's stop list.
function positionedStops(guide: Guide): { stop: GuideStop; index: number }[] {
  return (guide.stops || [])
    .map((stop, index) => ({ stop, index }))
    .filter(({ stop }) => stop.latitude != null && stop.longitude != null && !isNaN(Number(stop.latitude)) && !isNaN(Number(stop.longitude)))
}

// Which stop to pin a guide on: the closest one to the user when we know
// where they are, otherwise the first stop.
function nearestStop(stops: ReturnType<typeof positionedStops>, lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return stops[0]
  let best = stops[0]
  let bestKm = Infinity
  for (const entry of stops) {
    const km = haversineKm(lat, lng, Number(entry.stop.latitude), Number(entry.stop.longitude))
    if (km < bestKm) { bestKm = km; best = entry }
  }
  return best
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function MapPage() {
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const [nearbyGuides, setNearbyGuides] = useState<Guide[]>([])
  const [savedGuides, setSavedGuides] = useState<Guide[]>([])
  const [importedLocations, setImportedLocations] = useState<ImportedLocation[]>([])
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [showSaved, setShowSaved] = useState(true)
  const [showNearby, setShowNearby] = useState(true)
  const [showImported, setShowImported] = useState(true)
  const [catFilter, setCatFilter] = useState<string>('all')
  const [durFilter, setDurFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchCity, setSearchCity] = useState('')
  const [previewGuide, setPreviewGuide] = useState<Guide | null>(null)
  const [activeStopIdx, setActiveStopIdx] = useState<number>(0)
  const [showLayers, setShowLayers] = useState(false)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Guides are drawn into baseLayerRef (one pin each) and only the selected
  // guide's route goes into selectedLayerRef, so toggling a filter no longer
  // tears down and rebuilds every marker on the map.
  const baseLayerRef = useRef<L.LayerGroup | null>(null)
  const selectedLayerRef = useRef<L.LayerGroup | null>(null)
  // Kept in a ref so the strip can be scrolled to center the active chip on
  // desktop, where it will not auto-scroll into view.
  const stopStripRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) { setGeoError('Geolocation not available — showing all guides'); return }
    const ctrl = new AbortController()
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (!ctrl.signal.aborted) { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) } },
      () => { if (!ctrl.signal.aborted) setGeoError('Location access denied — showing all guides') },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    )
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false, center: [41.9028, 12.4964], zoom: 13, preferCanvas: true })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => {
      setPreviewGuide(null)
      map.flyTo(e.latlng, Math.max(map.getZoom() + 2, 15), { duration: 0.8 })
    })
    baseLayerRef.current = L.layerGroup().addTo(map)
    selectedLayerRef.current = L.layerGroup().addTo(map)
    mapInstance.current = map

    // Leaflet measures the container once at init. The app shell is a flex
    // column, so the container's box can change afterwards (soft keyboard,
    // orientation, panels). Without this the tiles go grey or misalign.
    const invalidate = () => map.invalidateSize({ animate: false })
    const observer = new ResizeObserver(invalidate)
    observer.observe(mapRef.current)
    invalidate()

    return () => {
      observer.disconnect()
      map.remove()
      mapInstance.current = null
      baseLayerRef.current = null
      selectedLayerRef.current = null
    }
  }, [])

  const fetchAllGuides = useCallback((extra?: { city?: string }) => {
    setLoading(true)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    guides.list({ limit: 50, ...(extra || {}) }).then((res) => {
      if (ctrl.signal.aborted) return
      setNearbyGuides(Array.isArray(res.data.guides || res.data) ? res.data.guides || res.data : [])
    }).catch(() => { if (!ctrl.signal.aborted) setNearbyGuides([]) })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
  }, [])

  useEffect(() => {
    fetchAllGuides()
    getAllOfflineGuides().then(setSavedGuides).catch(() => {})
    getAllImportedLocations().then(setImportedLocations).catch(() => {})
  }, [fetchAllGuides])

  useEffect(() => {
    if (userLat == null || userLng == null || !mapInstance.current) return
    const map = mapInstance.current
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon(), zIndexOffset: 1000 }).addTo(map).bindPopup('<strong>You are here</strong>')
    } else {
      userMarkerRef.current.setLatLng([userLat, userLng])
    }
  }, [userLat, userLng])

  // Closing the overlay restores the full-height container, so Leaflet has to
  // be told to re-measure or the tiles stay aligned to the shrunken box.
  const closeSearch = () => {
    setShowSearch(false)
    requestAnimationFrame(() => mapInstance.current?.invalidateSize({ animate: false }))
  }

  const handleSearch = (city: string) => {
    setSearchCity(city)
    closeSearch()
    setLoading(true)
    const params: any = { limit: 50 }
    if (city) params.city = city
    if (userLat != null && userLng != null) { params.lat = userLat; params.lng = userLng; params.radius = 500 }
    guides.list(params).then((res) => {
      const data = res.data.guides || res.data
      setNearbyGuides(Array.isArray(data) ? data : [])
      // Land on the first stop, or on the guide's recorded centre if it has no
      // positioned stops, so a search never leaves the map parked on nothing.
      const first = Array.isArray(data) ? data[0] : undefined
      if (city && first && mapInstance.current) {
        const s = positionedStops(first)[0]
        const clat = Number(first.mapCenterLat), clng = Number(first.mapCenterLng)
        if (s) {
          mapInstance.current.flyTo([Number(s.stop.latitude), Number(s.stop.longitude)], 14, { duration: 1 })
        } else if (!isNaN(clat) && !isNaN(clng) && (clat !== 0 || clng !== 0)) {
          mapInstance.current.flyTo([clat, clng], 13, { duration: 1 })
        }
      }
    }).catch(() => setNearbyGuides([]))
      .finally(() => setLoading(false))
  }

  const handleGuideClick = (guide: Guide, stopIdx = 0) => {
    setPreviewGuide(guide)
    setActiveStopIdx(stopIdx)
    const stops = positionedStops(guide)
    if (stops.length > 0 && mapInstance.current) {
      mapInstance.current.flyToBounds(L.latLngBounds(stops.map((s) => [Number(s.stop.latitude), Number(s.stop.longitude)])), { padding: [60, 60], maxZoom: 16, duration: 0.8 })
    }
  }

  const navigateStop = (dir: number) => {
    if (!previewGuide) return
    const stops = positionedStops(previewGuide)
    const current = stops.findIndex((s) => s.index === activeStopIdx)
    const next = stops[current + dir]
    if (next) {
      setActiveStopIdx(next.index)
      mapInstance.current?.flyTo([Number(next.stop.latitude), Number(next.stop.longitude)], 17, { duration: 0.5 })
    }
  }

  useEffect(() => {
    const map = mapInstance.current
    const base = baseLayerRef.current
    if (!map || !base) return

    base.clearLayers()

    const filtered = nearbyGuides.filter((g) => matchesFilters(g, catFilter, durFilter, timeFilter))

    const all: { guide: Guide; color: string; saved: boolean }[] = []
    if (showSaved) savedGuides.forEach((g) => all.push({ guide: g, color: SAVED_COLOR, saved: true }))
    if (showNearby) filtered.forEach((g, i) => {
      if (!savedGuides.find((s) => s.id === g.id)) all.push({ guide: g, color: ROUTE_COLORS[i % ROUTE_COLORS.length], saved: false })
    })

    // One pin per guide. Drawing every stop of every guide produced 36 markers
    // for 9 guides, which made the map unreadable. The full route only appears
    // once a guide is selected (see the effect below).
    all.forEach(({ guide, color }) => {
      const stops = positionedStops(guide)
      const cc = CATEGORY_COLORS[guide.category] || color

      if (stops.length === 0) {
        const clat = Number(guide.mapCenterLat), clng = Number(guide.mapCenterLng)
        if (!isNaN(clat) && !isNaN(clng) && (clat !== 0 || clng !== 0)) {
          L.marker([clat, clng], { icon: categoryIcon(guide.category, cc) })
            .addTo(base).on('click', () => handleGuideClick(guide, 0))
        }
        return
      }

      // Anchor on whichever stop is closest to the user, falling back to the
      // first stop so guides still show up before geolocation resolves.
      const anchor = nearestStop(stops, userLat, userLng)
      L.marker([Number(anchor.stop.latitude), Number(anchor.stop.longitude)], { icon: categoryIcon(guide.category, cc) })
        .addTo(base).on('click', () => handleGuideClick(guide, anchor.index))
    })

    if (showImported) {
      importedLocations.filter((l) => l.visible).forEach((loc) => {
        L.circleMarker([loc.latitude, loc.longitude], { radius: 7, color: loc.color, fillColor: loc.color, fillOpacity: 0.6, weight: 2 })
          .addTo(base).bindPopup(`<div style="font-family:system-ui;max-width:180px"><strong style="font-size:12px">📌 ${sanitizeHtml(loc.name)}</strong></div>`, { closeButton: false, offset: [0, -4] })
      })
    }
  }, [nearbyGuides, savedGuides, importedLocations, showSaved, showNearby, showImported, catFilter, durFilter, timeFilter, userLat, userLng])

  // The selected guide's route lives in its own layer so it can be redrawn
  // when the active stop changes without touching the other guides.
  useEffect(() => {
    const selected = selectedLayerRef.current
    if (!selected) return
    selected.clearLayers()
    if (!previewGuide) return

    const stops = positionedStops(previewGuide)
    if (stops.length === 0) return
    const cc = CATEGORY_COLORS[previewGuide.category] || ROUTE_COLORS[0]

    if (stops.length > 1) {
      const coords: L.LatLngExpression[] = stops.map((s) => [Number(s.stop.latitude), Number(s.stop.longitude)])
      L.polyline(coords, { color: cc, weight: 4, opacity: 0.85, dashArray: '10 6' }).addTo(selected)
    }

    stops.forEach((s, si) => {
      const isActive = s.index === activeStopIdx
      L.marker([Number(s.stop.latitude), Number(s.stop.longitude)], { icon: stopNumberIcon(si + 1, cc, isActive ? 26 : 22, isActive) })
        .addTo(selected).on('click', (e: L.LeafletEvent) => { L.DomEvent.stopPropagation(e); setActiveStopIdx(s.index) })
    })
  }, [previewGuide, activeStopIdx])

  const filteredCount = nearbyGuides.filter((g) => matchesFilters(g, catFilter, durFilter, timeFilter)).length
  const previewStops = previewGuide ? positionedStops(previewGuide) : []
  const activeStopPos = previewStops.findIndex((s) => s.index === activeStopIdx)

  // Center the active stop chip in the strip. Works everywhere and does not
  // need scrollIntoView, which would also scroll the page container.
  useEffect(() => {
    const strip = stopStripRef.current
    if (!strip || activeStopPos < 0) return
    const chip = strip.children[0]?.children[activeStopPos] as HTMLElement | undefined
    if (!chip) return
    strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' })
  }, [activeStopPos])
  const directionsHref = activeStopPos >= 0 && previewStops[activeStopPos]
    ? `https://www.google.com/maps/dir/?api=1&destination=${previewStops[activeStopPos].stop.latitude},${previewStops[activeStopPos].stop.longitude}`
    : null

  return (
    <div className="flex flex-col h-full relative">
      <SEO title="Explore Map" description="Discover walking guides near you on the interactive map" />
      {geoError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] bg-[#FFF3CD] dark:bg-[#3d3522] border border-[#FFD43B]/30 text-[11px] text-[#664D03] dark:text-[#FFD43B] px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 backdrop-blur-sm max-w-[90%]">
          <span>{geoError}</span>
          <button onClick={() => setGeoError(null)} className="text-[#664D03] dark:text-[#FFD43B] font-bold cursor-pointer bg-transparent border-none text-[11px]">✕</button>
        </div>
      )}

      {/* Search overlay */}
      {showSearch && (
        <div className="absolute inset-0 z-[1002] bg-black/40 flex flex-col" onClick={closeSearch}>
          <div className="bg-[var(--bg-secondary)] mx-3 mt-3 rounded-2xl shadow-xl p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#b4b2a9" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>
              {/* No autoFocus: it opens the soft keyboard on mount, which shrinks
                  the viewport before Leaflet has measured the container. */}
              <input type="text" placeholder="Search city…" value={searchCity} onChange={(e) => setSearchCity(e.target.value)} enterKeyHint="search"
                onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(searchCity); e.currentTarget.blur() } if (e.key === 'Escape') closeSearch() }}
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-muted)]" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { handleSearch(''); setSearchCity('') }} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--color-primary)] text-white cursor-pointer border-none">All</button>
              {CITIES.map((c) => (
                <button key={c} onClick={() => { handleSearch(c); setSearchCity(c) }}                 className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition-all ${searchCity === c ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'bg-white dark:bg-[var(--bg-tertiary)] border-black/10 dark:border-white/10 text-[var(--text-secondary)]'}`}>{c}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Only in-flow child; the overlays below are absolute. flex-basis 0 +
          minHeight 0 lets it fill the dvh column without overflowing. */}
      <div ref={mapRef} className="w-full" style={{ flex: '1 1 0%', minHeight: 0 }} />

      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001]">
          <div className="w-8 h-8 border-[3px] border-[#e5e4e7] border-t-[var(--color-primary)] rounded-full animate-spin"></div>
        </div>
      )}

      {/* Top-right FABs */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button onClick={() => setShowSearch(true)} aria-label="Search"
          className="w-10 h-10 bg-[#1a1a18]/80 dark:bg-[#f5f5f3]/90 rounded-full shadow-lg flex items-center justify-center cursor-pointer backdrop-blur-sm">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>
        </button>
        <button onClick={() => setShowLayers(!showLayers)} aria-label="Layers"
          className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center cursor-pointer backdrop-blur-sm ${showLayers ? 'bg-[var(--color-primary)]' : 'bg-[#1a1a18]/80 dark:bg-[#f5f5f3]/90'}`}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5">
            <polygon points="8,1 15,5 15,11 8,15 1,11 1,5"/>
            <line x1="1" y1="5" x2="8" y2="9"/><line x1="15" y1="5" x2="8" y2="9"/>
          </svg>
        </button>
      </div>

      {/* Filter chips — single scrollable row */}
      <div className="absolute top-3 left-3 right-16 z-[1000]">
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {['all', 'food', 'architecture', 'history', 'art', 'nature', 'characters'].map((cat) => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer transition-all ${
                catFilter === cat ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md' : 'bg-white/90 dark:bg-[#1e1e1c]/90 border-black/10 dark:border-white/10 text-[var(--text-secondary)] backdrop-blur-sm'
              }`}>
              {cat === 'all' ? 'All' : `${CATEGORY_EMOJI[cat] || ''}`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {DURATIONS.map((d) => (
            <button key={d} onClick={() => setDurFilter(d)}
              className={`px-2 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                durFilter === d ? 'bg-[#BA7517] border-[#BA7517] text-white' : 'bg-white/90 dark:bg-[#1e1e1c]/90 border-black/10 dark:border-white/10 text-[var(--text-secondary)] backdrop-blur-sm'
              }`}>
              {DUR_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {(Object.keys(TIME_SLOT_META) as TimeSlot[]).map((t) => (
            <button key={t} onClick={() => setTimeFilter((prev) => prev.includes(t) ? prev.filter((s) => s !== t) : [...prev, t])}
              title={TIME_SLOT_META[t].label}
              className={`px-2 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                timeFilter.includes(t) ? 'bg-[#7B61FF] border-[#7B61FF] text-white' : 'bg-white/90 dark:bg-[#1e1e1c]/90 border-black/10 dark:border-white/10 text-[var(--text-secondary)] backdrop-blur-sm'
              }`}>
              {TIME_SLOT_META[t].emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Layers panel — toggleable */}
      {showLayers && (
        <div className="absolute bottom-16 left-3 z-[1000] bg-white/95 dark:bg-[#1e1e1c]/95 rounded-2xl shadow-xl p-3 backdrop-blur-sm w-[180px]">
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Layers</div>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input type="checkbox" checked={showNearby} onChange={(e) => setShowNearby(e.target.checked)} className="accent-[var(--color-primary)] w-3.5 h-3.5" />
            <span className="w-4 h-[2px]" style={{ borderTop: '2px dashed var(--color-primary)' }} />
            <span className="text-[12px] font-bold">Nearby ({filteredCount})</span>
          </label>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input type="checkbox" checked={showSaved} onChange={(e) => setShowSaved(e.target.checked)} className="accent-[#BA7517] w-3.5 h-3.5" />
            <span className="w-4 h-[2px] bg-[#BA7517]" />
            <span className="text-[12px] font-bold">Saved ({savedGuides.length})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showImported} onChange={(e) => setShowImported(e.target.checked)} className="accent-[#E24B4A] w-3.5 h-3.5" />
            <span className="w-3 h-3 rounded-full bg-[#E24B4A]" />
            <span className="text-[12px] font-bold">Imported ({importedLocations.length})</span>
          </label>
          <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#378ADD] border-2 border-white shadow-sm" />
            <span className="text-[11px] text-[var(--text-secondary)]">You</span>
          </div>
        </div>
      )}

      {/* Guide preview — compact card, same proportions as the Explore list card */}
      {previewGuide && (
        <div className="absolute bottom-14 left-3 right-3 z-[1000] bg-[var(--bg-secondary)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
          <div className="p-3">
            <div className="flex gap-[11px]">
              <div className="w-[56px] h-[56px] rounded-lg flex-shrink-0 flex items-center justify-center text-2xl"
                style={{ background: `linear-gradient(135deg, ${CATEGORY_COLORS[previewGuide.category]}33, ${CATEGORY_COLORS[previewGuide.category]}14)`, color: CATEGORY_COLORS[previewGuide.category] }}>
                {CATEGORY_EMOJI[previewGuide.category] || '📍'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold leading-[1.3] line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>{previewGuide.title}</div>
                <div className="text-[12px] text-[var(--text-secondary)] truncate mt-0.5">
                  {previewGuide.city} · {previewGuide.duration || '?'} · {previewStops.length} stops
                  {Number(previewGuide.rating) > 0 && <span className="text-[var(--color-accent)] font-bold"> · {Number(previewGuide.rating).toFixed(1)}★</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {previewGuide.timeSlots && previewGuide.timeSlots.length > 0 && previewGuide.timeSlots.map((t) => (
                    <span key={t} className="px-1.5 py-[2px] rounded-[8px] text-[9px] font-bold bg-[#7B61FF]/10 text-[#7B61FF]">{TIME_SLOT_META[t].emoji} {TIME_SLOT_META[t].label}</span>
                  ))}
                  {previewGuide.validUntil && (
                    <span className="px-1.5 py-[2px] rounded-[8px] text-[9px] font-bold bg-[#E24B4A]/10 text-[#E24B4A]">⏱ Limited</span>
                  )}
                  {previewGuide.recurrence && (
                    <span className="px-1.5 py-[2px] rounded-[8px] text-[9px] font-bold bg-[#378ADD]/10 text-[#378ADD]">🔁 {previewGuide.recurrence.daysOfWeek.map((d) => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d] || d).join(', ')}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setPreviewGuide(null)} aria-label="Close preview"
                className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-secondary)] text-sm cursor-pointer shrink-0">✕</button>
            </div>

            {/* Stop strip: <> steps through the guide, tapping flies the map */}
            {previewStops.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2.5">
                <button onClick={() => navigateStop(-1)} disabled={activeStopPos <= 0} aria-label="Previous stop"
                  className="w-7 h-7 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[11px] cursor-pointer disabled:opacity-30 shrink-0">‹</button>
                <div className="flex-1 min-w-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }} ref={stopStripRef}>
                  <div className="flex gap-1.5 w-max">
                    {previewStops.map(({ stop, index }, i) => (
                      <button key={index}
                        onClick={() => { setActiveStopIdx(index); mapInstance.current?.flyTo([Number(stop.latitude), Number(stop.longitude)], 17, { duration: 0.5 }) }}
                        className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all whitespace-nowrap ${
                          index === activeStopIdx
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                            : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}>
                        {i + 1}. {stop.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => navigateStop(1)} disabled={activeStopPos >= previewStops.length - 1} aria-label="Next stop"
                  className="w-7 h-7 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[11px] cursor-pointer disabled:opacity-30 shrink-0">›</button>
                {directionsHref && (
                  <a href={directionsHref} target="_blank" rel="noopener noreferrer" aria-label="Walking directions"
                    className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-[11px] shrink-0 no-underline">🚶</a>
                )}
              </div>
            )}
          </div>

          <button onClick={() => navigate(`/guide/${previewGuide.id}`)}
            className="w-full py-2.5 bg-[var(--color-primary)] text-white text-[13px] font-bold border-none cursor-pointer">
            Open Guide →
          </button>
        </div>
      )}

      {/* Bottom status bar */}
      {!previewGuide && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
          <div className="bg-[#1a1a18]/80 dark:bg-[#f5f5f3]/90 rounded-full shadow-lg px-3 py-1.5 backdrop-blur-sm pointer-events-auto">
            <span className="text-[11px] font-bold text-white dark:text-[#1a1a18]">
              {filteredCount} guides
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
