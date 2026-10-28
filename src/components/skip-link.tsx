import { useI18n } from "@/i18n"

/** First focusable element: lets keyboard users jump past the navigation. */
export function SkipLink() {
  const { t } = useI18n()
  return (
    <a
      href="#main"
      className="fixed top-3 left-3 z-50 -translate-y-20 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-transform focus:translate-y-0"
    >
      {t.common.skip}
    </a>
  )
}
