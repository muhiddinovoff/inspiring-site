import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion, useSpring, type PanInfo } from "framer-motion"

/** Signed shortest distance from position `p` to slot `i` on a ring of `n` slots, in [-n/2, n/2). Works for fractions. */
export const ringOffset = (i: number, p: number, n: number) => {
  const d = (((i - p) % n) + n) % n
  return d >= n / 2 ? d - n : d
}

const mod = (i: number, n: number) => ((i % n) + n) % n

/** How long each card stays in the centre before the carousel turns on by itself, in ms. */
const AUTOPLAY = 5000

/**
 * A ring carousel, independent of the page scroll: arrows, dots, keys and swipes turn it, and while it is on screen
 * and nobody is using it, it turns on by itself every few seconds. It pauses while hovered, focused or `paused`,
 * and never moves on its own when the visitor prefers reduced motion.
 * Spread `section` on the section and `bind` on the visible carousel.
 *
 * `pos` keeps counting past the last card (it is a position on the ring, not an index), so the cards keep turning
 * the same way instead of rewinding. `centre` is that position rounded; `active` is the card in the centre.
 */
export function useCarousel<S extends HTMLElement>({ count, paused = false }: { count: number; paused?: boolean }) {
  const ref = useRef<S>(null)
  const [centre, setCentre] = useState(0)
  const pos = useSpring(0, { stiffness: 140, damping: 28, mass: 0.6, restDelta: 0.0005 })
  useEffect(() => pos.set(centre), [centre, pos])
  const active = mod(centre, count)

  const go = (step: number) => setCentre((c) => c + step)
  /** Turns the shortest way round to card `i`. */
  const goTo = (i: number) => setCentre((c) => c + ringOffset(i, c, count))

  const inView = useInView(ref, { amount: 0.4 })
  const still = useReducedMotion() ?? false
  const [held, setHeld] = useState(false)
  // Every move, by hand or by itself, restarts the wait, so a card someone just picked gets its full time.
  useEffect(() => {
    if (still || paused || held || !inView || count < 2) return
    const id = setTimeout(() => {
      if (document.visibilityState === "visible") setCentre((c) => c + 1)
    }, AUTOPLAY)
    return () => clearTimeout(id)
  }, [centre, still, paused, held, inView, count])

  const dragged = useRef(false)
  const section = { ref }

  const bind = {
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1)
      else if (e.key === "ArrowLeft") go(-1)
      else return
      e.preventDefault()
    },
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setHeld(true),
    onPointerLeave: () => setHeld(false),
    onFocus: () => setHeld(true),
    onBlur: () => setHeld(false),
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

  return { pos, centre, active, go, goTo, section, bind }
}
