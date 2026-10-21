import type { TimeSlot } from '../types'

// Theme colors + symbols per category. The color doubles as the pin color on
// the map so the two surfaces never disagree.
export const CATEGORY_META: Record<string, { color: string; emoji: string; label: string; symbols: string[] }> = {
  food: { color: '#E24B4A', emoji: '🍽', label: 'Food', symbols: ['🍽', '🍷', '🥖', '🧀'] },
  architecture: { color: '#378ADD', emoji: '🏛', label: 'Architecture', symbols: ['🏛', '📐', '🗼', '🕌'] },
  history: { color: '#BA7517', emoji: '📜', label: 'History', symbols: ['📜', '🗿', '⚔', '🏰'] },
  art: { color: '#D4537E', emoji: '🎨', label: 'Art', symbols: ['🎨', '🖼', '🗿', '🎭'] },
  nature: { color: '#1D9E75', emoji: '🌿', label: 'Nature', symbols: ['🌿', '🌳', '🦋', '🏞'] },
  characters: { color: '#7B61FF', emoji: '🧑', label: 'Characters', symbols: ['🧑', '🚶', '🕯', '📜'] },
  general: { color: '#a8a7a0', emoji: '📍', label: 'Guide', symbols: ['📍', '🗺', '🧭', '🚶'] },
}

export function categoryMeta(category: string) {
  return CATEGORY_META[category] || CATEGORY_META.general
}

// Time-of-day band. Guides that declare a time slot use the first one; an
// anytime guide falls back to the viewer's current clock so the default scene
// still feels alive.
const BAND_META: Record<TimeSlot, { gradient: [string, string]; textColor: string; sunY: number; sunColor: string; sunOpacity: number; label: string }> = {
  morning: { gradient: ['#ff9f68', '#ffe3b8'], textColor: '#3a2a10', sunY: 60, sunColor: '#fff6c8', sunOpacity: 0.9, label: 'Morning' },
  afternoon: { gradient: ['#5aa9f0', '#d9f0ff'], textColor: '#10304a', sunY: 60, sunColor: '#fff6c8', sunOpacity: 0.9, label: 'Afternoon' },
  evening: { gradient: ['#7a4fd0', '#ff9aa8'], textColor: '#3d1d45', sunY: 150, sunColor: '#fff6c8', sunOpacity: 0.9, label: 'Evening' },
  night: { gradient: ['#0f1230', '#3a4590'], textColor: '#f1f1ff', sunY: 60, sunColor: '#f4f1d8', sunOpacity: 0.9, label: 'Night' },
}

export function bandMeta(slot: TimeSlot) {
  return BAND_META[slot]
}

function clockBand(): TimeSlot {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

export function guideBand(guide: { timeSlots?: TimeSlot[] | null }): { slot: TimeSlot; label: string; declared: boolean } {
  const slot = guide.timeSlots && guide.timeSlots.length > 0 ? guide.timeSlots[0] : clockBand()
  return { slot, label: BAND_META[slot].label, declared: !!(guide.timeSlots && guide.timeSlots.length > 0) }
}

// Deterministic PRNG so the same guide always renders the same skyline.
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) || 1
}

// The default ticket background: a time-of-day gradient with a skyline of
// theme-colored and dark building silhouettes, plus a sun or moon. Ported from
// the redesign mockup so the fallback still looks like a designed poster.
export function ticketSceneDataUri(guide: { title: string; category: string; timeSlots?: TimeSlot[] | null }): string {
  const { slot } = guideBand(guide)
  const { gradient, sunY, sunColor, sunOpacity } = BAND_META[slot]
  const { color } = categoryMeta(guide.category)
  const rand = seededRandom(hashString(guide.title || 'curiocity'))
  let buildings = ''
  for (let i = 0; i < 14; i++) {
    const w = 24 + rand() * 30
    const h = 40 + rand() * 90
    buildings += `<rect x="${i * 30 - 10}" y="${240 - h}" width="${w}" height="${h}" fill="${color}" opacity=".45"/>`
  }
  for (let i = 0; i < 8; i++) {
    const w = 30 + rand() * 40
    const h = 20 + rand() * 60
    buildings += `<rect x="${i * 55 - 10}" y="${240 - h}" width="${w}" height="${h}" fill="#000" opacity=".3"/>`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${gradient[0]}"/><stop offset="1" stop-color="${gradient[1]}"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="240" fill="url(#g)"/>` +
    `<circle cx="310" cy="${sunY}" r="28" fill="${sunColor}" opacity="${sunOpacity}"/>` +
    buildings + `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Three content symbols picked deterministically from the category pool.
export function guideSymbols(guide: { title: string; category: string }): string[] {
  const { symbols } = categoryMeta(guide.category)
  const rand = seededRandom(hashString(guide.title || 'x'))
  const picked: string[] = []
  const pool = [...symbols]
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  }
  return picked
}

// The wavy route line on the ticket. Positions come from stop count only (like
// the mockup), not geography, so it renders even for stops without GPS.
export function waveRouteSvg(stopCount: number, themeColor: string): string | null {
  const n = stopCount
  if (n < 2) return null
  const W = 300
  const H = 56
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    pts.push([12 + (i * (W - 24)) / (n - 1), H / 2 + (i % 2 ? 10 : -10)])
  }
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < n; i++) {
    const [a, b] = pts[i - 1]
    const [x, y] = pts[i]
    const m = (a + x) / 2
    d += ` C${m},${b} ${m},${y} ${x},${y}`
  }
  const dots = pts.map(([x, y], i) => {
    if (i === 0) return `<circle cx="${x}" cy="${y}" r="7" fill="#e03131"/>`
    if (i === n - 1) return `<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="${themeColor}" stroke-width="5"/>`
    return `<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="${themeColor}" stroke-width="3.5"/>`
  }).join('')
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${n} stops"><path d="${d}" fill="none" stroke="${themeColor}" stroke-width="4.5" stroke-linecap="round"/>${dots}</svg>`
}

export function priceLabel(guide: { priceModel: string; price?: number }): string {
  if (guide.priceModel === 'paid') {
    const cents = guide.price ?? 99
    return `€${(cents / 100).toFixed(2).replace(/\.00$/, '')}`
  }
  if (guide.priceModel === 'ad') return 'Ad'
  return 'Free'
}
