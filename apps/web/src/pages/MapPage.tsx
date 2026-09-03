import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { guides } from '../services/api'
import { getAllOfflineGuides } from '../utils/offlineStorage'
import { getAllImportedLocations } from '../utils/importedLocations'
import { sanitizeHtml } from '../utils/sanitize'
import SEO from '../components/SEO'
import type { Guide } from '../types'
import type { ImportedLocation } from '../utils/importedLocations'

const ROUTE_COLORS = ['#1D9E75', '#E24B4A', '#378ADD', '#D4537E', '#BA7517', '#7B61FF', '#FF6B35', '#00B4D8']
const SAVED_COLOR = '#BA7517'

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

function stopNumberIcon(num: number, color: string, size = 22) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:#fff;color:${color};border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer;">${num}</div>`,
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
  const [loading, setLoading] = useState(true)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchCity, setSearchCity] = useState('')
  const [previewGuide, setPreviewGuide] = useState<Guide | null>(null)
  const [activeStopIdx, setActiveStopIdx] = useState<number>(0)
  const [showLayers, setShowLayers] = useState(false)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false, center: [41.9028, 12.4964], zoom: 13 })
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
    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const onMoveEnd = () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
      fetchTimerRef.current = setTimeout(() => {
        const c = map.getCenter()
        fetchGuides(c.lat, c.lng)
      }, 300)
    }
    map.on('moveend', onMoveEnd)
    return () => { map.off('moveend', onMoveEnd); if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current) }
  }, [])

  const fetchGuides = useCallback((lat: number, lng: number) => {
    setLoading(true)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    guides.list({ limit: 50, lat, lng, radius: 50 }).then((res) => {
      if (ctrl.signal.aborted) return
      setNearbyGuides(Array.isArray(res.data.guides || res.data) ? res.data.guides || res.data : [])
    }).catch(() => { if (!ctrl.signal.aborted) setNearbyGuides([]) })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
  }, [])

  useEffect(() => {
    if (userLat != null && userLng != null) {
      fetchGuides(userLat, userLng)
    } else {
      setLoading(true)
      guides.list({ limit: 50 }).then((res) => {
        setNearbyGuides(Array.isArray(res.data.guides || res.data) ? res.data.guides || res.data : [])
      }).catch(() => setNearbyGuides([])).finally(() => setLoading(false))
    }
    getAllOfflineGuides().then(setSavedGuides).catch(() => {})
    getAllImportedLocations().then(setImportedLocations).catch(() => {})
  }, [userLat, userLng, fetchGuides])

  useEffect(() => {
    if (userLat == null || userLng == null || !mapInstance.current) return
    const map = mapInstance.current
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon(), zIndexOffset: 1000 }).addTo(map).bindPopup('<strong>You are here</strong>')
    } else {
      userMarkerRef.current.setLatLng([userLat, userLng])
    }
  }, [userLat, userLng])

  const handleSearch = (city: string) => {
    setSearchCity(city)
    setShowSearch(false)
    setLoading(true)
    const params: any = { limit: 50 }
    if (city) params.city = city
    if (userLat != null && userLng != null) { params.lat = userLat; params.lng = userLng; params.radius = 500 }
    guides.list(params).then((res) => {
      const data = res.data.guides || res.data
      setNearbyGuides(Array.isArray(data) ? data : [])
      if (city && mapInstance.current && data[0]?.stops?.length) {
        const s = data[0].stops.find((st: any) => st.latitude && st.longitude) || data[0].stops[0]
        if (s?.latitude && s?.longitude) mapInstance.current.flyTo([Number(s.latitude), Number(s.longitude)], 14, { duration: 1 })
      }
    }).catch(() => setNearbyGuides([])).finally(() => setLoading(false))
  }

  const handleGuideClick = (guide: Guide, stopIdx = 0) => {
    setPreviewGuide(guide)
    setActiveStopIdx(stopIdx)
    const stops = (guide.stops || []).filter((s) => s.latitude != null && s.longitude != null)
    if (stops.length > 0 && mapInstance.current) {
      mapInstance.current.flyToBounds(L.latLngBounds(stops.map((s) => [Number(s.latitude), Number(s.longitude)])), { padding: [60, 60], maxZoom: 16, duration: 0.8 })
    }
  }

  const navigateStop = (dir: number) => {
    if (!previewGuide) return
    const stops = (previewGuide.stops || []).filter((s) => s.latitude != null && s.longitude != null)
    const next = activeStopIdx + dir
    if (next >= 0 && next < stops.length) {
      setActiveStopIdx(next)
      mapInstance.current?.flyTo([Number(stops[next].latitude), Number(stops[next].longitude)], 17, { duration: 0.5 })
    }
  }

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline && !(layer instanceof L.Marker)) map.removeLayer(layer)
      if (layer instanceof L.Marker && layer !== userMarkerRef.current) map.removeLayer(layer)
    })

    const filtered = nearbyGuides.filter((g) => {
      if (catFilter !== 'all' && g.category !== catFilter) return false
      if (durFilter !== 'all') {
        const m = parseInt(g.duration || '0') || (g.duration?.includes('h') ? parseInt(g.duration) * 60 : 0)
        if (durFilter === 'short' && m > 90) return false
        if (durFilter === 'medium' && (m < 60 || m > 150)) return false
        if (durFilter === 'long' && m < 120) return false
      }
      return true
    })

    const all: { guide: Guide; color: string; saved: boolean }[] = []
    if (showSaved) savedGuides.forEach((g) => all.push({ guide: g, color: SAVED_COLOR, saved: true }))
    if (showNearby) filtered.forEach((g, i) => {
      if (!savedGuides.find((s) => s.id === g.id)) all.push({ guide: g, color: ROUTE_COLORS[i % ROUTE_COLORS.length], saved: false })
    })

    all.forEach(({ guide, color, saved }) => {
      const stops = (guide.stops || []).filter((s) => s.latitude != null && s.longitude != null && !isNaN(Number(s.latitude)) && !isNaN(Number(s.longitude)))
      const cc = CATEGORY_COLORS[guide.category] || color

      if (stops.length < 2) {
        if (stops.length === 1) {
          L.marker([Number(stops[0].latitude), Number(stops[0].longitude)], { icon: categoryIcon(guide.category, cc) })
            .addTo(map).on('click', () => handleGuideClick(guide, 0))
        }
        return
      }

      const coords: L.LatLngExpression[] = stops.map((s) => [Number(s.latitude), Number(s.longitude)])
      L.polyline(coords, { color: cc, weight: saved ? 5 : 3, opacity: saved ? 0.9 : 0.7, dashArray: saved ? undefined : '10 6' })
        .addTo(map).on('click', (e: L.LeafletEvent) => { L.DomEvent.stopPropagation(e); handleGuideClick(guide) })

      stops.forEach((s, si) => {
        L.marker([Number(s.latitude), Number(s.longitude)], { icon: stopNumberIcon(si + 1, cc) })
          .addTo(map).on('click', (e: L.LeafletEvent) => { L.DomEvent.stopPropagation(e); handleGuideClick(guide, si) })
      })
    })

    if (showImported) {
      importedLocations.filter((l) => l.visible).forEach((loc) => {
        L.circleMarker([loc.latitude, loc.longitude], { radius: 7, color: loc.color, fillColor: loc.color, fillOpacity: 0.6, weight: 2 })
          .addTo(map).bindPopup(`<div style="font-family:system-ui;max-width:180px"><strong style="font-size:12px">📌 ${sanitizeHtml(loc.name)}</strong></div>`, { closeButton: false, offset: [0, -4] })
      })
    }
  }, [nearbyGuides, savedGuides, importedLocations, showSaved, showNearby, showImported, catFilter, durFilter])

  const filteredCount = nearbyGuides.filter((g) => catFilter === 'all' || g.category === catFilter).length
  const previewStops = previewGuide?.stops?.filter((s) => s.latitude != null && s.longitude != null) || []

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
        <div className="absolute inset-0 z-[1002] bg-black/40 flex flex-col" onClick={() => setShowSearch(false)}>
          <div className="bg-white dark:bg-[#1e1e1c] mx-3 mt-3 rounded-2xl shadow-xl p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#b4b2a9" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>
              <input autoFocus type="text" placeholder="Search city…" value={searchCity} onChange={(e) => setSearchCity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchCity); if (e.key === 'Escape') setShowSearch(false) }}
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#b4b2a9]" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => { handleSearch(''); setSearchCity('') }} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#1D9E75] text-white cursor-pointer border-none">All</button>
              {CITIES.map((c) => (
                <button key={c} onClick={() => { handleSearch(c); setSearchCity(c) }}                 className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition-all ${searchCity === c ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'bg-white dark:bg-[#272725] border-black/10 dark:border-white/10 text-[#5f5e5a] dark:text-[#a8a7a0]'}`}>{c}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={mapRef} className="flex-1 w-full" />

      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001]">
          <div className="w-8 h-8 border-[3px] border-[#e5e4e7] border-t-[#1D9E75] rounded-full animate-spin"></div>
        </div>
      )}

      {/* Top-right FABs */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button onClick={() => setShowSearch(true)} aria-label="Search"
          className="w-10 h-10 bg-[#1a1a18]/80 dark:bg-[#f5f5f3]/90 rounded-full shadow-lg flex items-center justify-center cursor-pointer backdrop-blur-sm">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>
        </button>
        <button onClick={() => setShowLayers(!showLayers)} aria-label="Layers"
          className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center cursor-pointer backdrop-blur-sm ${showLayers ? 'bg-[#1D9E75]' : 'bg-[#1a1a18]/80 dark:bg-[#f5f5f3]/90'}`}>
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
                catFilter === cat ? 'bg-[#1D9E75] border-[#1D9E75] text-white shadow-md' : 'bg-white/90 dark:bg-[#1e1e1c]/90 border-black/10 dark:border-white/10 text-[#5f5e5a] dark:text-[#a8a7a0] backdrop-blur-sm'
              }`}>
              {cat === 'all' ? 'All' : `${CATEGORY_EMOJI[cat] || ''}`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {DURATIONS.map((d) => (
            <button key={d} onClick={() => setDurFilter(d)}
              className={`px-2 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                durFilter === d ? 'bg-[#BA7517] border-[#BA7517] text-white' : 'bg-white/90 dark:bg-[#1e1e1c]/90 border-black/10 dark:border-white/10 text-[#5f5e5a] dark:text-[#a8a7a0] backdrop-blur-sm'
              }`}>
              {DUR_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Layers panel — toggleable */}
      {showLayers && (
        <div className="absolute bottom-16 left-3 z-[1000] bg-white/95 dark:bg-[#1e1e1c]/95 rounded-2xl shadow-xl p-3 backdrop-blur-sm w-[180px]">
          <div className="text-[10px] font-bold text-[#b4b2a9] uppercase tracking-wider mb-2">Layers</div>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input type="checkbox" checked={showNearby} onChange={(e) => setShowNearby(e.target.checked)} className="accent-[#1D9E75] w-3.5 h-3.5" />
            <span className="w-4 h-[2px]" style={{ borderTop: '2px dashed #1D9E75' }} />
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
          <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/9 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#378ADD] border-2 border-white shadow-sm" />
            <span className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">You</span>
          </div>
        </div>
      )}

      {/* Guide preview panel */}
      {previewGuide && (
        <div className="absolute bottom-14 left-3 right-3 z-[1000] bg-white dark:bg-[#1e1e1c] rounded-2xl shadow-2xl overflow-hidden border border-black/10 dark:border-white/9 max-h-[50vh] flex flex-col">
          <div className="px-4 py-3 border-b border-black/10 dark:border-white/9 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: CATEGORY_COLORS[previewGuide.category] + '20', color: CATEGORY_COLORS[previewGuide.category] }}>
              {CATEGORY_EMOJI[previewGuide.category] || '📍'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold leading-tight">{previewGuide.title}</div>
              <div className="text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] mt-0.5">{previewGuide.city} · {previewGuide.duration || '?'} · {previewStops.length} stops</div>
              {Number(previewGuide.rating) > 0 && <div className="text-[11px] text-[#BA7517] mt-0.5">{Number(previewGuide.rating).toFixed(1)}★</div>}
            </div>
            <button onClick={() => setPreviewGuide(null)} className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#5f5e5a] dark:text-[#a8a7a0] text-sm cursor-pointer shrink-0">✕</button>
          </div>

          {previewGuide.description && (
            <div className="px-4 py-2 text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] leading-relaxed border-b border-black/5 dark:border-white/5 line-clamp-2">
              {previewGuide.description}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-2">
            {previewStops.map((s, i) => (
              <div key={s.id || i}
                className={`flex items-center gap-2.5 py-2 cursor-pointer rounded-lg transition-colors ${i === activeStopIdx ? 'bg-[#1D9E75]/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                onClick={() => { setActiveStopIdx(i); mapInstance.current?.flyTo([Number(s.latitude), Number(s.longitude)], 17, { duration: 0.5 }) }}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === activeStopIdx ? 'bg-[#1D9E75] text-white' : 'bg-black/10 dark:bg-white/10 text-[#5f5e5a] dark:text-[#a8a7a0]'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate">{s.name}</div>
                  {s.description && <div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0] truncate">{s.description}</div>}
                </div>
                {i === activeStopIdx && previewStops.length > 1 && (
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); navigateStop(-1) }} disabled={i === 0}
                      className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] cursor-pointer disabled:opacity-30">◀</button>
                    <button onClick={(e) => { e.stopPropagation(); navigateStop(1) }} disabled={i === previewStops.length - 1}
                      className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] cursor-pointer disabled:opacity-30">▶</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-black/10 dark:border-white/9 flex gap-2">
            <button onClick={() => navigate(`/guide/${previewGuide.id}`)}
              className="flex-1 py-2.5 rounded-xl bg-[#1D9E75] text-white text-[13px] font-bold border-none cursor-pointer">
              Open Guide →
            </button>
            <button onClick={() => setPreviewGuide(null)}
              className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/9 text-[#5f5e5a] dark:text-[#a8a7a0] text-[13px] font-bold bg-transparent cursor-pointer">
              Close
            </button>
          </div>
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
