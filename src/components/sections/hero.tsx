import { useRef } from "react"
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion"
import { ArrowRight, Phone } from "lucide-react"

import { EASE } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { CONTACT, RESULTS_TOTAL } from "@/data/site"
import { HERO_CUTOUTS } from "@/data/hero-cutouts"
import { useI18n } from "@/i18n"
import { asset } from "@/lib/site-root"
import { cn } from "@/lib/utils"

const KIDS = HERO_CUTOUTS.kids
const MIDDLE = (KIDS.length - 1) / 2
/** 0 for the children on the edges, 1 for the two in the middle (they stand in front in the photo). */
const depthOf = (i: number) => 1 - Math.abs(i - MIDDLE) / MIDDLE

/**
 * Width of the cut-out group photo. Capped by height so the children never push the headline off a short screen.
 * Mirrored in `sizes` below, which can't read CSS variables.
 */
const STAGE =
  "[--kh:calc(var(--kw)*0.442)] [--hb:0.7] md:[--hb:0.6] [--kw:min(265vw,135svh)] sm:[--kw:min(170vw,135svh)] md:[--kw:min(125vw,135svh)] lg:[--kw:min(100vw,135svh)] xl:[--kw:min(96vw,135svh,1760px)]"
const sizesFor = (share: number) =>
  [
    `(min-width: 1280px) calc(min(96vw, 135vh, 1760px) * ${share})`,
    `(min-width: 1024px) calc(min(100vw, 135vh) * ${share})`,
    `(min-width: 768px) calc(min(125vw, 135vh) * ${share})`,
    `(min-width: 640px) calc(min(170vw, 135vh) * ${share})`,
    `calc(min(265vw, 135vh) * ${share})`,
  ].join(", ")

/** One headline word: fades in, sharpens and settles on load, a beat after the word before it. */
function Word({ i, accent, still, children }: WordProps) {
  return (
    <motion.span
      initial={still ? false : { opacity: 0, filter: "blur(14px)", y: "0.32em", scale: 0.88 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: "0em", scale: 1 }}
      transition={{ duration: 1.2, ease: EASE, delay: 0.25 + i * 0.09 }}
      className={cn("inline-block", accent && "text-brand-ink")}
    >
      {children}
    </motion.span>
  )
}
type WordProps = { i: number; accent?: boolean; still: boolean; children: string }

type KidProps = { i: number; progress: MotionValue<number>; still: boolean }

/** One child: rises in on load, then grows a touch with the scroll; the ones standing in front grow more. */
function Kid({ i, progress, still }: KidProps) {
  const { t } = useI18n()
  const k = KIDS[i]
  const depth = depthOf(i)
  const scale = useTransform(progress, [0, 1], [1, 1 + depth * 0.05])
  const src = (w: number) => asset(`hero/cutouts/kid-${i + 1}-${w}.webp`)
  return (
    <motion.img
      src={src(1000)}
      srcSet={HERO_CUTOUTS.sizes.map((w) => `${src(w)} ${w}w`).join(", ")}
      sizes={sizesFor(k.w / 100)}
      width={Math.round((k.w / 100) * HERO_CUTOUTS.width)}
      height={Math.round((k.h / 100) * HERO_CUTOUTS.height)}
      alt={i === Math.floor(MIDDLE) ? t.hero.photoAlt : ""}
      fetchPriority={depth > 0.7 ? "high" : "auto"}
      decoding="async"
      draggable={false}
      initial={still ? false : { opacity: 0, y: "14%" }}
      animate={{ opacity: 1, y: "0%" }}
      transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.15 + Math.abs(i - MIDDLE) * 0.07 }}
      style={{
        left: `${k.x}%`,
        top: `${k.y}%`,
        width: `${k.w}%`,
        scale: still ? 1 : scale,
        transformOrigin: "50% 100%",
      }}
      className="absolute h-auto select-none"
    />
  )
}

/**
 * Parallax: each child drifts up and slightly outwards with the scroll, the ones in front further.
 * A wrapper so the drift and the entrance animation on the image don't fight over the same `y`.
 */
function KidLayer({ i, progress, still }: KidProps) {
  const depth = depthOf(i)
  const y = useTransform(progress, [0, 1], ["0%", `${-(1 + depth * 4)}%`])
  const x = useTransform(progress, [0, 1], ["0%", `${(i - MIDDLE) * 0.25}%`])
  return (
    <motion.div style={still ? { zIndex: 0 } : { y, x, zIndex: Math.round(depth * 10) }} className="absolute inset-0">
      <Kid i={i} progress={progress} still={still} />
    </motion.div>
  )
}

export function Hero() {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const still = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  // A soft spring on top of the scroll keeps the parallax gliding even on a hard flick or swipe.
  const progress = useSpring(scrollYProgress, { stiffness: 70, damping: 22, mass: 0.6, restDelta: 0.0005 })
  const done = useSpring(0)
  const p = still ? done : progress

  const words = [
    ...t.hero.titleBefore.split(" ").map((w) => ({ w, accent: false })),
    ...t.hero.titleAccent.split(" ").map((w) => ({ w, accent: true })),
    ...t.hero.titleAfter.split(" ").map((w) => ({ w, accent: false })),
  ].filter((x) => x.w)

  // The headline is in from the start; scrolling only lets it sink back a touch while the children come forward.
  const headScale = useTransform(p, [0, 1], [1, 0.95])
  const headY = useTransform(p, [0, 1], ["0%", "6%"])
  const headOpacity = useTransform(p, [0.55, 1], [1, 0.55])

  return (
    <section
      ref={ref}
      id="top"
      aria-labelledby="hero-title"
      className={cn("relative", still ? "h-svh min-h-[36rem]" : "h-[170svh]")}
    >
      <div className={cn("sticky top-0 h-svh min-h-[36rem] overflow-hidden", STAGE)}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[80%] bg-[radial-gradient(55%_60%_at_50%_100%,color-mix(in_srgb,var(--color-brand-green)_26%,transparent),transparent_75%)]"
        />

        <div className="relative z-30 flex justify-center px-4 pt-[calc(5.25rem+env(safe-area-inset-top))] md:pt-28">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
            className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3.5 py-1.5 text-sm font-semibold shadow-[0_8px_24px_-16px_rgb(15_95_88/0.5)] backdrop-blur"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            {t.hero.badge}
          </motion.p>
        </div>

        {/* Headline: sits behind the children, its bottom line tucked behind their heads */}
        <motion.h1
          id="hero-title"
          style={{ scale: headScale, y: headY, opacity: headOpacity, bottom: "calc(var(--kh) * var(--hb))" }}
          className="absolute inset-x-0 z-0 mx-auto max-w-[17ch] origin-bottom px-4 text-center text-[clamp(2.6rem,min(11vw,9.5svh),7.25rem)] leading-[0.98] font-extrabold tracking-[-0.035em] sm:max-w-[20ch]"
        >
          {words.map(({ w, accent }, i) => (
            <span key={i}>
              <Word i={i} accent={accent} still={still}>
                {w}
              </Word>{" "}
            </span>
          ))}
        </motion.h1>

        {/* The children, in front of the headline. Sunk a little below the edge so the drift never shows their cut-off hems. */}
        <div
          className="pointer-events-none absolute bottom-[calc(var(--kh)*-0.06)] left-1/2 z-10 w-[var(--kw)] -translate-x-1/2 [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]"
          style={{ aspectRatio: `${HERO_CUTOUTS.width} / ${HERO_CUTOUTS.height}` }}
        >
          {KIDS.map((_, i) => (
            <KidLayer key={i} i={i} progress={p} still={still} />
          ))}
        </div>

        {/* Bottom: the lead line and actions over a soft fade, so they read on top of the blazers.
            Phones get their actions from the fixed bottom bar (MobileCta) instead. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 1 }}
          className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/85 to-transparent px-5 pt-20 pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-center md:pt-28 md:pb-8"
        >
          <p className="mx-auto max-w-xl text-[0.95rem] leading-snug font-medium text-foreground/80 md:text-lg">
            {t.hero.lead(RESULTS_TOTAL)}
          </p>
          <div className="mt-5 hidden justify-center gap-3 md:flex">
            <Button asChild variant="accent" size="lg" className="group">
              <a href="#ariza">
                {t.hero.cta}
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-card/80 backdrop-blur">
              <a href={CONTACT.phoneHref}>
                <Phone /> {CONTACT.phone}
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
