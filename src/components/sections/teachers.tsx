import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react"

import { staggerItem, staggerParent } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { TEACHERS, type Teacher } from "@/data/teachers"
import { useI18n } from "@/i18n"

export function Teachers() {
  const { t: tr } = useI18n()
  const nameOf = (t: Teacher) => t.name || tr.teachers.fallbackName
  const subjectOf = (t: Teacher) => t.subject || tr.teachers.fallbackSubject
  const [index, setIndex] = useState<number | null>(null)
  const [dir, setDir] = useState(0)
  const go = (step: number) => {
    setDir(step)
    setIndex((i) => (i === null ? i : (i + step + TEACHERS.length) % TEACHERS.length))
  }
  const t = index === null ? null : TEACHERS[index]

  return (
    <section id="ustozlar" className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          kicker={tr.teachers.kicker}
          title={tr.teachers.title}
          text={tr.teachers.text}
        />
      </div>

      <motion.ul
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5"
      >
        {TEACHERS.map((teacher, i) => (
          <motion.li key={teacher.img} variants={staggerItem}>
            <button
              type="button"
              onClick={() => {
                setDir(0)
                setIndex(i)
              }}
              className="group block w-full overflow-hidden rounded-2xl bg-card text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 md:rounded-3xl"
            >
              <span className="relative block aspect-[4/5] overflow-hidden bg-white">
                <img
                  src={teacher.img}
                  alt={nameOf(teacher)}
                  loading="lazy"
                  width={720}
                  height={960}
                  className="h-full w-full object-cover object-[50%_15%] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.04]"
                />
                <span className="absolute top-3 right-3 grid size-9 translate-y-1 place-items-center rounded-full bg-white/90 text-[#0d2421] opacity-0 shadow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <ArrowUpRight className="size-4" />
                </span>
              </span>
              <span className="block p-3.5 md:p-5">
                <span className="block font-display text-base font-bold md:text-xl">{nameOf(teacher)}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{subjectOf(teacher)}</span>
              </span>
            </button>
          </motion.li>
        ))}
      </motion.ul>

      <Dialog open={index !== null} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent closeLabel={tr.common.close} className="max-h-[90dvh] overflow-y-auto p-0 md:overflow-hidden">
          {t && (
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={index}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="grid md:grid-cols-[0.9fr_1.1fr]"
              >
                <div className="aspect-[4/3] bg-white md:aspect-auto md:h-[34rem]">
                  <img src={t.img} alt={nameOf(t)} className="h-full w-full object-cover object-[50%_15%]" />
                </div>
                <div className="flex flex-col p-6 md:p-8">
                  <DialogTitle>{nameOf(t)}</DialogTitle>
                  <p className="mt-1 font-semibold text-brand-ink">
                    {subjectOf(t)}
                    {t.exp && <span className="text-muted-foreground"> · {tr.teachers.exp(t.exp)}</span>}
                  </p>
                  <DialogDescription className="mt-4 leading-relaxed">
                    {t.about || tr.teachers.fallbackAbout}
                  </DialogDescription>
                  {t.wins.length > 0 && (
                    <ul className="mt-5 grid gap-2">
                      {t.wins.map((w) => (
                        <li key={w} className="flex gap-3 text-sm">
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex items-center gap-2 pt-8">
                    <DialogClose asChild>
                      <Button asChild variant="accent">
                        <a href="#ariza">{tr.teachers.enroll}</a>
                      </Button>
                    </DialogClose>
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="icon" aria-label={tr.teachers.prev} onClick={() => go(-1)}>
                        <ArrowLeft />
                      </Button>
                      <Button variant="outline" size="icon" aria-label={tr.teachers.next} onClick={() => go(1)}>
                        <ArrowRight />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
