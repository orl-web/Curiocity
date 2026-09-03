import { XMLParser } from 'fast-xml-parser'

export interface GpsPoint {
  name: string
  latitude: number
  longitude: number
  description?: string
  elevation?: number
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export async function parseGpx(file: File): Promise<GpsPoint[]> {
  const text = await readFileAsText(file)
  const parser = new XMLParser({ ignoreAttributes: false })
  const xml = parser.parse(text)

  const points: GpsPoint[] = []
  const gpx = xml.gpx || xml['gpx:gpx'] || xml

  const waypoints = gpx.wpt || []
  const wpts = Array.isArray(waypoints) ? waypoints : [waypoints]
  for (const wpt of wpts) {
    if (wpt['@_lat'] != null && wpt['@_lon'] != null) {
      points.push({
        name: wpt.name || wpt.desc || `Waypoint`,
        latitude: parseFloat(wpt['@_lat']),
        longitude: parseFloat(wpt['@_lon']),
        description: wpt.desc || undefined,
        elevation: wpt.ele ? parseFloat(wpt.ele) : undefined,
      })
    }
  }

  const tracks = gpx.trk || []
  const trks = Array.isArray(tracks) ? tracks : [tracks]
  for (const trk of trks) {
    const segments = trk.trkseg || []
    const segs = Array.isArray(segments) ? segments : [segments]
    for (const seg of segs) {
      const trackpoints = seg.trkpt || []
      const pts = Array.isArray(trackpoints) ? trackpoints : [trackpoints]
      for (const pt of pts) {
        if (pt['@_lat'] != null && pt['@_lon'] != null) {
          points.push({
            name: pt.name || pt.desc || `Track point ${points.length + 1}`,
            latitude: parseFloat(pt['@_lat']),
            longitude: parseFloat(pt['@_lon']),
            description: pt.desc || undefined,
            elevation: pt.ele ? parseFloat(pt.ele) : undefined,
          })
        }
      }
    }
  }

  const routes = gpx.rte || []
  const rte = Array.isArray(routes) ? routes : [routes]
  for (const r of rte) {
    const routePoints = r.rtept || []
    const rpt = Array.isArray(routePoints) ? routePoints : [routePoints]
    for (const pt of rpt) {
      if (pt['@_lat'] != null && pt['@_lon'] != null) {
        points.push({
          name: pt.name || pt.desc || `Route point ${points.length + 1}`,
          latitude: parseFloat(pt['@_lat']),
          longitude: parseFloat(pt['@_lon']),
          description: pt.desc || undefined,
        })
      }
    }
  }

  return points
}

export async function parseKml(file: File): Promise<GpsPoint[]> {
  const text = await readFileAsText(file)
  const parser = new XMLParser({ ignoreAttributes: false })
  const xml = parser.parse(text)

  const points: GpsPoint[] = []
  const kml = xml.kml || xml['kml:kml'] || xml
  const doc = kml.Document || kml.Folder || kml

  function extractPlacemarks(placemarks: any[]) {
    for (const pm of placemarks) {
      if (pm.Point) {
        const coords = (pm.Point.coordinates || '').split(',').map(Number)
        if (coords.length >= 2) {
          points.push({
            name: pm.name || `Point ${points.length + 1}`,
            latitude: coords[1],
            longitude: coords[0],
            description: pm.description || undefined,
            elevation: coords[2] || undefined,
          })
        }
      }
      if (pm.LineString) {
        const coordsStr = (pm.LineString.coordinates || '').trim()
        const coordPairs = coordsStr.split(/\s+/)
        for (const pair of coordPairs) {
          const coords = pair.split(',').map(Number)
          if (coords.length >= 2) {
            points.push({
              name: pm.name || `Line point ${points.length + 1}`,
              latitude: coords[1],
              longitude: coords[0],
              elevation: coords[2] || undefined,
            })
          }
        }
      }
      if (pm.Placemark) {
        const innerPm = Array.isArray(pm.Placemark) ? pm.Placemark : [pm.Placemark]
        extractPlacemarks(innerPm)
      }
    }
  }

  const placemarks = doc.Placemark || []
  const pms = Array.isArray(placemarks) ? placemarks : [placemarks]
  extractPlacemarks(pms)

  return points
}

export async function parseCsv(file: File): Promise<GpsPoint[]> {
  const text = await readFileAsText(file)
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''))
  const latIdx = header.findIndex((h) => h === 'lat' || h === 'latitude')
  const lngIdx = header.findIndex((h) => h === 'lng' || h === 'lon' || h === 'longitude' || h === 'long')
  const nameIdx = header.findIndex((h) => h === 'name' || h === 'title' || h === 'label' || h === 'description')

  if (latIdx === -1 || lngIdx === -1) return []

  const points: GpsPoint[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''))
    const lat = parseFloat(cols[latIdx])
    const lng = parseFloat(cols[lngIdx])
    if (!isNaN(lat) && !isNaN(lng)) {
      points.push({
        name: nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : `Stop ${points.length + 1}`,
        latitude: lat,
        longitude: lng,
      })
    }
  }

  return points
}

export async function parseGeoJson(file: File): Promise<GpsPoint[]> {
  const text = await readFileAsText(file)
  const json = JSON.parse(text)
  const points: GpsPoint[] = []

  function extractCoords(geometry: any) {
    if (!geometry) return
    if (geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates
      if (lat != null && lng != null) points.push({ name: `Point ${points.length + 1}`, latitude: lat, longitude: lng })
    } else if (geometry.type === 'LineString') {
      for (const [lng, lat] of geometry.coordinates) {
        if (lat != null && lng != null) points.push({ name: `Line point ${points.length + 1}`, latitude: lat, longitude: lng })
      }
    } else if (geometry.type === 'Polygon') {
      for (const [lng, lat] of geometry.coordinates[0]) {
        if (lat != null && lng != null) points.push({ name: `Polygon point ${points.length + 1}`, latitude: lat, longitude: lng })
      }
    } else if (geometry.type === 'MultiPoint' || geometry.type === 'MultiLineString') {
      for (const coord of geometry.coordinates) {
        if (geometry.type === 'MultiLineString') {
          for (const [lng, lat] of coord) {
            if (lat != null && lng != null) points.push({ name: `Point ${points.length + 1}`, latitude: lat, longitude: lng })
          }
        } else {
          const [lng, lat] = coord
          if (lat != null && lng != null) points.push({ name: `Point ${points.length + 1}`, latitude: lat, longitude: lng })
        }
      }
    }
  }

  function extractFeature(feat: any) {
    if (feat.geometry) {
      extractCoords(feat.geometry)
      if (feat.properties?.name && points.length > 0) {
        points[points.length - 1].name = feat.properties.name
      }
    }
  }

  if (json.type === 'FeatureCollection') {
    for (const feat of json.features || []) extractFeature(feat)
  } else if (json.type === 'Feature') {
    extractFeature(json)
  } else {
    throw new Error('Invalid GeoJSON: must be FeatureCollection or Feature')
  }

  return points
}

export async function parseGpsFile(file: File): Promise<GpsPoint[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'gpx':
      return parseGpx(file)
    case 'kml':
      return parseKml(file)
    case 'csv':
      return parseCsv(file)
    case 'geojson':
    case 'json':
      return parseGeoJson(file)
    default:
      throw new Error(`Unsupported file format: .${ext}. Use .gpx, .kml, .csv, or .geojson`)
  }
}
