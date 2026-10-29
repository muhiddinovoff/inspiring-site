import { memo, useMemo, useRef, useState } from "react"
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
const SPRING = { type: "spring", stiffness: 210, damping: 20, mass: 0.8 } as const
const AVATAR_TINTS = ["bg-[#ffd6a5]", "bg-[#cdeac0]", "bg-[#bde0fe]", "bg-[#ffc8dd]", "bg-[#e2d4f0]", "bg-[#fdffb6]"]

type Item = {
  k: number
  name: string
  text: string
  title?: string
  sent: boolean
  /** Scroll progress at which the bubble lands. */
  at: number
  typing: boolean
  label?: "delivered" | "read"
}

function buildWall(messages: { name: string; text: string }[], reasons: { title: string; text: string }[], us: string) {
  const items: Item[] = []
  let m = 0
  let r = 0
  for (let k = 0; k < COUNT; k++) {
    // About a third of the wall is already up when the section arrives, so it never opens on an empty screen.
    const at = -0.4 + rnd(k, 1) * 1.1
    const typing = rnd(k, 2) < 0.3
    // The centre's four reasons are its replies, spread through the first columns so phones see them too.
    if (k % 4 === 1 && r < reasons.length) {
      const reason = reasons[r++]
      items.push({ k, name: us, title: reason.title, text: reason.text, sent: false, at, typing })
      continue
    }
    const msg = messages[m++ % messages.length]
    const sent = rnd(k, 3) > 0.45
    const label = sent && rnd(k, 4) < 0.35 ? (rnd(k, 5) < 0.5 ? "delivered" : "read") : undefined
    items.push({ k, ...msg, sent, at, typing, label })
  }
  return items
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)

function TypingDots({ sent, label }: { sent: boolean; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className={cn("chat-bubble chat-typing absolute bottom-4", sent ? "chat-sent right-0" : "chat-received left-9")}
      role="img"
      aria-label={label}
    >
      <span />
      <span />
      <span />
    </motion.div>
  )
}

const Bubble = memo(function Bubble({ item, status }: { item: Item; status: "hidden" | "typing" | "shown" }) {
  const { t } = useI18n()
  const shown = status === "shown"
  const from = rnd(item.k, 6) < 0.5 ? -1 : 1
  const rest = (rnd(item.k, 7) - 0.5) * 3
  const avatar = item.title ? "bg-brand text-white" : AVATAR_TINTS[item.k % AVATAR_TINTS.length]

  return (
    <li
      className={cn("relative mb-3 break-inside-avoid flex-col", TIER(item.k), item.sent ? "items-end" : "items-start")}
    >
      <motion.div
        initial={false}
        animate={
          shown
            ? { opacity: 1, x: 0, y: 0, rotate: rest, scale: 1 }
            : { opacity: 0, x: from * 70, y: 40 + rnd(item.k, 8) * 40, rotate: from * 8, scale: 0.8 }
        }
        transition={SPRING}
        style={{ transformOrigin: item.sent ? "100% 100%" : "0% 100%" }}
        className={cn("flex max-w-[92%] flex-col", item.sent ? "items-end" : "items-start")}
      >
        <span className={cn("mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground")}>
          {!item.sent && (
            <span
              aria-hidden
              className={cn("grid size-7 place-items-center rounded-full text-[10px] font-bold text-[#0d2421]", avatar)}
            >
              {item.title ? "IE" : initials(item.name)}
            </span>
          )}
          {item.name}
        </span>
        <p className={cn("chat-bubble", item.sent ? "chat-sent" : "chat-received", !item.sent && "ml-8")}>
          {item.title && <strong className="block font-bold">{item.title}</strong>}
          {item.text}
        </p>
        {item.label && (
          <span className="mt-1 mr-1 text-[11.5px] font-medium text-muted-foreground">
            {t.reasons.chat[item.label]}
          </span>
        )}
      </motion.div>
      <AnimatePresence>
        {status === "typing" && <TypingDots sent={item.sent} label={`${item.name}: ${t.reasons.chat.typing}`} />}
      </AnimatePresence>
    </li>
  )
})

export function Reasons() {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const still = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  // Quantised so the wall only re-renders when something can actually change.
  const [step, setStep] = useState(0)
  useMotionValueEvent(scrollYProgress, "change", (v) => setStep(Math.round(v * 200) / 200))
  const progress = still ? 1 : step

  const { messages, us } = t.reasons.chat
  const wall = useMemo(() => buildWall(messages, t.reasons.items, us), [messages, t.reasons.items, us])

  return (
    <section
      ref={ref}
      id="nega"
      aria-labelledby="nega-title"
      className={cn("chat-wall relative bg-background", still ? "h-svh min-h-[40rem]" : "h-[200svh]")}
    >
      {/* Phones: heading on top, the wall fills the rest. Larger screens: the wall fills the screen around a centred card. */}
      <div className="sticky top-0 flex h-svh min-h-[40rem] flex-col overflow-hidden">
        <div className="relative z-20 shrink-0 px-5 pt-20 pb-4 md:pointer-events-none md:absolute md:inset-0 md:grid md:place-items-center md:p-5">
          <Reveal className="mx-auto max-w-xl text-center md:pointer-events-auto md:rounded-[2rem] md:bg-background/75 md:px-12 md:py-12 md:shadow-[0_40px_120px_-30px_rgb(15_95_88/0.45)] md:ring-1 md:ring-border/70 md:backdrop-blur-2xl md:backdrop-saturate-150">
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
          className="relative min-h-0 flex-1 columns-2 gap-3 px-3 pt-2 [column-fill:auto] md:absolute md:inset-0 md:columns-3 md:gap-5 md:px-6 md:pt-24 lg:columns-4 xl:columns-5"
        >
          {wall.map((item) => {
            const status =
              progress >= item.at ? "shown" : item.typing && progress >= item.at - 0.07 ? "typing" : "hidden"
            return <Bubble key={item.k} item={item} status={status} />
          })}
        </ul>
      </div>
    </section>
  )
}
