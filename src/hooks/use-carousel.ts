import { useRef, useState } from "react"
import { useMotionValueEvent, useScroll, useSpring, useTransform, type PanInfo } from "framer-motion"

import { scrollToY } from "@/lib/scroll"

/** Signed shortest distance from position `p` to slot `i` on a ring of `n` slots, in [-n/2, n/2). Works for fractions. */
export const ringOffset = (i: number, p: number, n: number) => {
  const d = (((i - p) % n) + n) % n
  return d >= n / 2 ? d - n : d
}

/** Screen heights of scrolling per card. Lower is faster. */
const PER_CARD = 0.45

/**
 * Scroll position → carousel position: moves card by card with a short rest on each, so every card can be read.
 * `v` is the section's scroll progress (0–1); the result runs from 0 (first card) to `count - 1` (last).
 */
function stepped(v: number, count: number) {
  if (count < 2) return 0
  const t = Math.min(Math.max(v, 0), 1) * (count - 1)
  const k = Math.min(Math.floor(t), count - 2)
  const f = (t - k - 0.2) / 0.6
  const e = f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f)
  return k + e
}

/**
 * A carousel driven by the page scroll: its section is pinned while the visitor scrolls past, and the cards turn
 * one by one until each has had its turn in the centre. Arrows, dots, keys and swipes scroll the page to a card.
 * Spread `section` on the tall section and `bind` on the visible carousel.
 */
export function useScrollCarousel<S extends HTMLElement>({ count }: { count: number }) {
  const ref = useRef<S>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const target = useTransform(scrollYProgress, (v) => stepped(v, count))
  // Springing the stepped value keeps a hard flick or swipe from snapping the cards.
  const pos = useSpring(target, { stiffness: 140, damping: 28, mass: 0.6, restDelta: 0.0005 })
  const [active, setActive] = useState(0)
  useMotionValueEvent(pos, "change", (v) => setActive(Math.min(count - 1, Math.max(0, Math.round(v)))))
  const dragged = useRef(false)

  /** Scrolls the page to where card `i` sits in the centre. */
  const goTo = (i: number) => {
    const el = ref.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const range = el.offsetHeight - window.innerHeight
    scrollToY(top + (count > 1 ? (range * i) / (count - 1) : 0))
  }
  // Past the last card, "next" wraps round to the first (and back), like the ring the cards sit on.
  const go = (step: number) => goTo((((active + step) % count) + count) % count)

  const section = {
    ref,
    style: { height: `calc(100svh + ${(count - 1) * PER_CARD * 100}svh)` },
  }

  const bind = {
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1)
      else if (e.key === "ArrowLeft") go(-1)
      else return
      e.preventDefault()
    },
    onPanStart: () => {
      dragged.current = true
    },
    // A swipe ends with a click on whatever card was under the finger; swallow it.
    onClickCapture: (e: React.MouseEvent) => {
      if (!dragged.current) return
      dragged.current = false
      e.stopPropagation()
      e.preventDefault()
    },
    onPanEnd: (_: unknown, info: PanInfo) => {
      const swipe = info.offset.x + info.velocity.x * 0.2
      if (Math.abs(swipe) > 50) go(swipe < 0 ? 1 : -1)
    },
    style: { touchAction: "pan-y" } as const,
  }

  return { pos, active, go, goTo, section, bind }
}
