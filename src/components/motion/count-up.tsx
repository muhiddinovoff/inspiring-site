import { useEffect, useRef } from "react"
import { animate, useInView, useReducedMotion } from "framer-motion"

type Props = { to: number; decimals?: number; suffix?: string; duration?: number }

const fmt = (v: number, decimals: number) => v.toFixed(decimals).replace(".", ",")

/** Counts from 0 to `to` when it scrolls into view. Renders the final value up front so it is never wrong without JS. */
export function CountUp({ to, decimals = 0, suffix = "", duration = 1.6 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" })
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || !inView || reduce) return
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v, decimals) + suffix
      },
    })
    return () => controls.stop()
  }, [inView, reduce, to, decimals, suffix, duration])

  return (
    <span ref={ref} className="tabular-nums">
      {fmt(to, decimals) + suffix}
    </span>
  )
}
