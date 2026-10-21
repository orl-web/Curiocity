// Parses Google Maps share/directions links into an ordered stop list.
// Supports the three public URL shapes Google emits:
//   1. Query:   /maps/dir/?api=1&origin=A&destination=B&waypoints=C|D
//   2. Path:    /maps/dir/A/B/C   (place names or "lat,lng" segments)
//   3. Place:   /maps/place/Name/@lat,lng,zoom  (single stop)
// Short links (maps.app.goo.gl / goo.gl) must be resolved by the caller
// before reaching this parser.

export interface ParsedRouteStop {
  name: string
  latitude?: number
  longitude?: number
}

const COORD_PAIR = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/

function parseCoordSegment(segment: string): ParsedRouteStop | null {
  const m = segment.match(COORD_PAIR)
  if (!m) return null
  const latitude = parseFloat(m[1])
  const longitude = parseFloat(m[2])
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, latitude, longitude }
}

function decodeSegment(raw: string): string {
  return decodeURIComponent(raw.replace(/\+/g, ' ')).trim()
}

// Strips Google's trailing data blobs: "/@lat,lng,z", "/data=...", "!4m..." etc.
function cleanPathname(pathname: string): string {
  return pathname
    .replace(/\/@[^]*$/, '')
    .replace(/\/data=[^]*$/, '')
    .replace(/\/!.*$/, '')
}

function nameFromPlace(raw: string): string {
  // Place URLs encode the name then often append ", City, Country" — keep it
  // whole, geocoding benefits from the extra context.
  return decodeSegment(raw)
}

function stopFromName(name: string): ParsedRouteStop | null {
  const coord = parseCoordSegment(name)
  if (coord) return coord
  const cleaned = name.replace(/,\s*$/, '').trim()
  if (!cleaned) return null
  return { name: cleaned.slice(0, 200) }
}

// /maps/dir/Colosseum/Roman%20Forum/41.89,12.49
function parseDirPath(pathname: string): ParsedRouteStop[] {
  const cleaned = cleanPathname(pathname)
  const afterDir = cleaned.split('/dir/')[1]
  if (afterDir == null) return []
  const segments = afterDir.split('/').filter(Boolean)
  const stops: ParsedRouteStop[] = []
  for (const seg of segments) {
    const stop = stopFromName(decodeSegment(seg))
    if (stop) stops.push(stop)
  }
  return stops
}

// /maps/dir/?api=1&origin=A&destination=B&waypoints=C%7CD
function parseDirQuery(search: string): ParsedRouteStop[] {
  const params = new URLSearchParams(search)
  if (params.get('api') !== '1') return []
  const parts: string[] = []
  const origin = params.get('origin')
  const destination = params.get('destination')
  const waypoints = params.get('waypoints')
  if (origin) parts.push(origin)
  if (waypoints) {
    for (const wp of waypoints.split('|')) {
      const trimmed = wp.trim()
      // "optimize:true" is a routing hint, not a stop.
      if (trimmed && !/^optimize:true$/i.test(trimmed)) parts.push(trimmed)
    }
  }
  if (destination) parts.push(destination)
  const stops: ParsedRouteStop[] = []
  for (const part of parts) {
    const stop = stopFromName(decodeSegment(part))
    if (stop) stops.push(stop)
  }
  return stops
}

// /maps/place/Colosseum/@41.8902,12.4922,17z
function parsePlaceUrl(url: URL): ParsedRouteStop[] {
  const cleaned = cleanPathname(url.pathname)
  const afterPlace = cleaned.split('/place/')[1]
  if (afterPlace == null) return []
  const nameSeg = afterPlace.split('/')[0]
  const name = nameFromPlace(nameSeg)
  const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (atMatch) {
    const latitude = parseFloat(atMatch[1])
    const longitude = parseFloat(atMatch[2])
    return [{ name: name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, latitude, longitude }]
  }
  const stop = stopFromName(name)
  return stop ? [stop] : []
}

export function parseGoogleMapsUrl(rawUrl: string): ParsedRouteStop[] {
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    return []
  }
  const host = url.hostname.toLowerCase()
  const isGoogle = /(^|\.)google\./.test(host) || host === 'goo.gl' || host === 'maps.app.goo.gl'
  if (!isGoogle) return []

  // api=1 query format wins when present (works on any path).
  if (url.searchParams.get('api') === '1' && url.search.includes('origin')) {
    const stops = parseDirQuery(url.search)
    if (stops.length > 0) return stops
  }

  const pathname = url.pathname
  if (pathname.includes('/dir/')) {
    const fromPath = parseDirPath(pathname)
    if (fromPath.length > 0) return fromPath
    // Some dir links carry everything in the query string.
    const fromQuery = parseDirQuery(url.search)
    if (fromQuery.length > 0) return fromQuery
  }
  if (pathname.includes('/place/')) return parsePlaceUrl(url)
  // Bare /maps/dir with no segments: try query params anyway.
  if (pathname.includes('/dir')) return parseDirQuery(url.search)
  return []
}

export function isGoogleMapsHost(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl.trim()).hostname.toLowerCase()
    return /(^|\.)google\./.test(host) || host === 'goo.gl' || host === 'maps.app.goo.gl'
  } catch {
    return false
  }
}

export function isShortGoogleLink(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl.trim()).hostname.toLowerCase()
    return host === 'maps.app.goo.gl' || host === 'goo.gl'
  } catch {
    return false
  }
}
