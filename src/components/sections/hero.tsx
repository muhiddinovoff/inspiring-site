import { motion } from "framer-motion"
import { ArrowRight, Phone } from "lucide-react"

import { EASE } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { CONTACT, PHOTOS, RESULTS, RESULTS_TOTAL } from "@/data/site"

const up = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: EASE, delay },
})

function Title() {
  return (
    <div className="px-2 pb-16 md:pb-28">
      <motion.p
        {...up(0.05)}
        className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card/80 px-3.5 py-1.5 text-sm font-semibold backdrop-blur"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-accent" />
        </span>
        Qabul doimo ochiq
      </motion.p>
      <motion.h1
        {...up(0.15)}
        className="mx-auto mt-6 max-w-4xl text-[2.6rem] leading-[1.02] font-extrabold sm:text-6xl md:text-7xl"
      >
        Farzandingizning <span className="text-brand-ink">Prezident maktabiga</span> yo‘li shu yerdan boshlanadi
      </motion.h1>
      <motion.p {...up(0.28)} className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
        Prezident va ixtisoslashtirilgan maktablarga tayyorlov. 2025–2026-yilda {RESULTS_TOTAL} dan ortiq
        o‘quvchimiz orzusidagi maktabga qabul qilindi.
      </motion.p>
      <motion.div {...up(0.4)} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild variant="accent" size="lg" className="group">
          <a href="#ariza">
            Bepul maslahat olish
            <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href={CONTACT.phoneHref}>
            <Phone /> {CONTACT.phone}
          </a>
        </Button>
      </motion.div>
    </div>
  )
}

/** What sits inside the tilting screen: a classroom photo with the year's results laid over it. */
function ResultsBoard() {
  const max = Math.max(...RESULTS.map((r) => r.value))
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl md:rounded-2xl">
      <img
        src={PHOTOS.classroom}
        alt="Sinfxonada dars qilayotgan o‘quvchilar"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04201d] via-[#04201d]/55 to-[#0f5f58]/20" />
      <div className="relative flex h-full flex-col justify-end gap-6 p-5 text-white md:flex-row md:items-end md:justify-between md:p-10">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#7ee9b8] uppercase">2025–2026 natijalari</p>
          <p className="mt-2 font-display text-6xl leading-none font-extrabold md:text-8xl">
            {RESULTS_TOTAL}+
          </p>
          <p className="mt-2 max-w-xs text-white/80">o‘quvchi nufuzli maktablarga qabul qilindi</p>
        </div>
        <ul className="grid w-full max-w-md gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md md:p-5">
          {RESULTS.map((r) => (
            <li key={r.short} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
              <span className="truncate text-white/85">{r.short}</span>
              <span className="h-2 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full rounded-full bg-[#0ad67e]" style={{ width: `${(r.value / max) * 100}%` }} />
              </span>
              <span className="text-right font-bold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_srgb,var(--color-brand-green)_18%,transparent),transparent)]"
      />
      <div className="pt-24 -mb-40 md:pt-20 md:-mb-48">
        <ContainerScroll titleComponent={<Title />}>
          <ResultsBoard />
        </ContainerScroll>
      </div>
    </section>
  )
}
