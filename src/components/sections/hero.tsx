import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Phone } from "lucide-react"

import { EASE } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { HERO_CUTOUTS } from "@/data/hero-cutouts"
import { HERO_STUDENTS, HERO_YEAR } from "@/data/hero-students"
import { CONTACT, RESULTS_TOTAL } from "@/data/site"
import { useI18n } from "@/i18n"
import { asset } from "@/lib/site-root"

/** How long each student stays on the card, in ms. */
const TURN = 5000
const kidSrc = (kid: number) => asset(`hero/cutouts/kid-${kid}-1000.webp`)

/** One headline word: fades in, sharpens and settles on load, a beat after the word before it. */
function Word({ i, still, children }: { i: number; still: boolean; children: string }) {
  return (
    <motion.span
      initial={still ? false : { opacity: 0, filter: "blur(12px)", y: "0.3em" }}
      animate={{ opacity: 1, filter: "blur(0px)", y: "0em" }}
      transition={{ duration: 1.1, ease: EASE, delay: 0.3 + i * 0.08 }}
      className="inline-block"
    >
      {children}
    </motion.span>
  )
}

/**
 * The admitted students, one at a time: photo, name, score, place and school. Turns every few seconds,
 * holds while hovered or focused; the bars underneath pick a student directly.
 */
function StudentCard({ still }: { still: boolean }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const [held, setHeld] = useState(false)
  const s = HERO_STUDENTS[i]
  const size = HERO_CUTOUTS.kids[s.kid - 1]

  useEffect(() => {
    if (held) return
    const id = setTimeout(() => setI((v) => (v + 1) % HERO_STUDENTS.length), TURN)
    return () => clearTimeout(id)
  }, [i, held])

  // Warm the next photo so it is there when the card turns.
  useEffect(() => {
    new Image().src = kidSrc(HERO_STUDENTS[(i + 1) % HERO_STUDENTS.length].kid)
  }, [i])

  const fade = still ? { duration: 0 } : { duration: 0.6, ease: EASE }

  return (
    <motion.div
      role="group"
      aria-roledescription={t.common.carousel}
      aria-label={t.hero.resultsAria}
      initial={still ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.9 }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="w-full rounded-3xl border border-white/15 bg-[#06201d]/55 p-3 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] backdrop-blur-xl md:p-4 lg:w-[28rem] lg:shrink-0"
    >
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-[radial-gradient(80%_80%_at_50%_30%,#16877c,#0a3f3a)] md:size-28">
          <AnimatePresence initial={false}>
            <motion.img
              key={s.kid}
              src={kidSrc(s.kid)}
              alt=""
              width={Math.round((size.w / 100) * HERO_CUTOUTS.width) / 2}
              height={Math.round((size.h / 100) * HERO_CUTOUTS.height) / 2}
              draggable={false}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
              className="absolute inset-x-0 top-0 mx-auto h-auto w-[135%] max-w-none -translate-x-[13%] select-none"
            />
          </AnimatePresence>
        </div>

        <div aria-live={held ? "polite" : "off"} className="relative min-w-0 flex-1 self-stretch">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={still ? { duration: 0 } : { duration: 0.35, ease: EASE }}
              className="flex h-full flex-col justify-center"
            >
              <p className="text-[0.7rem] font-bold tracking-[0.14em] text-[#7ee9b8] uppercase">
                {t.hero.resultKicker(HERO_YEAR)}
              </p>
              <p className="mt-1 font-display text-lg leading-tight font-bold text-balance md:text-xl">{s.name}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-accent-foreground">
                  {t.hero.score(s.score, String(s.score).replace(".", t.decimal))}
                </span>
                <span className="rounded-full bg-white/12 px-2.5 py-0.5">{t.hero.rank(s.rank)}</span>
              </p>
              <p className="mt-1.5 text-sm leading-snug text-white/70">{t.hero.school[s.city]}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* One bar per student: the current one fills up over its turn. */}
      <div className="mt-3 flex gap-1 md:mt-4">
        {HERO_STUDENTS.map((st, k) => (
          <button
            key={k}
            type="button"
            aria-label={t.hero.pick(st.name)}
            aria-current={k === i}
            onClick={() => setI(k)}
            className="group flex h-4 flex-1 items-center outline-none"
          >
            <span className="relative h-1 w-full overflow-hidden rounded-full bg-white/20 transition-[height] group-hover:h-1.5 group-focus-visible:h-1.5 group-focus-visible:ring-2 group-focus-visible:ring-white/70">
              {k < i && <span className="absolute inset-0 bg-white/60" />}
              {k === i && (
                <motion.span
                  key={`${i}-${held}`}
                  initial={{ scaleX: held || still ? 1 : 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: held || still ? 0 : TURN / 1000, ease: "linear" }}
                  className="absolute inset-0 origin-left bg-accent"
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export function Hero() {
  const { t } = useI18n()
  const still = useReducedMotion() ?? false
  const words = t.hero.title.split(" ")
  const accent = t.hero.titleAccent.split(" ")

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative h-svh min-h-[40rem] px-2 pt-[calc(4rem+env(safe-area-inset-top))] pb-2 md:min-h-[44rem] md:px-4 md:pt-[72px] md:pb-4"
    >
      <div className="relative isolate h-full overflow-hidden rounded-[1.75rem] bg-brand-deep text-white md:rounded-[2.5rem]">
        <motion.img
          src={asset("hero/school-1280.webp")}
          srcSet={`${asset("hero/school-768.webp")} 768w, ${asset("hero/school-1280.webp")} 1280w`}
          sizes="100vw"
          width={1280}
          height={853}
          alt={t.hero.photoAlt}
          fetchPriority="high"
          initial={still ? false : { scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.6, ease: EASE }}
          className="absolute inset-0 -z-10 size-full object-cover object-[70%_50%] select-none"
        />
        {/* Darkened from the bottom and the left, where the text sits, so it reads on any part of the photo. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[#04201c] via-[#04201c]/60 via-45% to-[#04201c]/10"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-[#04201c]/75 via-[#04201c]/25 via-50% to-transparent md:block"
        />

        <p className="absolute top-3 right-4 text-[0.65rem] text-white/55 md:top-5 md:right-6 md:text-xs">
          {t.hero.photoCredit}
        </p>

        <div className="flex h-full flex-col justify-end gap-6 p-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:p-14">
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold backdrop-blur"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              {t.hero.badge}
            </motion.p>

            <h1
              id="hero-title"
              className="mt-4 text-[clamp(2.25rem,min(7.4vw,8svh),5.25rem)] leading-[1.02] font-extrabold tracking-[-0.03em] md:mt-6"
            >
              {words.map((w, i) => (
                <span key={i}>
                  <Word i={i} still={still}>
                    {w}
                  </Word>{" "}
                </span>
              ))}
              <span className="block text-[#7ee9b8]">
                {accent.map((w, i) => (
                  <span key={i}>
                    <Word i={words.length + i} still={still}>
                      {w}
                    </Word>{" "}
                  </span>
                ))}
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
              className="mt-4 max-w-xl text-sm leading-snug text-white/80 md:mt-5 md:text-lg [@media(max-height:640px)]:hidden"
            >
              {t.hero.lead(RESULTS_TOTAL)}
            </motion.p>

            {/* Phones get their actions from the fixed bottom bar (MobileCta) instead. */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 1 }}
              className="mt-7 hidden gap-3 md:flex"
            >
              <Button asChild variant="accent" size="lg" className="group">
                <a href="#ariza">
                  {t.hero.cta}
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20"
              >
                <a href={CONTACT.phoneHref}>
                  <Phone /> {CONTACT.phone}
                </a>
              </Button>
            </motion.div>
          </div>

          <StudentCard still={still} />
        </div>
      </div>
    </section>
  )
}
