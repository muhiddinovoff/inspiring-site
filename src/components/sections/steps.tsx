import { useRef } from "react"
import { motion, useScroll, useSpring } from "framer-motion"

import { Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { useI18n } from "@/i18n"

export function Steps() {
  const { t } = useI18n()
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] })
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <section id="yol" className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading kicker={t.steps.kicker} title={t.steps.title} text={t.steps.text} />
        </div>

        <ol ref={ref} className="relative">
          <div aria-hidden className="absolute top-2 bottom-2 left-[19px] w-0.5 rounded-full bg-border">
            <motion.div className="h-full w-full origin-top rounded-full bg-accent" style={{ scaleY: fill }} />
          </div>
          {t.steps.items.map((s, i) => (
            <li key={i} className="relative pb-10 pl-16 last:pb-0">
              <Reveal y={20} delay={0.05}>
                <span className="absolute top-0 left-0 grid size-10 place-items-center rounded-full border-4 border-background bg-brand font-display text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="pt-1.5 text-xl font-bold md:text-2xl">{s.title}</h3>
                <p className="mt-2 max-w-md text-muted-foreground">{s.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
