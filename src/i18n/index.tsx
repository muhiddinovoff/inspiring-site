import { createContext, useContext, useEffect, useState } from "react"

import { SITE_ROOT, pathLang } from "@/lib/site-root"

import en from "./en"
import ru from "./ru"
import uz, { type Dict } from "./uz"

export const LANGS = { uz, ru, en } as const
export type Lang = keyof typeof LANGS

const STORAGE_KEY = "lang"
const isLang = (v: unknown): v is Lang => typeof v === "string" && v in LANGS

/** Each language has its own address: / for Uzbek, /ru/ and /en/ for the others. */
export const langPath = (l: Lang) => SITE_ROOT + (l === "uz" ? "" : `${l}/`)

function initialLang(): Lang {
  // An explicit address wins: /ru/, /en/ or the older ?lang= links.
  const fromPath = pathLang()
  if (isLang(fromPath)) return fromPath
  const q = new URLSearchParams(window.location.search).get("lang")
  if (isLang(q)) return q
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLang(saved)) return saved
  } catch {
    /* storage blocked */
  }
  // No browser-language guess: most parents' phones are set to Russian or English, but the site's audience reads Uzbek first.
  return "uz"
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
    // Keep the address bar on the language's own page so links can be shared and reloads stay in this language.
    const url = langPath(lang) + window.location.hash
    if (window.location.pathname + window.location.search + window.location.hash !== url) {
      window.history.replaceState(null, "", url)
    }
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
