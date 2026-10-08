import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { en, type TranslationKey } from './en'
import { it } from './it'
import { es } from './es'
import { fr } from './fr'
import { de } from './de'

export type Lang = 'en' | 'it' | 'es' | 'fr' | 'de'

export const LANGUAGES: { code: Lang; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
]

const dictionaries: Record<Lang, Partial<Record<TranslationKey, string>>> = { en, it, es, fr, de }

interface I18nCtx {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nCtx>({ lang: 'en', setLang: () => {}, t: (key) => en[key] })
export const useI18n = () => useContext(I18nContext)

function getInitialLang(): Lang {
  const stored = localStorage.getItem('ww_lang')
  if (stored && stored in dictionaries) return stored as Lang
  const browser = navigator.language.slice(0, 2)
  if (browser in dictionaries) return browser as Lang
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    localStorage.setItem('ww_lang', lang)
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])

  const t = useCallback(
    (key: TranslationKey): string => dictionaries[lang][key] ?? en[key] ?? key,
    [lang]
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}
