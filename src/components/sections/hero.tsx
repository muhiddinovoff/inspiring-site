import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Phone } from "lucide-react"

import { EASE } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { HERO_CUTOUTS } from "@/data/hero-cutouts"
import { HERO_STUDENTS, HERO_YEAR } from "@/data/hero-students"
import { CONTACT, RESULTS_TOTAL } from "@/data/site"
import { useI18n } from "@/i18n"
import { asset } from "@/lib/site-root"

/** How long each student stays on, in ms. */
const TURN = 3000
const kidSrc = (kid: number) => asset(`hero/students/kid-${kid}.webp`)

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
 * The admitted student on show: one large portrait standing on the bottom edge of the photo and a small name tag.
 * Turns every few seconds, holds while the tag is hovered or focused; the bars on the tag pick a student directly.
 */
function Student({ still }: { still: boolean }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const [held, setHeld] = useState(false)
  const s = HERO_STUDENTS[i]

  useEffect(() => {
    if (held) return
    const id = setTimeout(() => setI((v) => (v + 1) % HERO_STUDENTS.length), TURN)
    return () => clearTimeout(id)
  }, [i, held])

  // Warm the next portrait so it is there when the turn comes.
  useEffect(() => {
    new Image().src = kidSrc(HERO_STUDENTS[(i + 1) % HERO_STUDENTS.length].kid)
  }, [i])

  return (
    <>
      {/* The portrait, with a soft glow behind it, in front of the headline. Its cut-off hem fades out. On phones its
          top comes from the headline (--kid-top, see useDepth), so the head rises over the headline's last line like
          the depth effect on an iPhone lock screen. */}
      <div
        aria-hidden
        data-portrait
        className="pointer-events-none absolute top-[var(--kid-top,45%)] bottom-[calc(4rem+env(safe-area-inset-bottom))] left-[60%] z-[1] -translate-x-1/2 md:top-auto md:right-[3%] md:bottom-0 md:left-auto md:h-[50%] md:translate-x-0 lg:right-[5%] lg:h-[88%] xl:right-[8%]"
        style={{ aspectRatio: `${HERO_CUTOUTS.width} / ${HERO_CUTOUTS.height}` }}
      >
        <div className="absolute inset-x-[-25%] bottom-0 h-[85%] bg-[radial-gradient(50%_50%_at_50%_55%,rgb(10_214_126/0.35),transparent_70%)]" />
        <AnimatePresence initial={false}>
          <motion.img
            key={s.kid}
            src={kidSrc(s.kid)}
            alt=""
            width={HERO_CUTOUTS.width}
            height={HERO_CUTOUTS.height}
            draggable={false}
            initial={still ? { opacity: 0 } : { opacity: 0, y: "4%", scale: 0.97 }}
            animate={{ opacity: 1, y: "0%", scale: 1 }}
            exit={{ opacity: 0, y: still ? "0%" : "2%" }}
            transition={still ? { duration: 0 } : { duration: 0.9, ease: EASE }}
            className="absolute inset-0 size-full origin-bottom [mask-image:linear-gradient(to_top,transparent,black_14%)] drop-shadow-[0_30px_40px_rgb(0_0_0/0.45)] select-none"
          />
        </AnimatePresence>
      </div>

      <motion.div
        role="group"
        aria-roledescription={t.common.carousel}
        aria-label={t.hero.resultsAria}
        initial={still ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.9 }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        className="absolute inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-10 rounded-2xl border border-white/15 bg-[#06201d]/60 px-4 pt-2.5 pb-1 backdrop-blur-xl md:inset-x-auto md:bottom-6 md:left-6 md:w-[20rem] md:pt-3 md:pb-1.5 lg:right-6 lg:left-auto xl:right-10 xl:bottom-10"
      >
        <div aria-live={held ? "polite" : "off"}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={still ? { duration: 0 } : { duration: 0.3, ease: EASE }}
            >
              <p className="hidden text-[0.65rem] font-bold tracking-[0.14em] text-[#7ee9b8] uppercase md:block">
                {t.hero.resultKicker(HERO_YEAR)}
              </p>
              <p className="font-display text-base leading-tight font-bold md:mt-0.5 md:text-lg">{s.name}</p>
              <p className="mt-0.5 text-xs text-white/75 md:mt-1 md:text-sm">
                <span className="font-semibold text-white">
                  {t.hero.score(s.score, String(s.score).replace(".", t.decimal))} · {t.hero.rank(s.rank)}
                </span>
                <br />
                {t.hero.school[s.city]}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* One bar per student: the current one fills up over its turn. */}
        <div className="mt-1 flex gap-1 md:mt-2">
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
    </>
  )
}

/** Where the portrait's head starts, as a share of the portrait's height (see scripts/cutout.py, HEAD_TOP). */
const HEAD_TOP = 40 / HERO_CUTOUTS.height

/**
 * On phones: sets --kid-top on the frame so the portrait's head starts in the middle of the headline's last line,
 * whatever the language, font size or screen height. Wider screens place the portrait by CSS alone.
 */
function useDepth(frame: React.RefObject<HTMLDivElement | null>, title: React.RefObject<HTMLHeadingElement | null>) {
  useLayoutEffect(() => {
    const f = frame.current
    const h1 = title.current
    const kid = f?.querySelector<HTMLElement>("[data-portrait]")
    if (!f || !h1 || !kid) return
    const place = () => {
      const box = f.getBoundingClientRect()
      const target = h1.getBoundingClientRect().bottom - box.top - parseFloat(getComputedStyle(h1).lineHeight) / 2
      const bottom = parseFloat(getComputedStyle(kid).bottom) || 0
      // The head sits HEAD_TOP down a portrait running from --kid-top to `bottom`: solve for --kid-top.
      const top = (target - HEAD_TOP * (box.height - bottom)) / (1 - HEAD_TOP)
      f.style.setProperty("--kid-top", `${Math.round(top)}px`)
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(f)
    ro.observe(h1)
    return () => ro.disconnect()
  }, [frame, title])
}

export function Hero() {
  const { t } = useI18n()
  const still = useReducedMotion() ?? false
  const frame = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  useDepth(frame, title)
  const words = t.hero.title.split(" ")
  const accent = t.hero.titleAccent.split(" ")

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative h-svh min-h-[40rem] px-2 pt-[calc(4rem+env(safe-area-inset-top))] pb-2 md:min-h-[44rem] md:px-4 md:pt-[72px] md:pb-4"
    >
      <div
        ref={frame}
        className="relative isolate h-full overflow-hidden rounded-[1.75rem] bg-brand-deep text-white md:rounded-[2.5rem]"
      >
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
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[#04201c] via-[#04201c]/60 via-45% to-[#04201c]/20"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[#04201c]/80 via-[#04201c]/30 via-40% to-transparent lg:bg-gradient-to-r lg:from-[#04201c]/80 lg:via-[#04201c]/30 lg:via-55%"
        />

        <p className="absolute top-3 right-4 z-10 text-[0.65rem] text-white/55 md:top-5 md:right-6 md:text-xs">
          {t.hero.photoCredit}
        </p>

        <Student still={still} />

        {/* Phones and tablets: the text on top, the student below. Wide screens: the text on the left, bottom-aligned. */}
        <div className="relative max-w-3xl p-5 pt-10 md:p-10 md:pt-14 lg:absolute lg:bottom-0 lg:left-0 lg:max-w-[min(46rem,54%)] lg:p-14">
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
            ref={title}
            id="hero-title"
            className="mt-4 text-[clamp(2rem,min(8.6vw,6svh),3.5rem)] leading-[1.02] font-extrabold tracking-[-0.03em] md:mt-6 lg:text-[clamp(2.75rem,min(4.6vw,8svh),5rem)]"
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
            className="mt-4 hidden max-w-xl text-lg leading-snug text-white/80 lg:block [@media(max-height:640px)]:hidden"
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
      </div>
    </section>
  )
}
