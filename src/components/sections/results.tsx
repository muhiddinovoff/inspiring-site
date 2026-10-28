import { motion } from "framer-motion"

import { CountUp } from "@/components/motion/count-up"
import { EASE, Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { PRESIDENT_COUNT, RESULTS, RESULTS_TOTAL } from "@/data/site"
import { useI18n } from "@/i18n"

export function Results() {
  const { t } = useI18n()
  const max = Math.max(...RESULTS)
  return (
    <section id="natijalar" className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <SectionHeading kicker={t.results.kicker} title={t.results.title} text={t.results.text} />
          <Reveal delay={0.1} className="mt-10 rounded-3xl bg-brand p-7 text-white md:p-8">
            <p className="font-display text-7xl leading-none font-extrabold text-[#7ee9b8] md:text-8xl">
              <CountUp to={RESULTS_TOTAL} suffix="+" />
            </p>
            <p className="mt-3 text-white/80">{t.results.total(PRESIDENT_COUNT)}</p>
          </Reveal>
        </div>

        <ul className="flex flex-col justify-center gap-7">
          {RESULTS.map((value, i) => (
            <li key={i}>
              <Reveal delay={i * 0.06} y={16}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold md:text-lg">{t.results.items[i].label}</span>
                  <span className="font-display text-2xl font-extrabold tabular-nums md:text-3xl">
                    <CountUp to={value} />
                  </span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-green"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(value / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: EASE, delay: 0.15 + i * 0.08 }}
                  />
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
