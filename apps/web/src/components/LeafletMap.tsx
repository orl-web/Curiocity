import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Stop {
  name: string
  latitude?: number | null
  longitude?: number | null
  description?: string
}

interface LeafletMapProps {
  stops: Stop[]
  activeStop?: number | null
  onStopClick?: (index: number) => void
  height?: string
}

function makeIcon(index: number, active: boolean) {
  const size = active ? 30 : 24
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${active ? '#E24B4A' : '#1D9E75'};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${active ? 13 : 11}px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff;">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function LeafletMap({ stops, activeStop = null, onStopClick, height = '260px' }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const onStopClickRef = useRef(onStopClick)
  onStopClickRef.current = onStopClick

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const validStops: { stop: Stop; idx: number; lat: number; lng: number }[] = []
    stops.forEach((s, i) => {
      const lat = Number(s.latitude)
      const lng = Number(s.longitude)
      if (s.latitude != null && s.longitude != null && !isNaN(lat) && !isNaN(lng)) {
        validStops.push({ stop: s, idx: i, lat, lng })
      }
    })

    if (validStops.length === 0) {
      map.setView([41.9, 12.5], 2)
      return
    }

    const coords: L.LatLngExpression[] = validStops.map((v) => [v.lat, v.lng])

    validStops.forEach((v) => {
      const marker = L.marker([v.lat, v.lng], { icon: makeIcon(v.idx, activeStop === v.idx) })
        .addTo(map)
        .bindTooltip(v.stop.name, { permanent: false, direction: 'top', offset: [0, -6] })

      marker.on('click', () => onStopClickRef.current?.(v.idx))

      markersRef.current.push(marker)
    })

    if (activeStop != null) {
      const match = validStops.find((v) => v.idx === activeStop)
      if (match) {
        map.setView([match.lat, match.lng], Math.max(map.getZoom(), 15), { animate: true })
      }
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [30, 30], maxZoom: 16 })
    }
  }, [stops, activeStop])

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      role="img"
      aria-label="Map showing guide stops"
    />
  )
}
