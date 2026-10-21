import { useNavigate } from 'react-router-dom'
import type { Guide } from '../types'
import { categoryMeta, guideBand, bandMeta, ticketSceneDataUri, guideSymbols, waveRouteSvg, priceLabel } from '../utils/guideArt'

interface Props {
  guide: Guide
  onClick?: () => void
  actions?: React.ReactNode
}

// The ticket-style guide card from the redesign mockup: a time-gradient main
// block (the "biglietto") plus a theme-colored stub (the "tagliando"). The
// background is the guide's uploaded photo, or a generated skyline scene keyed
// to the guide's time band and category.
export default function TicketGuideCard({ guide, onClick, actions }: Props) {
  const navigate = useNavigate()
  const theme = categoryMeta(guide.category)
  const band = guideBand(guide)
  const bandInfo = bandMeta(band.slot)
  const symbols = guideSymbols(guide)
  const stopCount = guide.stopsCount ?? guide.stops?.length ?? 0
  const wave = waveRouteSvg(stopCount, theme.color)
  const firstStop = guide.stops?.[0]?.name
  const lastStop = guide.stops?.length ? guide.stops[guide.stops.length - 1].name : undefined
  const km = guide.distance_km != null ? Number(guide.distance_km).toFixed(1).replace(/\.0$/, '') : (guide.distance || null)
  const creatorName = guide.creator?.displayName || guide.user?.displayName || 'Creator'
  const creatorAvatar = guide.creator?.avatarUrl || guide.user?.avatar

  const ticketBg = guide.coverImageUrl || ticketSceneDataUri(guide)
  const stubHasImage = !!guide.stubImageUrl

  return (
    <div
      className="rounded-[22px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
      style={{ display: 'grid', gridTemplateColumns: '1fr 84px', background: `linear-gradient(165deg, ${bandInfo.gradient[0]}, ${bandInfo.gradient[1]})`, color: bandInfo.textColor }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
    >
      {/* Main block — the biglietto */}
      <div className="relative min-w-0 p-4 pb-3">
        {/* Background layer: photo or generated scene */}
        {guide.coverImageUrl ? (
          <>
            <img src={guide.coverImageUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${bandInfo.gradient[0]}d9, ${bandInfo.gradient[1]}40)` }} />
          </>
        ) : (
          <img src={ticketBg} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Content sits above the background */}
        <div className="relative">
          {/* Slot row */}
          <div className="flex items-center justify-between text-[13px] font-bold" style={{ opacity: 0.85 }}>
            <span>{bandInfo.label === 'Morning' ? '🌅' : bandInfo.label === 'Afternoon' ? '☀️' : bandInfo.label === 'Evening' ? '🌇' : '🌙'} {band.label}{!band.declared && ' · Anytime'}</span>
            <span>{guide.city}</span>
          </div>

          {/* Title */}
          <h3 className="mt-1.5 text-[19px] font-extrabold leading-[1.15] line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
            {guide.title}
          </h3>

          {/* Creator avatar row */}
          <div className="flex items-center gap-2 mt-2" onClick={(e) => { e.stopPropagation(); navigate(`/u/${guide.creatorId}`) }}>
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: theme.color, color: '#fff' }}>
              {creatorAvatar ? (
                <img src={creatorAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                guide.creatorInitials || creatorName.charAt(0) || '?'
              )}
            </div>
            <span className="text-[12px] font-bold truncate" style={{ opacity: 0.85 }}>{creatorName}</span>
          </div>

          {/* Wave route */}
          {wave && (
            <div className="mt-2 -mx-1" style={{ overflow: 'visible' }} dangerouslySetInnerHTML={{ __html: wave }} />
          )}
          {(firstStop || lastStop) && (
            <div className="flex justify-between gap-2 text-[12px]" style={{ opacity: 0.85 }}>
              <span className="truncate">{firstStop}</span>
              <span className="truncate text-right">{lastStop}</span>
            </div>
          )}

          {/* Stats — duration and distance always occupy their slots so the
              layout stays stable even for guides created without them. */}
          <div className="flex gap-4 items-baseline mt-2.5">
            <span className="text-[22px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)', opacity: guide.duration ? 1 : 0.45 }}>
              {guide.duration ? guide.duration.replace(/\s+/g, '') : '—'}
            </span>
            <span>
              <span className="text-[22px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)', opacity: km ? 1 : 0.45 }}>{km || '—'}</span>
              {km && <span className="text-[12px] ml-0.5" style={{ opacity: 0.8 }}>km</span>}
            </span>
            <span className="text-[12px]" style={{ opacity: 0.8 }}>
              {Number(guide.rating) > 0 && <>★ {Number(guide.rating).toFixed(1)}</>}
              {stopCount > 0 && <> · {stopCount} stops</>}
            </span>
          </div>
        </div>

        {/* Caller-provided actions take the top-right corner (e.g. offline ✕) */}
        {actions && (
          <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      {/* Stub — the tagliando */}
      <div className="relative overflow-hidden flex flex-col items-center justify-center gap-1.5 text-center px-1.5 py-3"
        style={{
          background: stubHasImage
            ? theme.color
            : `linear-gradient(175deg, color-mix(in srgb, ${theme.color} 55%, ${bandInfo.gradient[0]}), ${theme.color})`,
          color: '#fff',
          borderLeft: '2px dashed rgba(255,255,255,.55)',
          maskImage: 'radial-gradient(circle 9px at 0 50%, transparent 98%, black)',
          WebkitMaskImage: 'radial-gradient(circle 9px at 0 50%, transparent 98%, black)',
        }}
      >
        {stubHasImage && (
          <>
            <img src={guide.stubImageUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(175deg, ${theme.color}66, ${theme.color}e0)` }} />
          </>
        )}
        {/* Single content symbol (the mockup's one-emoji stub) */}
        <span className="relative text-[22px] leading-none" aria-hidden="true">{symbols[0]}</span>
        <span className="relative text-[11px] font-bold">{theme.label}</span>
        <span className="relative text-[15px] font-extrabold bg-white rounded-lg px-2 py-0.5" style={{ color: theme.color }}>
          {priceLabel(guide)}
        </span>
      </div>
    </div>
  )
}
