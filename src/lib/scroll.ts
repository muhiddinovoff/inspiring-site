import type Lenis from "lenis"

let lenis: Lenis | null = null

/** Registered by useSmoothScroll so code elsewhere can scroll through it instead of fighting it. */
export const setLenis = (instance: Lenis | null) => {
  lenis = instance
}

/** Glides the page to `y` (px from the top): through Lenis when it runs, natively otherwise. */
export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.2 })
  else
    window.scrollTo({
      top: y,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    })
}
