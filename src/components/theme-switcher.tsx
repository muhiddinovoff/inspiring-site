import { AnimatePresence, motion } from "framer-motion"
import { Moon, SunMedium, SunMoon, type LucideIcon } from "lucide-react"

import { useTheme } from "@/hooks/use-theme"
import { useI18n } from "@/i18n"
import { THEME_MODES, type ThemeMode } from "@/lib/theme"
import { cn } from "@/lib/utils"

const ICONS: Record<ThemeMode, LucideIcon> = { light: SunMedium, dark: Moon, system: SunMoon }

/** Three-way segmented control: light, dark, or follow the device. `withLabels` shows the names next to the icons. */
export function ThemeSwitcher({
  className,
  id = "theme",
  withLabels = false,
}: {
  className?: string
  id?: string
  withLabels?: boolean
}) {
  const { mode, setMode } = useTheme()
  const { t } = useI18n()
  return (
    <div
      role="radiogroup"
      aria-label={t.theme.label}
      className={cn("inline-flex rounded-full border bg-card/80 p-0.5 backdrop-blur", className)}
    >
      {THEME_MODES.map((m) => {
        const Icon = ICONS[m]
        const on = m === mode
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={withLabels ? undefined : t.theme[m]}
            title={t.theme[m]}
            onClick={() => setMode(m)}
            className={cn(
              "relative flex h-8 items-center justify-center gap-2 rounded-full text-xs font-bold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
              withLabels ? "flex-1 px-3" : "w-8",
              on ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {on && (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative size-4" />
            {withLabels && <span className="relative">{t.theme[m]}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** One button for narrow headers: tap to step through light → dark → auto. */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { mode, setMode } = useTheme()
  const { t } = useI18n()
  const next = THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length]
  const Icon = ICONS[mode]
  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={`${t.theme.label}: ${t.theme[mode]}. ${t.theme[next]}`}
      title={t.theme[mode]}
      className={cn(
        "grid size-9 place-items-center rounded-full border bg-card/80 backdrop-blur transition-colors outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/60",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mode}
          initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="size-4" />
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
