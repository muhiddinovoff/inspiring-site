type Point = { x: number; y: number } | null

/**
 * Tells a real mouse movement from the synthetic hover events a browser fires when the page scrolls under a
 * resting cursor: those arrive at the same screen position. Keep one `last` ref per element; reset it on leave.
 */
export function mouseMoved(e: React.PointerEvent, last: { current: Point }) {
  if (e.pointerType !== "mouse") return false
  const prev = last.current
  last.current = { x: e.clientX, y: e.clientY }
  return prev !== null && Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y) > 3
}
