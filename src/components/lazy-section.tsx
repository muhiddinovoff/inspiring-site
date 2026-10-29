import { Suspense, useEffect, useRef, useState } from "react"

type Props = { children: React.ReactNode; minHeight: string; id?: string }

/**
 * Mounts a below-the-fold section (and downloads its code, when it's a `lazy` component) only once the visitor
 * scrolls within a screen or so of it. The placeholder keeps the page height steady until then.
 */
export function LazySection({ children, minHeight, id }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (!("IntersectionObserver" in window)) return setNear(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "100% 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  const placeholder = <div ref={ref} id={id} style={{ minHeight }} aria-hidden />
  if (!near) return placeholder
  return <Suspense fallback={<div style={{ minHeight }} aria-hidden />}>{children}</Suspense>
}
