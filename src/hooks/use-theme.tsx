import { createContext, useContext, useEffect, useState } from "react"
import { flushSync } from "react-dom"

import { applyTheme, onSystemChange, readMode, saveMode, type ThemeMode } from "@/lib/theme"

type Ctx = { mode: ThemeMode; setMode: (m: ThemeMode) => void }

const ThemeContext = createContext<Ctx | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode)

  useEffect(() => {
    applyTheme(mode)
    if (mode !== "system") return
    return onSystemChange(() => applyTheme("system"))
  }, [mode])

  const setMode = (m: ThemeMode) => {
    saveMode(m)
    const update = () => {
      flushSync(() => setModeState(m))
      applyTheme(m)
    }
    // Cross-fade the whole page between themes where the browser supports it.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (document.startViewTransition && !reduce) document.startViewTransition(update)
    else update()
  }

  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
