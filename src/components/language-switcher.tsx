import { motion } from "framer-motion"

import { LANGS, useI18n, type Lang } from "@/i18n"
import { cn } from "@/lib/utils"

export function LanguageSwitcher({ className, id = "lang" }: { className?: string; id?: string }) {
  const { lang, setLang, t } = useI18n()
  return (
    <div
      role="radiogroup"
      aria-label={t.common.language}
      className={cn("inline-flex rounded-full border bg-card/80 p-0.5 backdrop-blur", className)}
    >
      {(Object.keys(LANGS) as Lang[]).map((l) => {
        const on = l === lang
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={LANGS[l].label}
            lang={l}
            onClick={() => setLang(l)}
            className={cn(
              "relative h-8 rounded-full px-2 text-xs font-bold tracking-wide transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 sm:px-2.5",
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
            <span className="relative">{LANGS[l].short}</span>
          </button>
        )
      })}
    </div>
  )
}
