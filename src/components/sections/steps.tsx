import { useLayoutEffect, useRef, useState } from "react"
import { motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion"

import { SectionHeading } from "@/components/sections/section-heading"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

/**
 * A timeline that fills as you scroll. Nothing slides in: the green line grows down the steps, and each step
 * lights up (its number turns green with a little pop, its text comes up to full strength) as the line reaches it.
 */
export function Steps() {
  const { t } = useI18n()
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 65%", "end 55%"] })
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  // Where each number sits along the line (0 = top, 1 = bottom), measured from the real layout.
  const [marks, setMarks] = useState<number[]>([])
  useLayoutEffect(() => {
    const ol = ref.current
    if (!ol) return
    const measure = () => {
      const top = 8
      const length = ol.offsetHeight - 16
      setMarks(
        [...ol.querySelectorAll<HTMLElement>("[data-step-dot]")].map((dot) => {
          const li = dot.closest("li")!
          return (li.offsetTop + dot.offsetTop + dot.offsetHeight / 2 - top) / length
        }),
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(ol)
    return () => ro.disconnect()
  }, [])

  // How many steps the line has reached. Changes five times on the way down, so re-rendering on it is cheap.
  const [reached, setReached] = useState(0)
  useMotionValueEvent(fill, "change", (v) => {
    const n = marks.filter((m) => v >= m - 0.01).length
    if (n !== reached) setReached(n)
  })

  return (
    <section id="yol" className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading kicker={t.steps.kicker} title={t.steps.title} text={t.steps.text} />
        </div>

        <ol ref={ref} className="relative">
          <div aria-hidden className="absolute top-2 bottom-2 left-[19px] w-0.5 overflow-hidden rounded-full bg-border">
            <motion.div className="h-full w-full origin-top rounded-full bg-accent" style={{ scaleY: fill }} />
          </div>
          {t.steps.items.map((s, i) => {
            const on = i < reached
            return (
              <li key={i} className="relative pb-12 pl-16 last:pb-0">
                <span
                  data-step-dot
                  className={cn(
                    "absolute top-0 left-0 grid size-10 place-items-center rounded-full border-4 border-background font-display text-sm font-bold",
                    "transition-[background-color,color,transform,box-shadow] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                    on
                      ? "scale-110 bg-accent text-accent-foreground shadow-[0_0_0_6px_color-mix(in_srgb,var(--color-brand-green)_18%,transparent)]"
                      : "scale-100 bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <div
                  className={cn(
                    "transition-opacity duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
                    on ? "opacity-100" : "opacity-35",
                  )}
                >
                  <h3 className="pt-1.5 text-xl font-bold md:text-2xl">{s.title}</h3>
                  <p className="mt-2 max-w-md text-muted-foreground">{s.text}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
