import { motion } from "framer-motion"

import { CountUp } from "@/components/motion/count-up"
import { EASE, Reveal, staggerItem, staggerParent } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { OVERALL_RESULTS, PRESIDENT_COUNT, RESULTS, RESULTS_TOTAL } from "@/data/site"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

function SubHeading({ title, note }: { title: string; note: string }) {
  return (
    <Reveal className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b pb-4">
      <h3 className="text-2xl font-bold md:text-3xl">{title}</h3>
      <p className="text-sm font-semibold text-muted-foreground">{note}</p>
    </Reveal>
  )
}

export function Results() {
  const { t } = useI18n()
  const max = Math.max(...RESULTS)
  return (
    <section id="natijalar" className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
      <SectionHeading kicker={t.results.kicker} title={t.results.title} text={t.results.text} />

      {/* Overall, all-time results */}
      <div className="mt-14">
        <SubHeading title={t.results.overall.title} note={t.results.overall.note} />
        <motion.ul
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
        >
          {OVERALL_RESULTS.map((value, i) => {
            const featured = i === 0
            return (
              <motion.li
                key={i}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className={cn(
                  "flex min-h-36 flex-col justify-between gap-4 rounded-2xl border p-5 md:min-h-44 md:rounded-3xl md:p-6",
                  featured ? "border-transparent bg-brand text-white" : "bg-card",
                )}
              >
                <span
                  className={cn(
                    "font-display text-4xl leading-none font-extrabold md:text-5xl",
                    featured ? "text-[#7ee9b8]" : "text-brand-ink",
                  )}
                >
                  <CountUp to={value} suffix="+" />
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold break-words hyphens-auto md:text-base",
                    featured ? "text-white/85" : "text-foreground/80",
                  )}
                >
                  {t.results.overall.items[i]}
                </span>
              </motion.li>
            )
          })}
        </motion.ul>
      </div>

      {/* Last school year */}
      <div className="mt-20">
        <SubHeading title={t.results.year.title} note={t.results.year.text} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal className="flex flex-col justify-center rounded-3xl bg-secondary p-7 md:p-8">
            <p className="font-display text-7xl leading-none font-extrabold text-brand-ink md:text-8xl">
              <CountUp to={RESULTS_TOTAL} suffix="+" />
            </p>
            <p className="mt-3 text-muted-foreground">{t.results.total(PRESIDENT_COUNT)}</p>
          </Reveal>

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
      </div>
    </section>
  )
}
