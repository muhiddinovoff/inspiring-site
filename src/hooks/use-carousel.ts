import { useCallback, useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion, type PanInfo } from "framer-motion"

import { mouseMoved } from "@/lib/pointer"

const TOUCH_RESUME = 2500

type Options = { count: number; interval?: number; paused?: boolean }

/** Signed shortest distance from `active` to `i` on a ring of `n` slots, in [-n/2, n/2). */
export const ringOffset = (i: number, active: number, n: number) => {
  const d = (((i - active) % n) + n) % n
  return d >= n / 2 ? d - n : d
}

/**
 * State for an endless, centred carousel: the active slot, stepping, auto-rotation that pauses on hover, for a
 * moment after a touch, and while off screen, plus swipe and arrow-key handlers to spread on the viewport.
 * With reduced motion it still rotates (the site's MotionConfig turns the slide into a plain swap), just slower.
 */
export function useCarousel<T extends HTMLElement>({ count, interval = 3500, paused = false }: Options) {
  const ref = useRef<T>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState(false)
  const [touchHold, setTouchHold] = useState(false)
  // Visitor's own pause button; nothing restarts the rotation until they press it again.
  const [stopped, setStopped] = useState(false)
  const resume = useRef<ReturnType<typeof setTimeout>>(undefined)
  const dragged = useRef(false)
  const mouse = useRef<{ x: number; y: number } | null>(null)

  const go = useCallback((step: number) => setActive((a) => (((a + step) % count) + count) % count), [count])
  const goTo = useCallback((i: number) => setActive(i), [])

  const running = inView && !hover && !touchHold && !paused && !stopped
  const every = reduce ? interval * 1.6 : interval
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => !document.hidden && go(1), every)
    return () => clearInterval(id)
  }, [running, every, go, active])

  useEffect(() => () => clearTimeout(resume.current), [])

  const release = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return
    clearTimeout(resume.current)
    resume.current = setTimeout(() => setTouchHold(false), TOUCH_RESUME)
  }

  const bind = {
    ref,
    tabIndex: 0,
    // Paused only while the mouse is really being moved over it: when the page scrolls the carousel under a
    // resting cursor, the browser reports a hover too, and the carousel would never move for that visitor.
    onPointerEnter: (e: React.PointerEvent) => void mouseMoved(e, mouse),
    onPointerMove: (e: React.PointerEvent) => mouseMoved(e, mouse) && setHover(true),
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return
      mouse.current = null
      setHover(false)
    },
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return
      clearTimeout(resume.current)
      setTouchHold(true)
    },
    // A finger that starts a page scroll on the carousel ends in pointercancel, not pointerup: both resume.
    onPointerUp: release,
    onPointerCancel: release,
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

  return { active, go, goTo, bind, inView, playing: !stopped, togglePlay: () => setStopped((v) => !v) }
}
