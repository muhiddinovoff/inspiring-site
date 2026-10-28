import { motion } from "framer-motion"

import { CountUp } from "@/components/motion/count-up"
import { staggerItem, staggerParent } from "@/components/motion/reveal"
import { STATS } from "@/data/site"
import { useI18n } from "@/i18n"

export function Stats() {
  const { t } = useI18n()
  return (
    <section aria-label={t.stats.aria} className="mx-auto max-w-6xl px-4 md:px-6">
      <motion.dl
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        className="grid grid-cols-2 border-y md:grid-cols-4"
      >
        {STATS.map((s, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            className={`px-2 py-8 md:px-6 md:py-10 ${i % 2 ? "border-l pl-5" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l md:pl-6" : ""}`}
          >
            <dt className="sr-only">{t.stats.items[i].label}</dt>
            <dd className="font-display text-4xl font-extrabold text-brand-ink md:text-5xl">
              <CountUp to={s.value} decimals={s.decimals} suffix={t.stats.items[i].suffix} sep={t.decimal} />
            </dd>
            <dd className="mt-2 text-sm text-muted-foreground md:text-base">{t.stats.items[i].label}</dd>
          </motion.div>
        ))}
      </motion.dl>
    </section>
  )
}
