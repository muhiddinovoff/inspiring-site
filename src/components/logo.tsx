import { useI18n } from "@/i18n"
import { asset } from "@/lib/site-root"
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

// The official logo artwork (built from assets/brand by scripts/brand.py), 640x157.
const LOGO = { w: 640, h: 157 }

/**
 * The official horizontal logo. `light` (dark backgrounds, e.g. the footer) always uses the white wordmark;
 * otherwise it follows the site theme. `compact` shows just the emblem on very narrow phones (under 380px)
 * so the header controls still fit.
 */
export function Logo({ className, light, compact }: { className?: string; light?: boolean; compact?: boolean }) {
  const { t } = useI18n()
  const img = (file: string, extra: string) => (
    <img
      src={asset(`brand/${file}`)}
      alt=""
      width={LOGO.w}
      height={LOGO.h}
      decoding="async"
      draggable={false}
      className={cn("h-full w-auto select-none", extra)}
    />
  )
  return (
    <a href="#top" aria-label={t.nav.home} className={cn("flex h-9 shrink-0 items-center md:h-10", className)}>
      {light ? (
        img("logo-light.png", cn(compact && "max-[379px]:hidden"))
      ) : (
        <>
          {img("logo.png", cn("dark:hidden", compact && "max-[379px]:hidden"))}
          {img("logo-light.png", cn("hidden dark:block", compact && "max-[379px]:!hidden"))}
        </>
      )}
      {compact && <Shield className="hidden h-full w-auto max-[379px]:block" />}
    </a>
  )
}
