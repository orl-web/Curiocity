import type { Guide } from '../types'

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function sanitizeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function exportGpx(guide: Guide) {
  const stops = guide.stops || []
  const waypoints = stops
    .filter((s) => s.latitude != null && s.longitude != null)
    .map(
      (s, i) => `    <wpt lat="${s.latitude}" lon="${s.longitude}">
      <name>${sanitizeXml(s.name)}</name>
      <desc>${sanitizeXml(s.description || '')}</desc>
      <type>Stop ${i + 1}</type>
    </wpt>`
    )
    .join('\n')

  const trackpoints = stops
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => `        <trkpt lat="${s.latitude}" lon="${s.longitude}">
          <name>${sanitizeXml(s.name)}</name>
        </trkpt>`)
    .join('\n')

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CurioCity"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${sanitizeXml(guide.title)}</name>
    <desc>${sanitizeXml(guide.description || '')}</desc>
  </metadata>
${waypoints}
  <trk>
    <name>${sanitizeXml(guide.title)}</name>
    <trkseg>
${trackpoints}
    </trkseg>
  </trk>
</gpx>`

  downloadFile(gpx, `${guide.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx`, 'application/gpx+xml')
}

export function exportKml(guide: Guide) {
  const stops = guide.stops || []
  const placemarks = stops
    .filter((s) => s.latitude != null && s.longitude != null)
    .map(
      (s, i) => `      <Placemark>
        <name>${sanitizeXml(s.name)}</name>
        <description>${sanitizeXml(s.description || '')}</description>
        <Point>
          <coordinates>${s.longitude},${s.latitude},0</coordinates>
        </Point>
      </Placemark>`
    )
    .join('\n')

  const coords = stops
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => `${s.longitude},${s.latitude},0`)
    .join(' ')

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${sanitizeXml(guide.title)}</name>
    <description>${sanitizeXml(guide.description || '')}</description>
${placemarks}
    <Placemark>
      <name>Route</name>
      <LineString>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`

  downloadFile(kml, `${guide.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.kml`, 'application/vnd.google-earth.kml+xml')
}

export function exportJson(guide: Guide) {
  const data = {
    title: guide.title,
    city: guide.city,
    description: guide.description,
    category: guide.category,
    duration: guide.duration,
    distance: guide.distance,
    stops: (guide.stops || []).map((s) => ({
      name: s.name,
      description: s.description,
      latitude: s.latitude,
      longitude: s.longitude,
    })),
    costs: guide.costs || [],
    exportedAt: new Date().toISOString(),
    source: 'CurioCity',
  }

  downloadFile(JSON.stringify(data, null, 2), `${guide.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`, 'application/json')
}
