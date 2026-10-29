import { useRef } from "react"
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion"
import { ArrowRight, ChevronDown, Phone } from "lucide-react"

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

/** One headline word: fades in, sharpens and settles as its slice of the scroll goes by. */
function Word({ progress, range, accent, children }: WordProps) {
  const opacity = useTransform(progress, range, [0, 1])
  const blur = useTransform(progress, range, [14, 0])
  const filter = useTransform(blur, (b) => (b < 0.1 ? "none" : `blur(${b}px)`))
  const y = useTransform(progress, range, ["0.32em", "0em"])
  const scale = useTransform(progress, range, [0.88, 1])
  return (
    <motion.span
      style={{ opacity, filter, y, scale }}
      className={cn("inline-block will-change-[transform,opacity,filter]", accent && "text-brand-ink")}
    >
      {children}
    </motion.span>
  )
}
type WordProps = { progress: MotionValue<number>; range: [number, number]; accent?: boolean; children: string }

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
  // A soft spring on top of the scroll gives the reveal its slow, ~1.2 s settle even on a hard flick or swipe.
  const progress = useSpring(scrollYProgress, { stiffness: 70, damping: 22, mass: 0.6, restDelta: 0.0005 })
  const done = useSpring(1)
  const p = still ? done : progress

  const words = [
    ...t.hero.titleBefore.split(" ").map((w) => ({ w, accent: false })),
    ...t.hero.titleAccent.split(" ").map((w) => ({ w, accent: true })),
    ...t.hero.titleAfter.split(" ").map((w) => ({ w, accent: false })),
  ].filter((x) => x.w)
  const span = 0.5 / words.length

  const headScale = useTransform(p, [0, 0.7], [0.94, 1])
  const leadOpacity = useTransform(p, [0.5, 0.72], [0, 1])
  const leadY = useTransform(p, [0.5, 0.72], [16, 0])
  const hintOpacity = useTransform(p, [0, 0.08], [1, 0])

  return (
    <section
      ref={ref}
      id="top"
      aria-labelledby="hero-title"
      className={cn("relative", still ? "h-svh min-h-[36rem]" : "h-[260svh]")}
    >
      <div className={cn("sticky top-0 h-svh min-h-[36rem] overflow-hidden", STAGE)}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[80%] bg-[radial-gradient(55%_60%_at_50%_100%,color-mix(in_srgb,var(--color-brand-green)_26%,transparent),transparent_75%)]"
        />

        {/* Top: badge and the lead line, which arrives once the headline is in */}
        <div className="relative z-30 mx-auto flex max-w-3xl flex-col items-center px-4 pt-[calc(5.5rem+env(safe-area-inset-top))] text-center md:pt-28">
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
          <motion.p
            style={{ opacity: leadOpacity, y: leadY }}
            className="mt-4 max-w-xl text-base text-muted-foreground md:mt-5 md:text-lg"
          >
            {t.hero.lead(RESULTS_TOTAL)}
          </motion.p>
        </div>

        {/* Headline: sits behind the children, its bottom line tucked behind their heads */}
        <motion.h1
          id="hero-title"
          style={{ scale: headScale, bottom: "calc(var(--kh) * var(--hb))" }}
          className="absolute inset-x-0 z-0 mx-auto max-w-[17ch] px-4 text-center text-[clamp(2.6rem,min(11vw,9.5svh),7.25rem)] leading-[0.98] font-extrabold tracking-[-0.035em] sm:max-w-[20ch]"
        >
          {words.map(({ w, accent }, i) => {
            const start = 0.04 + i * span
            return (
              <span key={i}>
                <Word progress={p} range={[start, start + 0.26]} accent={accent}>
                  {w}
                </Word>{" "}
              </span>
            )
          })}
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

        {/* Bottom: actions over a soft fade so they read on top of the blazers */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/70 to-transparent px-4 pt-24 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}
            className="mx-auto flex max-w-md flex-row justify-center gap-2 sm:max-w-none sm:gap-3"
          >
            <Button asChild variant="accent" size="lg" className="group flex-1 sm:flex-none">
              <a href="#ariza">
                {t.hero.cta}
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-card/80 backdrop-blur">
              <a href={CONTACT.phoneHref} aria-label={`${t.common.call}: ${CONTACT.phone}`}>
                <Phone /> <span className="hidden sm:inline">{CONTACT.phone}</span>
              </a>
            </Button>
          </motion.div>
        </div>

        {!still && (
          <motion.span
            aria-hidden
            style={{ opacity: hintOpacity }}
            className="absolute top-1/2 right-4 z-30 hidden flex-col items-center gap-1 text-muted-foreground md:flex"
          >
            <ChevronDown className="size-5 animate-bounce" />
          </motion.span>
        )}
      </div>
    </section>
  )
}
