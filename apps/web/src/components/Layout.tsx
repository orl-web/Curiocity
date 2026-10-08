import { Outlet, NavLink } from 'react-router-dom'
import { useI18n } from '../i18n'

export default function Layout() {
  const { t } = useI18n()

  const navItems = [
    { to: '/', labelKey: 'nav.explore' as const, icon: (active: boolean) => (
      <svg aria-hidden="true" viewBox="0 0 22 22" fill="none" stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="1.5" className="w-[22px] h-[22px]">
        <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>
      </svg>
    )},
    { to: '/map', labelKey: 'nav.map' as const, icon: (active: boolean) => (
      <svg aria-hidden="true" viewBox="0 0 22 22" fill="none" stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="1.5" className="w-[22px] h-[22px]">
        <path d="M3 7l6-3 4 3 6-3v13l-6 3-4-3-6 3z"/>
        <path d="M9 4v13M13 7v13"/>
      </svg>
    )},
    { to: '/profile', labelKey: 'nav.profile' as const, icon: (active: boolean) => (
      <svg aria-hidden="true" viewBox="0 0 22 22" fill="none" stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="1.5" className="w-[22px] h-[22px]">
        <circle cx="11" cy="8" r="3.5"/>
        <path d="M4 19c0-3.866 3.134-7 7-7h1c3.866 0 7 3.134 7 7"/>
      </svg>
    )},
  ]

  return (
    <div className="flex flex-col h-screen max-w-[430px] mx-auto" style={{ background: 'var(--bg-primary)' }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-[var(--color-primary)] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">Skip to content</a>
      <main id="main-content" className="flex-1 overflow-y-auto min-h-0">
        <Outlet />
      </main>
      <nav aria-label="Main navigation" role="navigation" className="border-t flex justify-around py-2 px-0 sticky bottom-0 z-20" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        {navItems.map(({ to, labelKey, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-[3px] flex-1 py-[3px] ${isActive ? 'font-bold' : ''}`
            }
            style={({ isActive }) => ({ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' })}
          >
            {({ isActive }) => (
              <>
                {icon(isActive)}
                <span className="text-[10px]" aria-hidden="true">{t(labelKey)}</span>
                <span className="sr-only">{t(labelKey)}</span>
                {isActive && <span className="sr-only">(current page)</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
