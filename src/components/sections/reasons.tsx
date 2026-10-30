import { memo, useLayoutEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion"

import { Reveal } from "@/components/motion/reveal"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

/** Bubbles on the wall. Small screens show the first ones only (see `TIER`), the rest spill off the edge anyway. */
const COUNT = 46
const TIER = (k: number) =>
  k >= 36 ? "hidden xl:flex" : k >= 28 ? "hidden lg:flex" : k >= 18 ? "hidden md:flex" : "flex"
/** Repeatable "random" in [0, 1) so the wall looks the same on every visit and on the server-rendered HTML. */
const rnd = (k: number, salt: number) => {
  const x = Math.sin(k * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

type Msg = { from: "parent" | "us"; text: string }
type Item = {
  k: number
  /** Parents' messages are the blue "sent" bubbles; the centre's replies are grey, with its name. */
  sent: boolean
  text: string
  title?: string
  /** Scroll progress at which the bubble lands. */
  at: number
  typing: boolean
  label?: "delivered" | "read"
}

/**
 * The conversation in reading order (a question, then its answer; the centre's four reasons dropped in after
 * every two exchanges), repeated to fill the wall. Columns fill top to bottom, so each answer sits under its question.
 */
function buildWall(messages: Msg[], reasons: { title: string; text: string }[]) {
  const thread: Omit<Item, "k" | "at" | "typing" | "label">[] = []
  messages.forEach((m, i) => {
    thread.push({ sent: m.from === "parent", text: m.text })
    if (i % 4 === 3 && i / 4 < reasons.length) {
      const r = reasons[Math.floor(i / 4)]
      thread.push({ sent: false, title: r.title, text: r.text })
    }
  })
  return Array.from({ length: COUNT }, (_, k): Item => {
    const msg = thread[k % thread.length]
    // About a third of the wall is already up when the section arrives, so it never opens on an empty screen.
    const at = -0.4 + rnd(k, 1) * 1.1
    // The centre "types" before some replies; parents' messages get a delivered/read note now and then.
    const typing = !msg.sent && rnd(k, 2) < 0.55
    const label = msg.sent && rnd(k, 4) < 0.35 ? (rnd(k, 5) < 0.5 ? "delivered" : "read") : undefined
    return { k, ...msg, at, typing, label }
  })
}

function TypingDots({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className="chat-bubble chat-received chat-typing absolute bottom-4 left-9"
      role="img"
      aria-label={label}
    >
      <span />
      <span />
      <span />
    </motion.div>
  )
}

type Fly = { dx: number; dy: number }
type BubbleProps = {
  item: Item
  status: "hidden" | "typing" | "shown"
  fly: Fly | undefined
  liRef: (el: HTMLLIElement | null) => void
}

/**
 * Hidden, a bubble waits small and invisible at the heading in the middle; shown, it flies out to its own spot
 * with a slight overshoot. Plain CSS transitions on transform and opacity: the browser runs them on the
 * compositor, so they stay smooth however busy the page is.
 */
const Bubble = memo(function Bubble({ item, status, fly, liRef }: BubbleProps) {
  const { t } = useI18n()
  const shown = status === "shown"
  const rest = (rnd(item.k, 7) - 0.5) * 3
  const spin = (rnd(item.k, 6) - 0.5) * 30
  const delay = rnd(item.k, 9) * 0.12
  const { us, parent } = t.reasons.chat

  return (
    <li
      ref={liRef}
      aria-label={item.sent ? parent : us}
      className={cn("relative mb-3 break-inside-avoid flex-col", TIER(item.k), item.sent ? "items-end" : "items-start")}
    >
      <div
        style={{
          opacity: shown ? 1 : 0,
          transform: shown
            ? `translate3d(0,0,0) rotate(${rest}deg) scale(1)`
            : `translate3d(${fly?.dx ?? 0}px,${fly?.dy ?? 0}px,0) rotate(${spin}deg) scale(0.2)`,
          transition: shown
            ? `transform 0.75s cubic-bezier(0.34, 1.32, 0.64, 1) ${delay}s, opacity 0.35s ease ${delay}s`
            : "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
        }}
        className={cn(
          "flex max-w-[92%] flex-col motion-reduce:transition-none",
          item.sent ? "items-end" : "items-start",
        )}
      >
        {!item.sent && (
          <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-full bg-brand text-[10px] font-bold text-white"
            >
              IE
            </span>
            {us}
          </span>
        )}
        <p className={cn("chat-bubble", item.sent ? "chat-sent" : "chat-received ml-8")}>
          {item.title && <strong className="block font-bold">{item.title}</strong>}
          {item.text}
        </p>
        {item.label && (
          <span className="mt-1 mr-1 text-[11.5px] font-medium text-muted-foreground">
            {t.reasons.chat[item.label]}
          </span>
        )}
      </div>
      <AnimatePresence>
        {status === "typing" && <TypingDots label={`${us}: ${t.reasons.chat.typing}`} />}
      </AnimatePresence>
    </li>
  )
})

export function Reasons() {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const still = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })

  const { messages } = t.reasons.chat
  const wall = useMemo(() => buildWall(messages, t.reasons.items), [messages, t.reasons.items])

  // Where each bubble flies out from (the heading) and when: nearest the heading first, so the wall spreads
  // outwards from the middle like a wave. Measured from the real layout, again whenever it reflows.
  const heading = useRef<HTMLDivElement>(null)
  const lis = useRef(new Map<number, HTMLLIElement>())
  const [plan, setPlan] = useState(() => new Map<number, Fly & { at: number }>())
  useLayoutEffect(() => {
    const stage = heading.current?.parentElement
    if (!stage) return
    const measure = () => {
      const h = heading.current!.getBoundingClientRect()
      const ox = h.left + h.width / 2
      const oy = h.top + h.height / 2
      const box = stage.getBoundingClientRect()
      const spots = [...lis.current].flatMap(([k, el]) => {
        const r = el.getBoundingClientRect()
        // Hidden on this screen size, or spilled past the clipped edge: never seen, so not in the queue.
        if (!r.width || r.left >= box.right - 8 || r.top >= box.bottom - 8) return []
        const dx = ox - (r.left + r.width / 2)
        const dy = oy - (r.top + r.height / 2)
        return [{ k, dx, dy, dist: Math.hypot(dx, dy) }]
      })
      spots.sort((a, b) => a.dist - b.dist)
      const last = Math.max(spots.length - 1, 1)
      setPlan(new Map(spots.map((s, rank) => [s.k, { dx: s.dx, dy: s.dy, at: -0.1 + (rank / last) * 0.8 }])))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [wall])

  const atOf = (item: Item) => plan.get(item.k)?.at ?? (plan.size ? 2 : item.at)
  // Re-render only when the scroll crosses a moment where some bubble changes state, not on every frame.
  const marks = useMemo(
    () =>
      wall
        .flatMap((it) => {
          const at = plan.get(it.k)?.at ?? (plan.size ? 2 : it.at)
          return it.typing ? [at, at - 0.07] : [at]
        })
        .sort((a, b) => a - b),
    [wall, plan],
  )
  const crossed = (v: number) => marks.filter((m) => v >= m).length
  const [progress, setProgress] = useState(0)
  const lastCrossed = useRef(-1)
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const c = crossed(v)
    if (c === lastCrossed.current) return
    lastCrossed.current = c
    setProgress(v)
  })
  const p = still ? 1 : progress
  // Stable ref callbacks, one per bubble, so the memoised bubbles don't re-render for a new function each time.
  const liRefs = useMemo(
    () =>
      wall.map((item) => (el: HTMLLIElement | null) => {
        if (el) lis.current.set(item.k, el)
        else lis.current.delete(item.k)
      }),
    [wall],
  )

  return (
    <section
      ref={ref}
      id="nega"
      aria-labelledby="nega-title"
      className={cn("chat-wall relative bg-background", still ? "h-svh min-h-[40rem]" : "h-[200svh]")}
    >
      {/* Phones: heading on top, the wall fills the rest. Larger screens: the wall fills the screen around a centred card. */}
      <div className="sticky top-0 flex h-svh min-h-[40rem] flex-col overflow-hidden">
        <div
          ref={heading}
          className="relative z-20 shrink-0 px-5 pt-20 pb-4 md:pointer-events-none md:absolute md:inset-0 md:grid md:place-items-center md:p-5"
        >
          <Reveal className="mx-auto max-w-xl text-center md:pointer-events-auto md:rounded-[2rem] md:bg-background/92 md:px-12 md:py-12 md:shadow-[0_40px_120px_-30px_rgb(15_95_88/0.45)] md:ring-1 md:ring-border/70">
            <p className="text-xs font-bold tracking-[0.14em] text-brand-ink uppercase md:text-sm">
              {t.reasons.kicker}
            </p>
            <h2 id="nega-title" className="mt-2 text-3xl leading-[1.05] font-extrabold md:mt-3 md:text-6xl">
              {t.reasons.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground md:mt-5 md:text-lg">
              <span className="font-display text-lg font-extrabold text-brand-ink md:text-2xl">97{t.decimal}7%</span>{" "}
              {t.reasons.badge}
            </p>
          </Reveal>
        </div>

        <ul
          aria-label={t.reasons.chat.aria}
          className="relative min-h-0 flex-1 columns-2 gap-3 overflow-hidden px-3 pt-2 [column-fill:auto] md:absolute md:inset-0 md:columns-3 md:gap-5 md:px-6 md:pt-24 lg:columns-4 xl:columns-5"
        >
          {wall.map((item) => {
            const at = atOf(item)
            const status = p >= at ? "shown" : item.typing && p >= at - 0.07 ? "typing" : "hidden"
            return <Bubble key={item.k} item={item} status={status} fly={plan.get(item.k)} liRef={liRefs[item.k]} />
          })}
        </ul>
      </div>
    </section>
  )
}
