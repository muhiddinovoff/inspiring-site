import { useCallback, useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion, type PanInfo } from "framer-motion"

type Options = { count: number; interval?: number; paused?: boolean }

/** Signed shortest distance from `active` to `i` on a ring of `n` slots, in [-n/2, n/2). */
export const ringOffset = (i: number, active: number, n: number) => {
  const d = (((i - active) % n) + n) % n
  return d >= n / 2 ? d - n : d
}

/**
 * State for an endless, centred carousel: the active slot, stepping, auto-rotation that pauses on hover,
 * touch, while off screen or for reduced motion, plus swipe and arrow-key handlers to spread on the viewport.
 */
export function useCarousel<T extends HTMLElement>({ count, interval = 3500, paused = false }: Options) {
  const ref = useRef<T>(null)
  const inView = useInView(ref, { margin: "-20% 0px -20% 0px" })
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState(false)
  const [touchHold, setTouchHold] = useState(false)
  const resume = useRef<ReturnType<typeof setTimeout>>(undefined)
  const dragged = useRef(false)

  const go = useCallback((step: number) => setActive((a) => (((a + step) % count) + count) % count), [count])
  const goTo = useCallback((i: number) => setActive(i), [])

  const running = inView && !reduce && !hover && !touchHold && !paused
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => !document.hidden && go(1), interval)
    return () => clearInterval(id)
  }, [running, interval, go, active])

  useEffect(() => () => clearTimeout(resume.current), [])

  const bind = {
    ref,
    tabIndex: 0,
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setHover(true),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setHover(false),
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return
      clearTimeout(resume.current)
      setTouchHold(true)
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return
      clearTimeout(resume.current)
      resume.current = setTimeout(() => setTouchHold(false), 4000)
    },
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

  return { active, go, goTo, bind }
}
