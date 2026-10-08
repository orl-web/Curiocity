import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../components/ThemeProvider'
import { useI18n } from '../i18n'
import { users, payments } from '../services/api'
import { getAllOfflineGuides, deleteOfflineGuide } from '../utils/offlineStorage'
import { getAllImportedLocations, importLocations, deleteImportedLocation, clearImportedLocations } from '../utils/importedLocations'
import { parseGpsFile } from '../utils/gpsParsers'
import type { Guide } from '../types'
import type { ImportedLocation } from '../utils/importedLocations'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { isDark, toggle } = useTheme()
  const { t } = useI18n()
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

  useEffect(() => { loadProfile() }, [isAuthenticated])

  const loadProfile = async () => {
    setDownloadedGuides(await getAllOfflineGuides())
    setImported(await getAllImportedLocations())

    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [guidesRes, savedRes] = await Promise.all([users.meGuides(), users.meSaved()])
      setCreatedGuides(guidesRes.data.guides || [])
      setSavedGuides(savedRes.data.guides || [])
      try { const earningsRes = await payments.creatorEarnings(); setEarned(earningsRes.data.totalEarnings || 0) } catch { setEarned(0) }
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      setError(t('error.network'))
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

  const tabs = isAuthenticated
    ? (['saved', 'created', 'downloaded', 'imported'] as const)
    : (['downloaded', 'imported'] as const)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-2.5 shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4L6 9l5 5"/>
          </svg>
        </button>
        <div className="flex-1 text-lg font-bold" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>{t('profile.title')}</div>
        {/* Dark/light toggle */}
        <button onClick={toggle} aria-label={isDark ? t('settings.light') : t('settings.dark')}
          className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
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
        {/* Settings gear */}
        <button onClick={() => navigate('/settings')} aria-label={t('settings.title')}
          className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Profile Header */}
        <div className="border-b px-4 py-[18px] flex flex-col gap-3 shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3.5">
            <div className="w-[58px] h-[58px] rounded-full flex items-center justify-center text-[21px] font-bold text-white shrink-0" style={{ background: 'var(--color-primary)' }}>
              {isAuthenticated ? (user?.displayName?.charAt(0) || '?') : (
                <svg width="28" height="28" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="8" r="3.5"/><path d="M4 19c0-3.866 3.134-7 7-7h1c3.866 0 7 3.134 7 7"/></svg>
              )}
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {isAuthenticated ? (user?.displayName || 'Curious Traveller') : t('profile.guest')}
              </div>
              <div className="text-[13px] mt-[2px]" style={{ color: 'var(--text-secondary)' }}>
                {isAuthenticated ? 'Explorer · Guide creator' : t('profile.guestSubtitle')}
              </div>
            </div>
          </div>
          {isAuthenticated ? (
            <div className="flex gap-5">
              <div><div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{createdGuides.length}</div><div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('profile.created')}</div></div>
              <div><div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{savedGuides.length}</div><div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('profile.saved')}</div></div>
              <div><div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{downloadedGuides.length}</div><div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('profile.offline')}</div></div>
              <div><div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{imported.length}</div><div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('profile.imported')}</div></div>
              <div><div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>€{earned.toFixed(2)}</div><div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{t('profile.earned')}</div></div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold border-none cursor-pointer"
              style={{ background: 'var(--color-primary)' }}
            >
              {t('common.signIn')}
            </button>
          )}
        </div>

        {/* Quick actions row (auth only) */}
        {isAuthenticated && (
          <div className="border-b px-4 py-2.5 flex gap-2 shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <button onClick={() => navigate('/feed')}
              className="flex-1 py-2.5 rounded-xl border text-[12px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
              {t('profile.feed')}
            </button>
            <button onClick={() => navigate('/create')}
              className="flex-1 py-2.5 rounded-xl text-white text-[12px] font-bold border-none cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: 'var(--color-primary)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>
              {t('profile.create')}
            </button>
            <button onClick={() => navigate('/analytics')}
              className="flex-1 py-2.5 rounded-xl border text-[12px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="9" y="6" width="4" height="14" rx="1"/><rect x="15" y="2" width="4" height="18" rx="1"/></svg>
              {t('profile.analytics')}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div role="tablist" aria-label="Profile tabs" className="flex border-b shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-[12px] font-bold border-b-2"
              style={{
                color: activeTab === tab ? 'var(--color-primary)' : 'var(--text-secondary)',
                borderColor: activeTab === tab ? 'var(--color-primary)' : 'transparent',
              }}
            >
              {tab === 'saved' ? t('profile.tabSaved') : tab === 'created' ? t('profile.tabCreated') : tab === 'downloaded' ? t('profile.tabDownloaded') : t('profile.tabImported')}
            </button>
          ))}
        </div>

        {/* Content */}
        <div role="tabpanel" className="flex-1 overflow-y-auto p-3 flex flex-col gap-[9px] min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" aria-live="polite" aria-busy="true" role="status">
              <div className="w-7 h-7 border-[2.5px] border-t-[var(--color-primary)] rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--color-primary)' }}></div>
              <span className="sr-only">{t('common.loading')}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>{error}</p>
              <button onClick={loadProfile} aria-label={t('common.retry')} className="px-4 py-2 rounded-lg text-white text-sm font-bold border-none cursor-pointer" style={{ background: 'var(--color-primary)' }}>{t('common.retry')}</button>
            </div>
          ) : !isAuthenticated && (activeTab === 'saved' || activeTab === 'created') ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>{t('profile.signInCta')}</p>
              <button onClick={() => navigate('/login')} className="px-4 py-2 rounded-lg text-white text-sm font-bold border-none cursor-pointer" style={{ background: 'var(--color-primary)' }}>{t('common.signIn')}</button>
            </div>
          ) : activeTab === 'saved' ? (
            savedGuides.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('profile.noSaved')}</div>
            ) : (
              savedGuides.map((guide) => (
                <MiniGuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} />
              ))
            )
          ) : activeTab === 'created' ? (
            createdGuides.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('profile.noCreated')}</div>
            ) : (
              createdGuides.map((guide) => (
                <MiniGuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} />
              ))
            )
          ) : activeTab === 'downloaded' ? (
            downloadedGuides.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('profile.noOffline')}<br/>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('profile.noOfflineHint')}</span>
              </div>
            ) : (
              downloadedGuides.map((guide) => (
                <MiniGuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guide/${guide.id}`)} actions={
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveDownload(guide.id) }} className="hover:opacity-70 cursor-pointer p-1 text-[11px]" style={{ color: 'var(--text-muted)' }} aria-label="Remove from offline">✕</button>
                } />
              ))
            )
          ) : (
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept=".gpx,.kml,.csv,.geojson,.json" onChange={handleImportFile} className="hidden" />
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} disabled={importing}
                  className="flex-1 py-2.5 rounded-lg text-white text-[13px] font-bold border-none cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-primary)' }}>
                  {importing ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {t('profile.importing')}</>) : (<><svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v9M5 8l3 3 3-3"/></svg> {t('profile.importFile')}</>)}
                </button>
                {imported.length > 0 && (
                  <button onClick={handleClearAllImported} className="px-3 py-2.5 rounded-lg border text-[13px] font-bold bg-transparent cursor-pointer" style={{ borderColor: 'var(--border-color)', color: 'var(--color-error)' }}>{t('profile.clearAll')}</button>
                )}
              </div>
              <div className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>{t('profile.importFormats')}</div>
              {importError && <div className="text-[12px] text-center rounded-lg px-3 py-2" style={{ color: 'var(--color-error)' }}>{importError}</div>}
              {imported.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('profile.noImported')}<br/>
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{t('profile.noImportedHint')}</span>
                </div>
              ) : (
                imported.map((loc) => (
                  <div key={loc.id} className="border rounded-lg p-[11px] flex gap-[9px] items-center" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: loc.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{loc.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</div>
                    </div>
                    <button onClick={() => handleRemoveImport(loc.id)} className="hover:opacity-70 cursor-pointer p-1 text-[11px]" style={{ color: 'var(--text-muted)' }} aria-label="Remove imported location">✕</button>
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
    <div className="border rounded-lg p-[11px] flex gap-[9px] items-center cursor-pointer hover:opacity-90 transition-opacity" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} onClick={onClick}>
      <div className="w-[50px] h-[44px] rounded-lg flex-shrink-0 overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {guide.coverImage ? (
          <img src={guide.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>
            {guide.city?.charAt(0) || '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{guide.title}</div>
          <div className="text-[12px] mt-[1px]" style={{ color: 'var(--text-secondary)' }}>{guide.city}</div>
      </div>
      {actions}
    </div>
  )
}
