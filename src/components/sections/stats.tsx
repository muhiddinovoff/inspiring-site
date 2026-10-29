import { useRef } from "react"
import { motion } from "framer-motion"
import { GraduationCap, HeartHandshake, MapPin, Send, type LucideIcon } from "lucide-react"

import { CarouselControls } from "@/components/carousel-controls"
import { CountUp } from "@/components/motion/count-up"
import { Reveal } from "@/components/motion/reveal"
import { STATS } from "@/data/site"
import { ringOffset, useCarousel } from "@/hooks/use-carousel"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

const ICONS: LucideIcon[] = [GraduationCap, HeartHandshake, MapPin, Send]
/** Four stats are too few for a seamless ring (a card would visibly fly across), so the ring holds them twice. */
const SLOTS = [...STATS.keys(), ...STATS.keys()]
const SPRING = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const

function StatCard({ i, offset }: { i: number; offset: number }) {
  const { t } = useI18n()
  const s = STATS[i]
  const Icon = ICONS[i]
  const active = offset === 0
  const far = Math.abs(offset) > 1
  // A card that wraps from one end of the ring to the other jumps there while hidden instead of sweeping across.
  const last = useRef(offset)
  const wrapped = Math.abs(offset - last.current) > 1
  last.current = offset

  return (
    <motion.div
      aria-hidden={!active}
      initial={false}
      animate={{
        x: `${offset * 78}%`,
        scale: active ? 1 : far ? 0.7 : 0.84,
        opacity: active ? 1 : far ? 0 : 0.45,
        filter: active ? "blur(0px)" : far ? "blur(8px)" : "blur(4px)",
      }}
      transition={wrapped ? { x: { duration: 0 }, scale: { duration: 0 }, default: SPRING } : SPRING}
      style={{ zIndex: 10 - Math.abs(offset) }}
      className="absolute inset-0 will-change-[transform,opacity,filter]"
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
              "font-display text-6xl leading-none font-extrabold md:text-7xl",
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
  const { active, go, goTo, bind } = useCarousel<HTMLDivElement>({ count: SLOTS.length })
  const current = SLOTS[active]

  return (
    <section aria-label={t.stats.aria} className="overflow-x-clip py-16 md:py-24">
      <Reveal>
        <motion.div
          {...bind}
          role="region"
          aria-roledescription={t.common.carousel}
          aria-label={t.stats.aria}
          className="relative mx-auto h-[19rem] w-[min(78vw,26rem)] cursor-grab rounded-[2rem] outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/60 active:cursor-grabbing md:h-[22rem]"
        >
          {SLOTS.map((stat, slot) => (
            <StatCard key={slot} i={stat} offset={ringOffset(slot, active, SLOTS.length)} />
          ))}
          <p aria-live="polite" className="sr-only">
            {t.stats.items[current].label}
          </p>
        </motion.div>
      </Reveal>

      <CarouselControls
        className="mt-8"
        count={STATS.length}
        current={current}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        onDot={(i) => goTo(active - (active % STATS.length) + i)}
      />
    </section>
  )
}
