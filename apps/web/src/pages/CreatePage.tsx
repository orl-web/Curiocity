import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { guides, ai } from '../services/api'
import { parseGpsFile, type GpsPoint } from '../utils/gpsParsers'
import { parseDescriptionFile } from '../utils/fileParser'

const categories = ['Food', 'Architecture', 'History', 'Art', 'Nature', 'Characters']
const accessModels = ['free', 'paid', 'ad'] as const

export default function CreatePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [stops, setStops] = useState<{ name: string; description: string; latitude?: number; longitude?: number }[]>([])
  const [newStop, setNewStop] = useState('')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [ticketCost, setTicketCost] = useState('')
  const [mealCost, setMealCost] = useState('')
  const [transportCost, setTransportCost] = useState('')
  const [accessModel, setAccessModel] = useState<'free' | 'paid' | 'ad'>('free')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [isImportingGps, setIsImportingGps] = useState(false)
  const [isImportingDesc, setIsImportingDesc] = useState(false)
  const [gpsImportCount, setGpsImportCount] = useState(0)
  const gpsInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLInputElement>(null)

  const addStop = () => {
    if (newStop.trim()) {
      setStops([...stops, { name: newStop.trim(), description: '' }])
      setNewStop('')
    }
  }

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index))
  }

  const handleGpsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImportingGps(true)
    try {
      const points = await parseGpsFile(file)
      if (points.length === 0) {
        alert('No GPS points found in the file.')
        return
      }
      const importedStops = points.map((p) => ({
        name: p.name,
        description: p.description || '',
        latitude: p.latitude,
        longitude: p.longitude,
      }))
      setStops((prev) => [...prev, ...importedStops])
      setGpsImportCount((c) => c + importedStops.length)
      if (!city && points.length > 0) {
        const reverseGeocode = async (lat: number, lng: number) => {
          try {
            const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
            const data = await res.json()
            if (data.city) {
              const parts = [data.city, data.country].filter(Boolean)
              if (parts.length) setCity(parts.join(', '))
            }
          } catch {}
        }
        reverseGeocode(points[0].latitude, points[0].longitude)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to import GPS file')
    } finally {
      setIsImportingGps(false)
      if (gpsInputRef.current) gpsInputRef.current.value = ''
    }
  }

  const handleDescImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImportingDesc(true)
    try {
      const text = await parseDescriptionFile(file)
      if (!text.trim()) {
        alert('No text found in the file.')
        return
      }
      if (city && category) {
        try {
          const res = await ai.formatDescription({ rawText: text.trim(), city, category: category.toLowerCase() })
          setDescription(res.data.description)
        } catch {
          setDescription(text.trim())
        }
      } else {
        setDescription(text.trim())
      }
    } catch (err: any) {
      alert(err.message || 'Failed to import file')
    } finally {
      setIsImportingDesc(false)
      if (descInputRef.current) descInputRef.current.value = ''
    }
  }

  const generateDescriptions = async () => {
    if (stops.length === 0 || !title || !city || !category) return
    setIsGenerating(true)
    try {
      const res = await ai.generate({ title, city, category: category.toLowerCase(), stops: stops.map((s) => ({ name: s.name })) })
      const aiStops = res.data.stops
      setStops(stops.map((stop, i) => {
        const aiStop = aiStops.find((s: any) => s.name === stop.name) || aiStops[i]
        return { ...stop, description: aiStop?.desc || stop.description }
      }))
    } catch (err) {
      console.error('AI generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!title || !city || !category) return
    setIsPublishing(true)
    setPublishError(null)
    try {
      const costs: { tickets?: number; meals?: number; transport?: number } = {}
      if (ticketCost) { const v = parseFloat(ticketCost); if (!isNaN(v)) costs.tickets = v; }
      if (mealCost) { const v = parseFloat(mealCost); if (!isNaN(v)) costs.meals = v; }
      if (transportCost) { const v = parseFloat(transportCost); if (!isNaN(v)) costs.transport = v; }

      await guides.create({
        title,
        city,
        category: category.toLowerCase(),
        description,
        duration,
        distance,
        priceModel: accessModel,
        stops: stops.map((s, i) => ({
          name: s.name,
          description: s.description,
          stopOrder: i,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
        costs: Object.keys(costs).length > 0 ? costs : undefined,
      } as any)
      navigate('/')
    } catch (err: any) {
      setPublishError(err?.response?.data?.error || 'Failed to publish guide. Please try again.')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:bg-[#f5f5f3]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4L6 9l5 5"/>
          </svg>
        </button>
        <div className="flex-1 text-lg font-bold text-[#1D9E75]">new guide</div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-[15px] min-h-0">
        {/* Title */}
        <div className="flex flex-col gap-[5px]">
          <label htmlFor="guide-title" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Title</label>
          <input
            id="guide-title"
            type="text"
            value={title}
            aria-required="true"
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Hidden baroque gems in Palermo"
            className="bg-white dark:bg-[#1e1e1c] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75] w-full"
          />
        </div>

        {/* City */}
        <div className="flex flex-col gap-[5px]">
          <label htmlFor="guide-city" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">City</label>
          <input
            id="guide-city"
            type="text"
            value={city}
            aria-required="true"
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Palermo, Sicily"
            className="bg-white dark:bg-[#1e1e1c] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75] w-full"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-[5px]">
          <label id="category-label" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Category</label>
          <div className="grid grid-cols-3 gap-[7px]" role="radiogroup" aria-labelledby="category-label" aria-required="true">
            {categories.map((cat) => (
              <button
                key={cat}
                role="radio"
                aria-checked={category === cat}
                onClick={() => setCategory(cat)}
                className={`py-2 px-[5px] rounded-lg border text-[12px] font-bold cursor-pointer text-center ${
                  category === cat
                    ? 'bg-[#E1F5EE] border-[#1D9E75] text-[#085041]'
                    : 'bg-white dark:bg-[#1e1e1c] border-black/20 dark:border-white/18 text-[#5f5e5a] dark:text-[#a8a7a0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-[5px]">
          <div className="flex items-center justify-between">
            <label htmlFor="guide-description" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Teaser description</label>
            <input
              ref={descInputRef}
              type="file"
              accept=".txt,.md,.docx,.markdown"
              onChange={handleDescImport}
              className="hidden"
            />
            <button
              onClick={() => descInputRef.current?.click()}
              disabled={isImportingDesc}
              className="text-[11px] font-bold text-[#1D9E75] bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50"
            >
              {isImportingDesc ? 'Importing…' : '📄 Import file'}
            </button>
          </div>
          <textarea
            id="guide-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will travellers discover? Paste or import from .txt, .md, .docx files"
            className="bg-white dark:bg-[#1e1e1c] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75] w-full min-h-[68px] resize-none"
          />
        </div>

        {/* Stops */}
        <div className="flex flex-col gap-[5px]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Stops & curiosities</label>
            <input
              ref={gpsInputRef}
              type="file"
              accept=".gpx,.kml,.csv"
              onChange={handleGpsImport}
              className="hidden"
            />
            <button
              onClick={() => gpsInputRef.current?.click()}
              disabled={isImportingGps}
              className="text-[11px] font-bold text-[#1D9E75] bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50"
            >
              {isImportingGps ? 'Importing…' : `🗺 Import GPS${gpsImportCount > 0 ? ` (${gpsImportCount} added)` : ''}`}
            </button>
          </div>
          <div className="flex flex-col gap-[7px]">
            {stops.map((stop, index) => (
              <div key={index} className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-lg overflow-hidden">
                <div className="px-[10px] py-[9px] flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#E1F5EE] text-[#085041] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-[1px]">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-bold block truncate">{stop.name}</span>
                    {stop.latitude != null && stop.longitude != null && (
                      <span className="text-[10px] text-[#b4b2a9] dark:text-[#706f6a] block">{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</span>
                    )}
                  </div>
                  <button onClick={() => removeStop(index)} aria-label={`Remove stop ${stop.name}`} className="text-[#b4b2a9] dark:text-[#706f6a] cursor-pointer p-[2px] text-[15px]">✕</button>
                </div>
                {stop.description && (
                  <div className="px-[10px] pb-[10px] text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] border-t border-black/10 dark:border-white/9 pt-2">
                    {stop.description}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-[7px] mt-1.5">
            <label htmlFor="new-stop" className="sr-only">Add a stop</label>
            <input
              id="new-stop"
              type="text"
              value={newStop}
              onChange={(e) => setNewStop(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStop()}
              placeholder="Place or curiosity name"
              aria-label="Place or curiosity name"
              className="flex-1 bg-white dark:bg-[#1e1e1c] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75]"
            />
            <button onClick={addStop} aria-label="Add stop" className="px-3.5 py-[9px] rounded-lg bg-[#1D9E75] text-white border-none cursor-pointer text-[13px] font-bold whitespace-nowrap">
              + Add
            </button>
          </div>
          <button
            onClick={generateDescriptions}
            disabled={isGenerating || stops.length === 0 || !title || !city || !category}
            className="py-2.5 rounded-lg bg-[#E1F5EE] text-[#085041] text-[13px] font-bold border border-[#1D9E75] cursor-pointer w-full flex items-center justify-center gap-2 hover:bg-[#1D9E75] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="7,1 8.8,5.5 13.5,5.5 9.7,8.3 11.2,13 7,10 2.8,13 4.3,8.3 0.5,5.5 5.2,5.5"/>
            </svg>
            {isGenerating ? 'Generating…' : 'AI: Generate curiosity descriptions'}
          </button>
        </div>

        {/* Duration & Distance */}
        <div className="flex flex-col gap-[5px]">
          <label className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Duration & distance</label>
          <div className="flex gap-[7px]">
            <label htmlFor="guide-duration" className="sr-only">Duration</label>
            <input
              id="guide-duration"
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 1h 30m"
              aria-label="Duration"
              className="flex-1 bg-white dark:bg-[#1e1e1c] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75]"
            />
            <label htmlFor="guide-distance" className="sr-only">Distance</label>
            <input
              id="guide-distance"
              type="text"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 2.5km"
              aria-label="Distance"
              className="flex-1 bg-white dark:bg-[#1e1e1c] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75]"
            />
          </div>
        </div>

        {/* Costs */}
        <div className="flex flex-col gap-[5px]">
          <label className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Estimated costs (€)</label>
          <div className="grid grid-cols-3 gap-[7px]">
            <label htmlFor="ticket-cost" className="sr-only">Tickets cost</label>
            <input
              id="ticket-cost"
              type="text"
              value={ticketCost}
              onChange={(e) => setTicketCost(e.target.value)}
              placeholder="🎟 Tickets"
              aria-label="Tickets cost"
              className="bg-white dark:bg-[#1e1e1c] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75]"
            />
            <label htmlFor="meal-cost" className="sr-only">Meals cost</label>
            <input
              id="meal-cost"
              type="text"
              value={mealCost}
              onChange={(e) => setMealCost(e.target.value)}
              placeholder="🍽 Meals"
              aria-label="Meals cost"
              className="bg-white dark:bg-[#1e1e1c] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75]"
            />
            <label htmlFor="transport-cost" className="sr-only">Transport cost</label>
            <input
              id="transport-cost"
              type="text"
              value={transportCost}
              onChange={(e) => setTransportCost(e.target.value)}
              placeholder="🚌 Transport"
              aria-label="Transport cost"
              className="bg-white dark:bg-[#1e1e1c] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75]"
            />
          </div>
        </div>

        {/* Access Model */}
        <div className="flex flex-col gap-[5px]">
          <label id="access-model-label" className="text-[11px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] uppercase tracking-wider">Access model</label>
          <div className="flex gap-[7px]" role="radiogroup" aria-labelledby="access-model-label">
            {accessModels.map((model) => (
              <button
                key={model}
                role="radio"
                aria-checked={accessModel === model}
                onClick={() => setAccessModel(model)}
                className={`flex-1 py-[9px] rounded-lg border text-[12px] font-bold cursor-pointer ${
                  accessModel === model
                    ? 'border-[#1D9E75] text-[#1D9E75] bg-[#E1F5EE]'
                    : 'border-black/20 dark:border-white/18 bg-white dark:bg-[#1e1e1c] text-[#5f5e5a] dark:text-[#a8a7a0]'
                }`}
              >
                {model === 'free' ? 'Free' : model === 'paid' ? '€0.99 unlock' : 'Watch ad'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Publish Button */}
      <div className="px-4 py-3 bg-white dark:bg-[#1e1e1c] border-t border-black/10 dark:border-white/9 shrink-0">
        {publishError && (
          <div role="alert" className="mb-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center">{publishError}</div>
        )}
        <button
          onClick={handlePublish}
          disabled={isPublishing || !title || !city || !category || stops.length < 2}
          className="w-full py-3 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 7.5l4 4L13 3"/>
          </svg>
          {isPublishing ? 'Publishing…' : 'Publish guide'}
        </button>
      </div>
    </div>
  )
}
