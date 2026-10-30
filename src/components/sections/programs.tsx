import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"

import { staggerItem, staggerParent } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"
import { mouseMoved } from "@/lib/pointer"
import { cn } from "@/lib/utils"

const EASE = "ease-[cubic-bezier(.22,1,.36,1)]"

/**
 * Three white cards. The one under the pointer (or tapped, on phones) widens and turns brand green; the other two
 * step back, smaller, fainter and blurred. All CSS transitions, so it stays smooth.
 */
export function Programs() {
  const { t } = useI18n()
  const [active, setActive] = useState<number | null>(null)
  const mouse = useRef<{ x: number; y: number } | null>(null)

  return (
    <section id="dasturlar" className="bg-secondary/60">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
        <SectionHeading kicker={t.programs.kicker} title={t.programs.title} text={t.programs.text} />
        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          onPointerLeave={(e) => {
            if (e.pointerType !== "mouse") return
            mouse.current = null
            setActive(null)
          }}
          className="mt-12 flex flex-col gap-4 lg:flex-row lg:items-stretch"
        >
          {t.programs.items.map((p, i) => {
            const on = active === i
            const dim = active !== null && !on
            return (
              // Outer: the entrance animation and the width. Inner: colour, scale, fade and blur, kept apart because
              // framer-motion leaves its own inline opacity/transform on the element it animates.
              <motion.div
                key={i}
                variants={staggerItem}
                // A real mouse move, not the page scrolling the card under a resting cursor.
                onPointerEnter={(e) => void mouseMoved(e, mouse)}
                onPointerMove={(e) => mouseMoved(e, mouse) && active !== i && setActive(i)}
                onClick={(e) => {
                  if ((e.nativeEvent as PointerEvent).pointerType === "mouse") return
                  setActive((cur) => (cur === i ? null : i))
                }}
                onFocus={() => setActive(i)}
                className={cn(
                  "flex min-w-0 transition-[flex-grow] duration-500 motion-reduce:transition-none lg:basis-0",
                  EASE,
                  on ? "lg:grow-[1.45]" : "lg:grow",
                )}
              >
                <article
                  className={cn(
                    "flex w-full flex-col rounded-3xl border p-7 md:p-8",
                    "transition-[background-color,border-color,color,box-shadow,opacity,filter,transform] duration-500 motion-reduce:transition-none",
                    EASE,
                    on
                      ? "border-transparent bg-brand text-white shadow-[0_40px_80px_-30px_rgb(15_95_88/0.8)]"
                      : "bg-card",
                    dim && "lg:scale-[0.97] lg:opacity-60 lg:blur-[3px]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-sm font-bold transition-colors duration-500",
                        on ? "bg-white/15 text-[#7ee9b8]" : "bg-secondary text-brand-ink",
                      )}
                    >
                      {p.grade}
                    </span>
                    {i === 1 && (
                      <span
                        className={cn(
                          "text-sm font-semibold transition-colors duration-500",
                          on ? "text-white/70" : "text-muted-foreground",
                        )}
                      >
                        {t.programs.featured}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-6 text-2xl font-bold">{p.title}</h3>
                  <p
                    className={cn(
                      "mt-3 transition-colors duration-500",
                      on ? "text-white/75" : "text-muted-foreground",
                    )}
                  >
                    {p.text}
                  </p>
                  <ul className="mt-6 mb-8 grid gap-3">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-3 font-medium">
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-500",
                            on ? "bg-accent text-accent-foreground" : "bg-secondary text-brand-ink",
                          )}
                        >
                          <Check className="size-3.5" strokeWidth={3} />
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={on ? "accent" : "outline"} className="group mt-auto">
                    <a href="#ariza">
                      {t.common.learnMore}
                      <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                    </a>
                  </Button>
                </article>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
