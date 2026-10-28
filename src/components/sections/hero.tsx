import { motion } from "framer-motion"
import { ArrowRight, Phone } from "lucide-react"

import { EASE } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { CONTACT, RESULTS, RESULTS_TOTAL } from "@/data/site"
import { useI18n } from "@/i18n"
import { asset } from "@/lib/site-root"

const up = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: EASE, delay },
})

function Title() {
  const { t } = useI18n()
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
        {t.hero.badge}
      </motion.p>
      <motion.h1
        {...up(0.15)}
        className="mx-auto mt-6 max-w-4xl text-[2.35rem] leading-[1.04] font-extrabold sm:text-6xl md:text-7xl"
      >
        {t.hero.titleBefore}
        <span className="text-brand-ink">{t.hero.titleAccent}</span>
        {t.hero.titleAfter}
      </motion.h1>
      <motion.p {...up(0.28)} className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
        {t.hero.lead(RESULTS_TOTAL)}
      </motion.p>
      <motion.div {...up(0.4)} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild variant="accent" size="lg" className="group">
          <a href="#ariza">
            {t.hero.cta}
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

const HERO_IMAGE = {
  src: asset("hero/students-1200.webp"),
  srcSet: [800, 1200, 2000].map((w) => `${asset(`hero/students-${w}.webp`)} ${w}w`).join(", "),
  width: 2000,
  height: 884,
}

/** What sits inside the tilting screen: the students banner on top, the year's results underneath. */
function ResultsBoard() {
  const { t } = useI18n()
  const max = Math.max(...RESULTS)
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-brand-deep text-white lg:rounded-2xl">
      <div className="relative shrink-0 bg-gradient-to-b from-[#0d7962] to-[#0b9e6e] lg:h-[64%]">
        <img
          src={HERO_IMAGE.src}
          srcSet={HERO_IMAGE.srcSet}
          sizes="(min-width: 1024px) 960px, 100vw"
          width={HERO_IMAGE.width}
          height={HERO_IMAGE.height}
          alt={t.hero.photoAlt}
          fetchPriority="high"
          draggable={false}
          className="block h-auto w-full lg:h-full lg:object-cover lg:object-top"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-brand-deep to-transparent" />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-8 lg:py-5">
        <div className="flex items-end gap-4 lg:block">
          <p className="font-display text-5xl leading-none font-extrabold lg:text-7xl">{RESULTS_TOTAL}+</p>
          <div className="lg:mt-2">
            <p className="text-xs font-semibold tracking-wide text-[#7ee9b8] uppercase lg:text-sm">
              {t.hero.boardKicker}
            </p>
            <p className="text-sm text-white/80 lg:mt-1 lg:max-w-xs">{t.hero.boardText}</p>
          </div>
        </div>
        <ul className="grid w-full gap-2 lg:max-w-md lg:gap-2.5">
          {RESULTS.map((value, i) => (
            <li key={i} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-xs lg:text-sm">
              <span className="truncate text-white/85">{t.results.items[i].short}</span>
              <span className="h-2 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full rounded-full bg-[#0ad67e]" style={{ width: `${(value / max) * 100}%` }} />
              </span>
              <span className="text-right font-bold tabular-nums">{value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_srgb,var(--color-brand-green)_18%,transparent),transparent)]"
      />
      <div className="pt-36 pb-10 md:pt-40 md:pb-0 lg:pt-28">
        <ContainerScroll titleComponent={<Title />}>
          <ResultsBoard />
        </ContainerScroll>
      </div>
    </section>
  )
}
