import { motion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"

import { staggerItem, staggerParent } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

export function Programs() {
  const { t } = useI18n()
  return (
    <section id="dasturlar" className="bg-secondary/60">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
        <SectionHeading
          kicker={t.programs.kicker}
          title={t.programs.title}
          text={t.programs.text}
        />
        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          className="mt-12 grid gap-4 lg:grid-cols-3"
        >
          {t.programs.items.map((p, i) => {
            const featured = i === 1
            return (
              <motion.article
                key={i}
                variants={staggerItem}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className={cn(
                  "flex flex-col rounded-3xl border p-7 md:p-8",
                  featured ? "border-transparent bg-brand text-white shadow-[0_30px_60px_-30px_rgb(15_95_88/0.8)]" : "bg-card"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-bold",
                      featured ? "bg-white/15 text-[#7ee9b8]" : "bg-secondary text-brand-ink"
                    )}
                  >
                    {p.grade}
                  </span>
                  {featured && <span className="text-sm font-semibold text-white/70">{t.programs.featured}</span>}
                </div>
                <h3 className="mt-6 text-2xl font-bold">{p.title}</h3>
                <p className={cn("mt-3", featured ? "text-white/75" : "text-muted-foreground")}>{p.text}</p>
                <ul className="mt-6 mb-8 grid gap-3">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-3 font-medium">
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full",
                          featured ? "bg-accent text-accent-foreground" : "bg-secondary text-brand-ink"
                        )}
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={featured ? "accent" : "outline"} className="group mt-auto">
                  <a href="#ariza">
                    {t.common.learnMore}
                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </Button>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
