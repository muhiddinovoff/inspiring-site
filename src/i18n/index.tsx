import { createContext, useContext, useEffect, useState } from "react"

import en from "./en"
import ru from "./ru"
import uz, { type Dict } from "./uz"

export const LANGS = { uz, ru, en } as const
export type Lang = keyof typeof LANGS

const STORAGE_KEY = "lang"

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && saved in LANGS) return saved as Lang
  } catch {
    /* storage blocked */
  }
  const q = new URLSearchParams(window.location.search).get("lang")
  if (q && q in LANGS) return q as Lang
  const nav = navigator.language.slice(0, 2)
  return nav === "ru" ? "ru" : nav === "en" ? "en" : "uz"
}

type Ctx = { lang: Lang; t: Dict; setLang: (l: Lang) => void }

const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const t = LANGS[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.meta.title
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.meta.description)
  }, [lang, t])

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* storage blocked: choice lasts for this visit only */
    }
  }

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider")
  return ctx
}
