/** "system" follows the device (light by day, dark at night if the phone does that). */
export type ThemeMode = "light" | "dark" | "system"
export const THEME_MODES: ThemeMode[] = ["light", "dark", "system"]

export const THEME_STORAGE_KEY = "theme"
const THEME_COLOR = { light: "#0f5f58", dark: "#081614" } as const

const media = () => window.matchMedia("(prefers-color-scheme: dark)")

export function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === "light" || saved === "dark" || saved === "system") return saved
  } catch {
    /* storage blocked */
  }
  return "system"
}

export const resolve = (mode: ThemeMode) => (mode === "system" ? (media().matches ? "dark" : "light") : mode)

export function applyTheme(mode: ThemeMode) {
  const theme = resolve(mode)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme])
}

export function saveMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    /* storage blocked: choice lasts for this visit only */
  }
}

/** Calls `cb` when the device switches between light and dark. */
export function onSystemChange(cb: () => void) {
  const m = media()
  m.addEventListener("change", cb)
  return () => m.removeEventListener("change", cb)
}
