import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type Skin = 'default' | 'cartographer' | 'golden-hour' | 'biglietto'

export const SKINS: { id: Skin; name: string; description: string; swatches: string[]; font: string }[] = [
  { id: 'default', name: 'Classic', description: 'Clean & minimal', swatches: ['#1D9E75', '#f5f5f3', '#1e1e1c'], font: 'System UI' },
  { id: 'cartographer', name: 'Cartographer', description: 'Vintage maps & brass', swatches: ['#A8792E', '#F3ECDA', '#1B2A3D'], font: 'Fraunces' },
  { id: 'golden-hour', name: 'Golden Hour', description: 'Warm sunset tones', swatches: ['#EFA83D', '#FBEEDD', '#241220'], font: 'Space Grotesk' },
  { id: 'biglietto', name: 'Biglietto', description: 'Milan metro ticket', swatches: ['#D1122E', '#EFDEA6', '#1C1712'], font: 'Oswald' },
]

interface ThemeCtx {
  isDark: boolean
  toggle: () => void
  skin: Skin
  setSkin: (skin: Skin) => void
}

const ThemeContext = createContext<ThemeCtx>({ isDark: false, toggle: () => {}, skin: 'default', setSkin: () => {} })
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('ww_theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [skin, setSkinState] = useState<Skin>(() => {
    const stored = localStorage.getItem('ww_skin')
    return (stored as Skin) || 'default'
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('ww_theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    const root = document.documentElement
    if (skin === 'default') {
      root.removeAttribute('data-skin')
    } else {
      root.setAttribute('data-skin', skin)
    }
    localStorage.setItem('ww_skin', skin)
  }, [skin])

  const toggle = useCallback(() => setIsDark((prev) => !prev), [])
  const setSkin = useCallback((s: Skin) => setSkinState(s), [])

  return (
    <ThemeContext.Provider value={{ isDark, toggle, skin, setSkin }}>
      {children}
    </ThemeContext.Provider>
  )
}
