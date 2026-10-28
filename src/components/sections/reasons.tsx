import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

import { staggerItem, staggerParent } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { PHOTOS } from "@/data/site"
import { useI18n } from "@/i18n"

export function Reasons() {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"])

  return (
    <section id="nega" className="bg-secondary/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:px-6 md:py-32 lg:grid-cols-2 lg:gap-16">
        <div ref={ref} className="relative min-h-[22rem] overflow-hidden rounded-3xl bg-brand lg:min-h-full">
          <motion.img
            src={PHOTOS.studying}
            alt={t.reasons.photoAlt}
            loading="lazy"
            style={{ y, scale: 1.18 }}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-card/90 p-5 backdrop-blur md:inset-x-6 md:bottom-6">
            <p className="font-display text-3xl font-extrabold text-brand-ink">97{t.decimal}7%</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.reasons.badge}</p>
          </div>
        </div>

        <div>
          <SectionHeading kicker={t.reasons.kicker} title={t.reasons.title} />
          <motion.ol
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            className="mt-10 grid gap-x-8 sm:grid-cols-2"
          >
            {t.reasons.items.map((r, i) => (
              <motion.li key={i} variants={staggerItem} className="border-t py-6">
                <span className="font-display text-sm font-bold text-brand-ink tabular-nums">0{i + 1}</span>
                <h3 className="mt-2 text-xl font-bold">{r.title}</h3>
                <p className="mt-2 text-muted-foreground">{r.text}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  )
}
