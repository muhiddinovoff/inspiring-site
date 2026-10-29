import { ChevronLeft, ChevronRight } from "lucide-react"

import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

type Props = {
  count: number
  current: number
  onPrev: () => void
  onNext: () => void
  /** Without it, the dots are left out. */
  onDot?: (i: number) => void
  prevLabel?: string
  nextLabel?: string
  className?: string
}

const arrow =
  "grid size-11 place-items-center rounded-full border bg-card text-foreground shadow-[0_8px_20px_-14px_rgb(15_95_88/0.5)] transition-[background-color,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)] outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/60 active:scale-95"

/** Previous / next arrows with optional position dots between them. */
export function CarouselControls({ count, current, onPrev, onNext, onDot, prevLabel, nextLabel, className }: Props) {
  const { t } = useI18n()
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <button type="button" onClick={onPrev} aria-label={prevLabel ?? t.common.prev} className={arrow}>
        <ChevronLeft className="size-5" />
      </button>
      {onDot && (
        <div className="flex gap-1">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onDot(i)}
              aria-label={t.common.slide(i + 1, count)}
              aria-current={current === i}
              className="group grid h-6 place-items-center px-1 outline-none"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-[width,background-color] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-focus-visible:ring-[3px] group-focus-visible:ring-ring/60",
                  current === i ? "w-6 bg-brand-ink" : "w-2 bg-foreground/20 group-hover:bg-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={onNext} aria-label={nextLabel ?? t.common.next} className={arrow}>
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
