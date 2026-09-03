import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../components/ThemeProvider'
import { users, payments } from '../services/api'
import { getAllOfflineGuides, deleteOfflineGuide } from '../utils/offlineStorage'
import { getAllImportedLocations, importLocations, deleteImportedLocation, clearImportedLocations } from '../utils/importedLocations'
import { parseGpsFile } from '../utils/gpsParsers'
import type { Guide } from '../types'
import type { ImportedLocation } from '../utils/importedLocations'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isDark, toggle } = useTheme()
  const [activeTab, setActiveTab] = useState<'saved' | 'created' | 'downloaded' | 'imported'>('saved')
  const [savedGuides, setSavedGuides] = useState<Guide[]>([])
  const [createdGuides, setCreatedGuides] = useState<Guide[]>([])
  const [downloadedGuides, setDownloadedGuides] = useState<Guide[]>([])
  const [imported, setImported] = useState<ImportedLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [earned, setEarned] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [guidesRes, savedRes] = await Promise.all([users.meGuides(), users.meSaved()])
      setCreatedGuides(guidesRes.data.guides || [])
      setSavedGuides(savedRes.data.guides || [])
      try { const earningsRes = await payments.creatorEarnings(); setEarned(earningsRes.data.totalEarnings || 0) } catch { setEarned(0) }
      setDownloadedGuides(await getAllOfflineGuides())
      setImported(await getAllImportedLocations())
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      setError('Failed to load profile. Check your connection and try again.')
    } finally { setIsLoading(false) }
  }

  const handleRemoveDownload = async (guideId: string) => {
    await deleteOfflineGuide(guideId)
    setDownloadedGuides((prev) => prev.filter((g) => g.id !== guideId))
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)
    try {
      const points = await parseGpsFile(file)
      if (points.length === 0) { setImportError('No GPS points found in file'); return }
      const name = file.name.replace(/\.[^.]+$/, '')
      const locs = await importLocations(points, name)
      setImported((prev) => [...prev, ...locs])
    } catch (err: any) {
      setImportError(err.message || 'Failed to import file')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemoveImport = async (id: string) => {
    await deleteImportedLocation(id)
    setImported((prev) => prev.filter((l) => l.id !== id))
  }

  const handleClearAllImported = async () => {
    await clearImportedLocations()
    setImported([])
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
        <div className="flex-1 text-lg font-bold text-[#1D9E75]">my profile</div>
        {/* Quick actions */}
        <button onClick={toggle} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 rounded-full bg-[#f5f5f3] dark:bg-[#272725] flex items-center justify-center cursor-pointer">
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="4"/><path d="M11 3v2M11 17v2M3 11h2M17 11h2M5.6 5.6l1.4 1.4M15 15l1.4 1.4M5.6 16.4l1.4-1.4M15 7l1.4-1.4"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 12A7 7 0 017 6a7.5 7.5 0 0011 6z"/>
            </svg>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Profile Header */}
        <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-[18px] flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-[58px] h-[58px] rounded-full bg-[#1D9E75] flex items-center justify-center text-[21px] font-bold text-white shrink-0">
              {user?.displayName?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold">{user?.displayName || 'Curious Traveller'}</div>
              <div className="text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0] mt-[2px]">Explorer · Guide creator</div>
            </div>
          </div>
          <div className="flex gap-5">
            <div><div className="text-base font-bold">{createdGuides.length}</div><div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">Created</div></div>
            <div><div className="text-base font-bold">{savedGuides.length}</div><div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">Saved</div></div>
            <div><div className="text-base font-bold">{downloadedGuides.length}</div><div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">Offline</div></div>
            <div><div className="text-base font-bold">{imported.length}</div><div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">Imported</div></div>
            <div><div className="text-base font-bold">€{earned.toFixed(2)}</div><div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">Earned</div></div>
          </div>
        </div>

        {/* Quick actions row */}
        <div className="bg-white dark:bg-[#1e1e1c] border-b border-black/10 dark:border-white/9 px-4 py-2.5 flex gap-2 shrink-0">
          <button onClick={() => navigate('/feed')}
            className="flex-1 py-2.5 rounded-xl bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 text-[#5f5e5a] dark:text-[#a8a7a0] text-[12px] font-bold cursor-pointer flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
            Feed
          </button>
          <button onClick={() => navigate('/create')}
            className="flex-1 py-2.5 rounded-xl bg-[#1D9E75] text-white text-[12px] font-bold border-none cursor-pointer flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>
            Create
          </button>
          <button onClick={() => navigate('/analytics')}
            className="flex-1 py-2.5 rounded-xl bg-[#f5f5f3] dark:bg-[#272725] border border-black/10 dark:border-white/9 text-[#5f5e5a] dark:text-[#a8a7a0] text-[12px] font-bold cursor-pointer flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="9" y="6" width="4" height="14" rx="1"/><rect x="15" y="2" width="4" height="18" rx="1"/></svg>
            Analytics
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Profile tabs" className="flex border-b border-black/10 dark:border-white/9 bg-white dark:bg-[#1e1e1c] shrink-0">
          {(['saved', 'created', 'downloaded', 'imported'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[12px] font-bold border-b-2 ${activeTab === tab ? 'text-[#1D9E75] border-[#1D9E75]' : 'text-[#5f5e5a] dark:text-[#a8a7a0] border-transparent'}`}
            >
              {tab === 'saved' ? 'Saved' : tab === 'created' ? 'Created' : tab === 'downloaded' ? 'Offline' : 'Imported'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div role="tabpanel" className="flex-1 overflow-y-auto p-3 flex flex-col gap-[9px] min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" aria-live="polite" aria-busy="true" role="status">
              <div className="w-7 h-7 border-[2.5px] border-[#e5e4e7] border-t-[#1D9E75] rounded-full animate-spin"></div>
              <span className="sr-only">Loading profile</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] text-center">{error}</p>
              <button onClick={loadProfile} aria-label="Retry loading profile" className="px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer">Retry</button>
            </div>
          ) : activeTab === 'saved' ? (
            savedGuides.length === 0 ? (
              <div className="text-center py-12 text-[#5f5e5a] dark:text-[#a8a7a0] text-sm">No saved guides yet</div>
            ) : (
              savedGuides.map((guide) => (
                <MiniGuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} />
              ))
            )
          ) : activeTab === 'created' ? (
            createdGuides.length === 0 ? (
              <div className="text-center py-12 text-[#5f5e5a] dark:text-[#a8a7a0] text-sm">No guides created yet</div>
            ) : (
              createdGuides.map((guide) => (
                <MiniGuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} />
              ))
            )
          ) : activeTab === 'downloaded' ? (
            downloadedGuides.length === 0 ? (
              <div className="text-center py-12 text-[#5f5e5a] dark:text-[#a8a7a0] text-sm">
                No offline guides yet.<br/>
                <span className="text-[12px] text-[#b4b2a9] dark:text-[#706f6a]">Open a guide and tap the download icon to save it offline.</span>
              </div>
            ) : (
              downloadedGuides.map((guide) => (
                <MiniGuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} actions={
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveDownload(guide.id) }} className="text-[#b4b2a9] hover:text-red-500 cursor-pointer p-1 text-[11px]" aria-label="Remove from offline">✕</button>
                } />
              ))
            )
          ) : (
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept=".gpx,.kml,.csv,.geojson,.json" onChange={handleImportFile} className="hidden" />
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} disabled={importing}
                  className="flex-1 py-2.5 rounded-lg bg-[#1D9E75] text-white text-[13px] font-bold border-none cursor-pointer flex items-center justify-center gap-2">
                  {importing ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Importing…</>) : (<><svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v9M5 8l3 3 3-3"/></svg> Import file</>)}
                </button>
                {imported.length > 0 && (
                  <button onClick={handleClearAllImported} className="px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/9 text-[#E24B4A] text-[13px] font-bold bg-transparent cursor-pointer">Clear all</button>
                )}
              </div>
              <div className="text-[11px] text-[#b4b2a9] dark:text-[#706f6a] text-center">Supports GPX, KML, CSV, GeoJSON from Google Maps, OSM, or other map apps</div>
              {importError && <div className="text-[12px] text-[#E24B4A] text-center bg-[#E24B4A]/10 rounded-lg px-3 py-2">{importError}</div>}
              {imported.length === 0 ? (
                <div className="text-center py-8 text-[#5f5e5a] dark:text-[#a8a7a0] text-sm">
                  No imported locations yet.<br/>
                  <span className="text-[12px] text-[#b4b2a9] dark:text-[#706f6a]">Export your saved places from Google Maps, OSM, or other apps and import them here.</span>
                </div>
              ) : (
                imported.map((loc) => (
                  <div key={loc.id} className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-lg p-[11px] flex gap-[9px] items-center">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: loc.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate">{loc.name}</div>
                      <div className="text-[11px] text-[#5f5e5a] dark:text-[#a8a7a0]">{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</div>
                    </div>
                    <button onClick={() => handleRemoveImport(loc.id)} className="text-[#b4b2a9] hover:text-red-500 cursor-pointer p-1 text-[11px]" aria-label="Remove imported location">✕</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniGuideCard({ guide, onClick, actions }: { guide: Guide; onClick: () => void; actions?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-lg p-[11px] flex gap-[9px] items-center cursor-pointer hover:border-[#1D9E75] transition-colors" onClick={onClick}>
      <div className="w-[50px] h-[44px] rounded-lg bg-[#f5f5f3] dark:bg-[#272725] flex-shrink-0 overflow-hidden">
        {guide.coverImage ? (
          <img src={guide.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#b4b2a9] text-xs">
            {guide.city?.charAt(0) || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate">{guide.title}</div>
          <div className="text-[12px] text-[#5f5e5a] dark:text-[#a8a7a0] mt-[1px]">{guide.city}</div>
      </div>
      {actions}
    </div>
  )
}
