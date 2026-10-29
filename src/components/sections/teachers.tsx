import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Plus } from "lucide-react"

import { CarouselControls } from "@/components/carousel-controls"
import { Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { Button } from "@/components/ui/button"
import { TEACHERS, pick, type Teacher } from "@/data/teachers"
import { ringOffset, useCarousel } from "@/hooks/use-carousel"
import { useI18n } from "@/i18n"
import { mouseMoved } from "@/lib/pointer"
import { cn } from "@/lib/utils"

const SPRING = { type: "spring", stiffness: 240, damping: 30, mass: 0.9 } as const
const NAME_H = 68

/** Card sizes in px. The photo keeps its height when a card opens; on phones it narrows to make room for the details. */
function useSizes() {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 768px)").matches)
  const [vw, setVw] = useState(() => window.innerWidth)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const onChange = () => {
      setWide(mq.matches)
      setVw(window.innerWidth)
    }
    mq.addEventListener("change", onChange)
    window.addEventListener("resize", onChange)
    return () => {
      mq.removeEventListener("change", onChange)
      window.removeEventListener("resize", onChange)
    }
  }, [])
  return wide
    ? { w: 264, photoH: 330, step: 288, open: 640, openPhoto: 264 }
    : { w: 220, photoH: 275, step: 236, open: Math.min(vw - 24, 520), openPhoto: 140 }
}

type CardProps = {
  teacher: Teacher
  offset: number
  expanded: boolean
  dimmed: boolean
  sizes: ReturnType<typeof useSizes>
  onOpen: (open: boolean) => void
  onFocus: () => void
}

function TeacherCard({ teacher, offset, expanded, dimmed, sizes, onOpen, onFocus }: CardProps) {
  const { t: tr, lang } = useI18n()
  const name = teacher.name || tr.teachers.fallbackName
  const subject = pick(teacher.subject, lang) || tr.teachers.fallbackSubject
  const exp = pick(teacher.exp, lang) || tr.teachers.placeholder.exp
  const about = pick(teacher.about, lang) || tr.teachers.placeholder.about
  const wins = teacher.wins.length ? teacher.wins.map((w) => pick(w, lang)) : tr.teachers.placeholder.wins
  const active = offset === 0
  const far = Math.abs(offset) > 2
  const side = Math.abs(offset)
  // A card wrapping round from one end of the ring to the other jumps there instead of sweeping across.
  const last = useRef(offset)
  const wrapped = Math.abs(offset - last.current) > 1
  last.current = offset

  // Hover intent: opens only after the mouse has really moved over the card for a moment. A card scrolled
  // under a resting cursor, or a pointer just passing by, leaves it shut.
  const intent = useRef<ReturnType<typeof setTimeout>>(undefined)
  const mouse = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => () => clearTimeout(intent.current), [])

  const detailsW = sizes.open - sizes.openPhoto
  // Neighbours stay sharp so faces read; only the open card's neighbours and the outer pair go soft.
  const blur = active ? 0 : dimmed ? 6 : side === 1 ? 0 : 3

  return (
    <motion.li
      initial={false}
      animate={{
        x: offset * sizes.step,
        scale: active ? 1 : dimmed ? 0.78 : side === 1 ? 0.88 : 0.76,
        opacity: active ? 1 : far ? 0 : dimmed ? 0.4 : side === 1 ? 0.9 : 0.45,
        filter: `blur(${blur}px)`,
      }}
      transition={wrapped ? { x: { duration: 0 }, scale: { duration: 0 }, default: SPRING } : SPRING}
      style={{ zIndex: active ? 20 : 10 - side }}
      className="absolute top-0 left-1/2 will-change-transform"
      aria-hidden={far || undefined}
    >
      <motion.article
        initial={false}
        animate={{ width: expanded ? sizes.open : sizes.w }}
        transition={SPRING}
        onPointerEnter={(e) => void mouseMoved(e, mouse)}
        onPointerMove={(e) => {
          if (!mouseMoved(e, mouse) || !active || expanded || intent.current) return
          intent.current = setTimeout(() => onOpen(true), 220)
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return
          mouse.current = null
          clearTimeout(intent.current)
          intent.current = undefined
          onOpen(false)
        }}
        onClick={() => (active ? onOpen(!expanded) : onFocus())}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return
          e.preventDefault()
          if (active) onOpen(!expanded)
          else onFocus()
        }}
        tabIndex={far ? -1 : 0}
        aria-expanded={active ? expanded : undefined}
        aria-label={name}
        style={{ x: "-50%", height: sizes.photoH + NAME_H }}
        className={cn(
          "relative flex cursor-pointer overflow-hidden rounded-[1.75rem] bg-card ring-1 ring-border outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
          "transition-shadow duration-500",
          active ? "shadow-[0_40px_80px_-40px_rgb(15_95_88/0.55)]" : "shadow-[0_20px_40px_-30px_rgb(15_95_88/0.4)]",
        )}
      >
        <motion.div
          initial={false}
          animate={{ width: expanded ? sizes.openPhoto : sizes.w }}
          transition={SPRING}
          className="relative flex h-full shrink-0 flex-col"
        >
          <div className="relative overflow-hidden bg-white" style={{ height: sizes.photoH }}>
            <img
              src={teacher.img}
              alt=""
              loading="lazy"
              decoding="async"
              width={720}
              height={960}
              draggable={false}
              className={cn(
                "h-full w-full object-cover object-[50%_15%] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]",
                expanded && "scale-[1.04]",
              )}
            />
            {/* Says "there's more here" on the centred card, in place of an instruction line. */}
            <span
              aria-hidden
              className={cn(
                "absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/90 text-[#0d2421] shadow-md backdrop-blur transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
                active && !expanded ? "scale-100 opacity-100" : "scale-75 opacity-0",
              )}
            >
              <Plus className="size-4" />
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center px-4">
            <h3 className="truncate font-display text-base font-bold md:text-lg">{name}</h3>
            <p className="truncate text-xs text-muted-foreground md:text-sm">{subject}</p>
          </div>
        </motion.div>

        {/* Details: laid out at their final width so nothing reflows while the card opens over them. */}
        <motion.div
          initial={false}
          animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : 24 }}
          transition={{ ...SPRING, delay: expanded ? 0.08 : 0 }}
          aria-hidden={!expanded}
          style={{ width: detailsW }}
          className="flex shrink-0 flex-col gap-3 overflow-hidden p-4 md:gap-4 md:p-6"
        >
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                {tr.teachers.labels.subject}
              </dt>
              <dd className="mt-0.5 font-semibold text-brand-ink">{subject}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                {tr.teachers.labels.exp}
              </dt>
              <dd className="mt-0.5 font-semibold">{exp}</dd>
            </div>
          </dl>
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              {tr.teachers.labels.wins}
            </p>
            <ul className="mt-1.5 grid gap-1">
              {wins.slice(0, 3).map((w, i) => (
                <li key={i} className="flex gap-2 text-xs md:text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="line-clamp-1">{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-h-0">
            <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              {tr.teachers.labels.about}
            </p>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground md:line-clamp-4 md:text-sm">
              {about}
            </p>
          </div>
          <Button
            asChild
            variant="accent"
            size="sm"
            className="group mt-auto self-start"
            onClick={(e) => e.stopPropagation()}
          >
            <a href="#ariza" tabIndex={expanded ? 0 : -1}>
              {tr.teachers.contact}
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </Button>
        </motion.div>
      </motion.article>
    </motion.li>
  )
}

export function Teachers() {
  const { t: tr } = useI18n()
  const sizes = useSizes()
  // Which card is open. Auto-rotation waits while one is, and moving on (swipe, arrows, dots) closes it.
  const [open, setOpen] = useState<number | null>(null)
  const { active, go, goTo, bind, inView, playing, togglePlay } = useCarousel<HTMLDivElement>({
    count: TEACHERS.length,
    paused: open !== null,
  })
  // A card tapped open and then scrolled away from (phones have no "pointer leave") closes, so rotation resumes.
  if (open !== null && (open !== active || !inView)) setOpen(null)
  const expanded = open === active

  return (
    <section id="ustozlar" className="overflow-x-clip py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading kicker={tr.teachers.kicker} title={tr.teachers.title} text={tr.teachers.text} />
      </div>

      <Reveal className="mt-12">
        <motion.div
          {...bind}
          role="region"
          aria-roledescription={tr.common.carousel}
          aria-label={tr.teachers.kicker}
          className="relative mx-auto cursor-grab outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/60 active:cursor-grabbing"
          style={{ ...bind.style, height: sizes.photoH + NAME_H }}
        >
          <ul>
            {TEACHERS.map((teacher, i) => {
              const offset = ringOffset(i, active, TEACHERS.length)
              return (
                <TeacherCard
                  key={teacher.img}
                  teacher={teacher}
                  offset={offset}
                  expanded={expanded && offset === 0}
                  dimmed={expanded && offset !== 0}
                  sizes={sizes}
                  onOpen={(o) => setOpen(o ? i : null)}
                  onFocus={() => goTo(i)}
                />
              )
            })}
          </ul>
        </motion.div>
        <CarouselControls
          className="mt-8"
          count={TEACHERS.length}
          current={active}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onDot={goTo}
          playing={playing}
          onTogglePlay={togglePlay}
          prevLabel={tr.teachers.prev}
          nextLabel={tr.teachers.next}
        />
      </Reveal>
    </section>
  )
}
