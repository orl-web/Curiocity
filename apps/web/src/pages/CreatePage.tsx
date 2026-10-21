import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { guides, ai } from '../services/api'
import { parseGpsFile } from '../utils/gpsParsers'
import { parseDescriptionFile } from '../utils/fileParser'
import { useAuth } from '../hooks/useAuth'
import { saveGuestDraft, getLatestGuestDraft } from '../utils/guestDrafts'
import { resizeImageToDataUrl, uploadLocalImage } from '../utils/imageUpload'
import TicketGuideCard from '../components/TicketGuideCard'

const categories = ['Food', 'Architecture', 'History', 'Art', 'Nature', 'Characters']
const accessModels = ['free', 'paid', 'ad'] as const

export default function CreatePage() {
  const navigate = useNavigate()
  const { isGuest, user } = useAuth()
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
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [limitedEvent, setLimitedEvent] = useState(false)
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [recurDays, setRecurDays] = useState<number[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isImportingGps, setIsImportingGps] = useState(false)
  const [isImportingDesc, setIsImportingDesc] = useState(false)
  const [gpsImportCount, setGpsImportCount] = useState(0)
  const gpsInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLInputElement>(null)
  // Optional ticket + stub background photos. Guests keep a local data URL in
  // their draft; signed-in users upload immediately.
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [stubImageUrl, setStubImageUrl] = useState('')
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [isUploadingStub, setIsUploadingStub] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const stubInputRef = useRef<HTMLInputElement>(null)
  // Signed-out visitors do not publish to the server; their work is stored on
  // the device and uploaded by useAuth once they create an account.
  const [draftSaved, setDraftSaved] = useState(false)

  useEffect(() => {
    if (!isGuest) return
    let cancelled = false
    getLatestGuestDraft().then((draft) => {
      if (!draft || cancelled) return
      setTitle(draft.title || '')
      setCity(draft.city || '')
      setCategory(draft.category ? draft.category.charAt(0).toUpperCase() + draft.category.slice(1) : '')
      setDescription(draft.description || '')
      setDuration(draft.duration || '')
      setDistance(draft.distance || '')
      setAccessModel((draft.priceModel as 'free' | 'paid' | 'ad') || 'free')
      setTimeSlots(draft.timeSlots || [])
      setCoverImageUrl(draft.coverImageUrl || '')
      setStubImageUrl(draft.stubImageUrl || '')
      setStops((draft.stops || []).map((s) => ({ name: s.name, description: s.description || '', latitude: s.latitude ?? undefined, longitude: s.longitude ?? undefined })))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [isGuest])

  const addStop = () => {
    if (newStop.trim()) {
      setStops([...stops, { name: newStop.trim(), description: '' }])
      setNewStop('')
    }
  }

  const handleArtPick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'cover' | 'stub',
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const setInput = kind === 'cover' ? setCoverImageUrl : setStubImageUrl
    const setUploading = kind === 'cover' ? setIsUploadingCover : setIsUploadingStub
    setUploading(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      if (isGuest) {
        // Keep the resized data URL; uploadGuestDrafts converts it on signup.
        setInput(dataUrl)
      } else {
        setInput(await uploadLocalImage(dataUrl, 'guides'))
      }
    } catch {
      // Leave the previous selection in place on failure.
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index))
  }

  const handleGpsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setIsImportingGps(true)
    try {
      const points = await parseGpsFile(file)
      if (points.length === 0) {
        setImportError('No GPS points found in the file.')
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
    setImportError(null)
    setIsImportingDesc(true)
    try {
      const text = await parseDescriptionFile(file)
      if (!text.trim()) {
        setImportError('No text found in the file.')
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
      setImportError(err.message || 'Failed to import file')
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

      const payload = {
        title,
        city,
        category: category.toLowerCase(),
        description,
        duration,
        distance,
        priceModel: accessModel,
        coverImageUrl: coverImageUrl || undefined,
        stubImageUrl: stubImageUrl || undefined,
        timeSlots: timeSlots.length > 0 ? timeSlots : undefined,
        validFrom: limitedEvent && validFrom ? new Date(validFrom).toISOString() : undefined,
        validUntil: limitedEvent && validUntil ? new Date(validUntil).toISOString() : undefined,
        recurrence: limitedEvent && recurDays.length > 0 && timeSlots.length > 0 ? { daysOfWeek: recurDays, slots: timeSlots } : undefined,
        stops: stops.map((s, i) => ({
          name: s.name,
          description: s.description,
          stopOrder: i,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
        costs: Object.keys(costs).length > 0 ? costs : undefined,
      }

      if (isGuest) {
        await saveGuestDraft(payload)
        setDraftSaved(true)
        return
      }

      await guides.create(payload as never)
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
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:bg-[var(--bg-primary)]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4L6 9l5 5"/>
          </svg>
        </button>
        <div className="flex-1 text-lg font-bold text-[var(--color-primary)]">new guide</div>
      </div>

      {/* Signed-out confirmation: the draft lives on this device until an
          account exists, at which point useAuth uploads it. */}
      {draftSaved ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-4 text-center min-h-0">
          <span className="text-4xl" aria-hidden="true">📝</span>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>Draft saved on this device</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-[280px]">
            Create a free account and your guide “{title}” will be published automatically.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[280px]">
            <Link to="/register" className="py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-bold no-underline">Create account &amp; publish</Link>
            <button onClick={() => setDraftSaved(false)} className="py-2.5 rounded-xl border text-sm font-bold bg-transparent cursor-pointer" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              Keep editing
            </button>
          </div>
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-[15px] min-h-0">
        {/* Title */}
        <div className="flex flex-col gap-[5px]">
          <label htmlFor="guide-title" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Title</label>
          <input
            id="guide-title"
            type="text"
            value={title}
            aria-required="true"
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Hidden baroque gems in Palermo"
            className="bg-[var(--bg-secondary)] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] w-full"
          />
        </div>

        {/* City */}
        <div className="flex flex-col gap-[5px]">
          <label htmlFor="guide-city" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">City</label>
          <input
            id="guide-city"
            type="text"
            value={city}
            aria-required="true"
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Palermo, Sicily"
            className="bg-[var(--bg-secondary)] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] w-full"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-[5px]">
          <label id="category-label" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Category</label>
          <div className="grid grid-cols-3 gap-[7px]" role="radiogroup" aria-labelledby="category-label" aria-required="true">
            {categories.map((cat) => (
              <button
                key={cat}
                role="radio"
                aria-checked={category === cat}
                onClick={() => setCategory(cat)}
                className={`py-2 px-[5px] rounded-lg border text-[12px] font-bold cursor-pointer text-center ${
                  category === cat
                    ? 'bg-[#E1F5EE] border-[var(--color-primary)] text-[#085041]'
                    : 'bg-[var(--bg-secondary)] border-black/20 dark:border-white/18 text-[var(--text-secondary)]'
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
            <label htmlFor="guide-description" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Teaser description</label>
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
              className="text-[11px] font-bold text-[var(--color-primary)] bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50"
            >
              {isImportingDesc ? 'Importing…' : '📄 Import file'}
            </button>
          </div>
          <textarea
            id="guide-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will travellers discover? Paste or import from .txt, .md, .docx files"
            className="bg-[var(--bg-secondary)] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] w-full min-h-[68px] resize-none"
          />
        </div>

        {/* Cover artwork */}
        <div className="flex flex-col gap-[7px]">
          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Cover artwork <span className="normal-case font-medium opacity-70">(optional)</span></label>
          <div className="flex gap-[10px]">
            {/* Ticket photo picker + live preview */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleArtPick(e, 'cover')} className="hidden" />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="relative w-full aspect-[4/3] rounded-xl border border-dashed border-black/25 dark:border-white/25 bg-[var(--bg-secondary)] overflow-hidden cursor-pointer hover:border-[var(--color-primary)] transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-60"
              >
                {coverImageUrl ? (
                  <img src={coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <span className="text-xl" aria-hidden="true">🖼</span>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)]">{isUploadingCover ? 'Uploading…' : '📷 Ticket photo'}</span>
                  </>
                )}
                {coverImageUrl && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Remove ticket photo"
                    onClick={(e) => { e.stopPropagation(); setCoverImageUrl('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCoverImageUrl('') } }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 text-white text-[12px] flex items-center justify-center cursor-pointer"
                  >✕</span>
                )}
              </button>
              <span className="text-[10px] text-[var(--text-muted)] text-center">Ticket background</span>
            </div>
            {/* Stub photo picker + live preview */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <input ref={stubInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleArtPick(e, 'stub')} className="hidden" />
              <button
                type="button"
                onClick={() => stubInputRef.current?.click()}
                disabled={isUploadingStub}
                className="relative w-full aspect-[4/3] rounded-xl border border-dashed border-black/25 dark:border-white/25 bg-[var(--bg-secondary)] overflow-hidden cursor-pointer hover:border-[var(--color-primary)] transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-60"
              >
                {stubImageUrl ? (
                  <img src={stubImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <span className="text-xl" aria-hidden="true">🎟</span>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)]">{isUploadingStub ? 'Uploading…' : '📷 Stub photo'}</span>
                  </>
                )}
                {stubImageUrl && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Remove stub photo"
                    onClick={(e) => { e.stopPropagation(); setStubImageUrl('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStubImageUrl('') } }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 text-white text-[12px] flex items-center justify-center cursor-pointer"
                  >✕</span>
                )}
              </button>
              <span className="text-[10px] text-[var(--text-muted)] text-center">Stub background</span>
            </div>
          </div>
          {/* Live card preview so the creator sees exactly what travellers get */}
          {(() => {
            const preview = {
              id: 'preview',
              creatorId: 'preview',
              title: title || 'Your guide title',
              city: city || 'City',
              category: (category || 'general').toLowerCase(),
              coverImageUrl: coverImageUrl || undefined,
              stubImageUrl: stubImageUrl || undefined,
              priceModel: accessModel,
              rating: 0,
              duration: duration || undefined,
              distance: distance || undefined,
              timeSlots: timeSlots.length > 0 ? (timeSlots as never) : null,
              stops: stops.map((s, i) => ({ id: String(i), guideId: 'preview', name: s.name, description: '', orderIndex: i })),
              creator: { id: 'preview', displayName: user?.displayName || 'You' },
              isPublished: false,
              createdAt: new Date().toISOString(),
            }
            return (
              <div className="mt-1">
                <TicketGuideCard guide={preview as never} onClick={() => {}} />
              </div>
            )
          })()}
        </div>

        {/* Stops */}
        <div className="flex flex-col gap-[5px]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Stops & curiosities</label>
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
              className="text-[11px] font-bold text-[var(--color-primary)] bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50"
            >
              {isImportingGps ? 'Importing…' : `🗺 Import GPS${gpsImportCount > 0 ? ` (${gpsImportCount} added)` : ''}`}
            </button>
          </div>
          <div className="flex flex-col gap-[7px]">
            {stops.map((stop, index) => (
              <div key={index} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                <div className="px-[10px] py-[9px] flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#E1F5EE] text-[#085041] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-[1px]">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-bold block truncate">{stop.name}</span>
                    {stop.latitude != null && stop.longitude != null && (
                      <span className="text-[10px] text-[var(--text-muted)] block">{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</span>
                    )}
                  </div>
                  <button onClick={() => removeStop(index)} aria-label={`Remove stop ${stop.name}`} className="text-[var(--text-muted)] cursor-pointer p-[2px] text-[15px]">✕</button>
                </div>
                {stop.description && (
                  <div className="px-[10px] pb-[10px] text-[12px] text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-2">
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
              className="flex-1 bg-[var(--bg-secondary)] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
            />
            <button onClick={addStop} aria-label="Add stop" className="px-3.5 py-[9px] rounded-lg bg-[var(--color-primary)] text-white border-none cursor-pointer text-[13px] font-bold whitespace-nowrap">
              + Add
            </button>
          </div>
          <button
            onClick={generateDescriptions}
            disabled={isGenerating || stops.length === 0 || !title || !city || !category}
            className="py-2.5 rounded-lg bg-[#E1F5EE] text-[#085041] text-[13px] font-bold border border-[var(--color-primary)] cursor-pointer w-full flex items-center justify-center gap-2 hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="7,1 8.8,5.5 13.5,5.5 9.7,8.3 11.2,13 7,10 2.8,13 4.3,8.3 0.5,5.5 5.2,5.5"/>
            </svg>
            {isGenerating ? 'Generating…' : 'AI: Generate curiosity descriptions'}
          </button>
        </div>

        {/* Duration & Distance */}
        <div className="flex flex-col gap-[5px]">
          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Duration & distance</label>
          <div className="flex gap-[7px]">
            <label htmlFor="guide-duration" className="sr-only">Duration</label>
            <input
              id="guide-duration"
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 1h 30m"
              aria-label="Duration"
              className="flex-1 bg-[var(--bg-secondary)] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
            />
            <label htmlFor="guide-distance" className="sr-only">Distance</label>
            <input
              id="guide-distance"
              type="text"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 2.5km"
              aria-label="Distance"
              className="flex-1 bg-[var(--bg-secondary)] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Costs */}
        <div className="flex flex-col gap-[5px]">
          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Estimated costs (€)</label>
          <div className="grid grid-cols-3 gap-[7px]">
            <label htmlFor="ticket-cost" className="sr-only">Tickets cost</label>
            <input
              id="ticket-cost"
              type="text"
              value={ticketCost}
              onChange={(e) => setTicketCost(e.target.value)}
              placeholder="🎟 Tickets"
              aria-label="Tickets cost"
              className="bg-[var(--bg-secondary)] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
            />
            <label htmlFor="meal-cost" className="sr-only">Meals cost</label>
            <input
              id="meal-cost"
              type="text"
              value={mealCost}
              onChange={(e) => setMealCost(e.target.value)}
              placeholder="🍽 Meals"
              aria-label="Meals cost"
              className="bg-[var(--bg-secondary)] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
            />
            <label htmlFor="transport-cost" className="sr-only">Transport cost</label>
            <input
              id="transport-cost"
              type="text"
              value={transportCost}
              onChange={(e) => setTransportCost(e.target.value)}
              placeholder="🚌 Transport"
              aria-label="Transport cost"
              className="bg-[var(--bg-secondary)] border border-black/20 dark:border-white/18 rounded-lg py-[9px] px-3 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Access Model */}
        <div className="flex flex-col gap-[5px]">
          <label id="access-model-label" className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Access model</label>
          <div className="flex gap-[7px]" role="radiogroup" aria-labelledby="access-model-label">
            {accessModels.map((model) => (
              <button
                key={model}
                role="radio"
                aria-checked={accessModel === model}
                onClick={() => setAccessModel(model)}
                className={`flex-1 py-[9px] rounded-lg border text-[12px] font-bold cursor-pointer ${
                  accessModel === model
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[#E1F5EE]'
                    : 'border-black/20 dark:border-white/18 bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                {model === 'free' ? 'Free' : model === 'paid' ? '€0.99 unlock' : 'Watch ad'}
              </button>
            ))}
          </div>
        </div>

        {/* Time slots */}
        <div className="flex flex-col gap-[5px]">
          <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Best time to visit <span className="normal-case font-normal">(optional)</span></div>
          <div className="flex gap-[7px] flex-wrap">
            {(['morning', 'afternoon', 'evening', 'night'] as const).map((slot) => {
              const active = timeSlots.includes(slot)
              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTimeSlots((prev) => prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot])}
                  className={`px-3 py-[9px] rounded-lg border text-[12px] font-bold cursor-pointer ${
                    active
                      ? 'border-[#7B61FF] text-white bg-[#7B61FF]'
                      : 'border-black/20 dark:border-white/18 bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {{ morning: '🌅 Morning', afternoon: '☀️ Afternoon', evening: '🌇 Evening', night: '🌙 Night' }[slot]}
                </button>
              )
            })}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">Leave empty for anytime</div>
        </div>

        {/* Limited-time event */}
        <div className="flex flex-col gap-[7px]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={limitedEvent}
              onChange={(e) => setLimitedEvent(e.target.checked)}
              className="accent-[var(--color-primary)] w-4 h-4"
            />
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">⏱ Limited-time event</span>
          </label>
          <div className="text-[11px] text-[var(--text-muted)] -mt-1">Show this guide only between two dates</div>
          {limitedEvent && (
            <div className="flex flex-col gap-[9px] p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
              <div className="flex gap-[7px]">
                <div className="flex-1 flex flex-col gap-[3px]">
                  <label htmlFor="valid-from" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Starts</label>
                  <input id="valid-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-[var(--bg-secondary)] text-[13px] text-[#F27732] dark:text-[var(--text-primary)]" />
                </div>
                <div className="flex-1 flex flex-col gap-[3px]">
                  <label htmlFor="valid-until" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Ends</label>
                  <input id="valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-[var(--bg-secondary)] text-[13px] text-[#F27732] dark:text-[var(--text-primary)]" />
                </div>
              </div>
              <div className="flex flex-col gap-[5px]">
                <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">🔁 Repeat on</div>
                <div className="flex gap-[5px] flex-wrap">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => {
                    const active = recurDays.includes(i)
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setRecurDays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort())}
                        className={`w-9 h-9 rounded-lg border text-[11px] font-bold cursor-pointer ${
                          active ? 'border-[#378ADD] text-white bg-[#378ADD]' : 'border-black/20 dark:border-white/18 bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Publish Button */}
      {!draftSaved && (
      <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] shrink-0">
        {importError && (
          <div role="alert" className="mb-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center">
            {importError}
            <button onClick={() => setImportError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
          </div>
        )}
        {publishError && (
          <div role="alert" className="mb-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center">{publishError}</div>
        )}
        <button
          onClick={handlePublish}
          disabled={isPublishing || !title || !city || !category || stops.length < 2}
          className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 7.5l4 4L13 3"/>
          </svg>
          {isPublishing ? 'Publishing…' : isGuest ? 'Save draft on device' : 'Publish guide'}
        </button>
      </div>
      )}
    </div>
  )
}
