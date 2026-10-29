import { motion, useTransform, type MotionValue } from "framer-motion"
import { GraduationCap, HeartHandshake, MapPin, Send, type LucideIcon } from "lucide-react"

import { CarouselControls } from "@/components/carousel-controls"
import { CountUp } from "@/components/motion/count-up"
import { Reveal } from "@/components/motion/reveal"
import { STATS } from "@/data/site"
import { ringOffset, useScrollCarousel } from "@/hooks/use-carousel"
import { useI18n } from "@/i18n"
import { richEffects } from "@/lib/device"
import { cn } from "@/lib/utils"

const RICH = richEffects()
const ICONS: LucideIcon[] = [GraduationCap, HeartHandshake, MapPin, Send]
/** Four stats are too few for a seamless ring (a card would visibly fly across), so the ring holds them twice. */
const SLOTS = [...STATS.keys(), ...STATS.keys()]

type CardProps = { slot: number; i: number; pos: MotionValue<number>; active: boolean }

/** Where a card sits follows the scroll continuously: centred and sharp, smaller, fainter and blurred to the sides. */
function StatCard({ slot, i, pos, active }: CardProps) {
  const { t } = useI18n()
  const s = STATS[i]
  const Icon = ICONS[i]
  const d = useTransform(pos, (p) => ringOffset(slot, p, SLOTS.length))
  const a = useTransform(d, (v) => Math.min(Math.abs(v), 2))
  const x = useTransform(d, (v) => `${v * 76}%`)
  const scale = useTransform(a, [0, 1, 2], [1, 0.84, 0.7])
  const opacity = useTransform(a, [0, 1, 2], [1, 0.55, 0])
  const filter = useTransform(a, (v) => (v < 0.02 || !RICH ? "none" : `blur(${v * 4}px)`))
  const zIndex = useTransform(a, (v) => 10 - Math.round(v * 2))

  return (
    <motion.div
      aria-hidden={!active}
      style={{ x, scale, opacity, filter, zIndex }}
      className="absolute inset-0 will-change-[transform,opacity]"
    >
      <div
        className={cn(
          "flex h-full flex-col justify-between rounded-[2rem] border p-7 transition-shadow duration-500 md:p-9",
          i === 0 ? "border-transparent bg-brand text-white" : "bg-card shadow-[0_30px_60px_-40px_rgb(15_95_88/0.45)]",
          active && "shadow-[0_40px_80px_-40px_rgb(15_95_88/0.6)]",
        )}
      >
        <span
          className={cn(
            "grid size-12 place-items-center rounded-2xl",
            i === 0 ? "bg-white/10 text-[#7ee9b8]" : "bg-secondary text-brand-ink",
          )}
        >
          <Icon className="size-6" />
        </span>
        <div>
          <p
            className={cn(
              "font-display text-[min(12vw,3.75rem)] leading-none font-extrabold whitespace-nowrap md:text-8xl",
              i === 0 ? "text-[#7ee9b8]" : "text-brand-ink",
            )}
          >
            {/* Re-mounted whenever the card comes to the centre, so the number counts up again. */}
            <CountUp
              key={active ? "on" : "off"}
              to={s.value}
              decimals={s.decimals}
              suffix={t.stats.items[i].suffix}
              sep={t.decimal}
              duration={active ? 1.4 : 0}
            />
          </p>
          <p className={cn("mt-3 text-base md:text-lg", i === 0 ? "text-white/80" : "text-muted-foreground")}>
            {t.stats.items[i].label}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export function Stats() {
  const { t } = useI18n()
  const { pos, active, go, goTo, section, bind } = useScrollCarousel<HTMLElement>({ count: STATS.length })

  return (
    <section {...section} aria-label={t.stats.aria} className="relative">
      {/* Pinned while the page scrolls past: each stat takes its turn in the centre. */}
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-x-clip pt-16">
        <p className="mb-8 text-sm font-bold tracking-[0.14em] text-brand-ink uppercase md:mb-10">{t.stats.aria}</p>
        <Reveal className="w-full">
          <motion.div
            {...bind}
            role="region"
            aria-roledescription={t.common.carousel}
            aria-label={t.stats.aria}
            className="relative mx-auto h-[19rem] w-[min(76vw,32rem)] cursor-grab rounded-[2rem] outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/60 active:cursor-grabbing md:h-[25rem]"
          >
            {SLOTS.map((stat, slot) => (
              <StatCard key={slot} slot={slot} i={stat} pos={pos} active={slot === active} />
            ))}
            <p aria-live="polite" className="sr-only">
              {t.stats.items[active].label}
            </p>
          </motion.div>
        </Reveal>

        <CarouselControls
          className="mt-8"
          count={STATS.length}
          current={active}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onDot={goTo}
        />
      </div>
    </section>
  )
}
