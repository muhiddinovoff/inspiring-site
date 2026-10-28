import { motion } from "framer-motion"

import { CountUp } from "@/components/motion/count-up"
import { EASE, Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { RESULTS, RESULTS_TOTAL } from "@/data/site"

export function Results() {
  const max = Math.max(...RESULTS.map((r) => r.value))
  return (
    <section id="natijalar" className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <SectionHeading
            kicker="Natijalar"
            title="Natijamiz o‘zi gapiradi"
            text="2025–2026 o‘quv yilida o‘quvchilarimiz qaysi maktablarga qabul qilingani."
          />
          <Reveal delay={0.1} className="mt-10 rounded-3xl bg-brand p-7 text-white md:p-8">
            <p className="font-display text-7xl leading-none font-extrabold text-[#7ee9b8] md:text-8xl">
              <CountUp to={RESULTS_TOTAL} suffix="+" />
            </p>
            <p className="mt-3 text-white/80">
              o‘quvchi bir yilda orzusidagi maktabga kirdi. Shundan 11 nafari Prezident maktablariga.
            </p>
          </Reveal>
        </div>

        <ul className="flex flex-col justify-center gap-7">
          {RESULTS.map((r, i) => (
            <li key={r.label}>
              <Reveal delay={i * 0.06} y={16}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold md:text-lg">{r.label}</span>
                  <span className="font-display text-2xl font-extrabold tabular-nums md:text-3xl">
                    <CountUp to={r.value} />
                  </span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-green"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(r.value / max) * 100}%` }}
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
