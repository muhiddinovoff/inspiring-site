import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

/** Shield emblem redrawn from the supplied logo; `gap` is the thin ring colour between the two green layers. */
export function Shield({ className, gap = "#0f5f58" }: { className?: string; gap?: string }) {
  return (
    <svg viewBox="0 0 274 322" aria-hidden="true" className={className}>
      <path d="M0 0H273V212C273 280 228 322 136.5 322C45 322 0 280 0 212Z" fill="#0ad67e" />
      <path d="M14 14H259V212C259 272 220 308 136.5 308C53 308 14 272 14 212Z" fill={gap} />
      <path d="M30 30H243V212C243 262 208 292 136.5 292C65 292 30 262 30 212Z" fill="#0ad67e" />
      <g fill="#fff">
        {[0, 42, 82].map((y) => (
          <path
            key={y}
            transform={`translate(0 ${y})`}
            d="M56 92H100C118 92 126 104 136.5 108C147 104 155 92 173 92H217V112H175C160 112 150 118 136.5 124C123 118 113 112 98 112H56Z"
          />
        ))}
      </g>
    </svg>
  )
}

export function Logo({ className, gap, light }: { className?: string; gap?: string; light?: boolean }) {
  const { t } = useI18n()
  return (
    <a href="#top" aria-label={t.nav.home} className={cn("flex items-center gap-2.5", className)}>
      <Shield className="h-9 w-[30px] shrink-0" gap={gap} />
      <span className={cn("font-display text-[15px] leading-[1.05] font-bold uppercase tracking-wide", light ? "text-white" : "text-foreground")}>
        Inspiring
        <span className="block">Education</span>
      </span>
    </a>
  )
}
