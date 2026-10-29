import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import { Expand, Hand, LocateFixed, Minus, Plus, X } from "lucide-react"
import "leaflet/dist/leaflet.css"

import type { LatLng } from "@/lib/geo"
import { cn } from "@/lib/utils"

type Pin = LatLng & { id: number; name: string }
type Props = {
  pins: Pin[]
  /** Pins to frame when nothing is selected (the current city filter). */
  frame: number[]
  origin: LatLng | null
  selected: number | null
  onSelect: (id: number) => void
  /** Asks for the visitor's location (the map's "my location" button). */
  onLocate: () => void
  labels: {
    you: string
    map: string
    unlockMap: string
    lockMap: string
    zoomIn: string
    zoomOut: string
    fitAll: string
    locateMe: string
  }
}

// Apple Maps-style marker: a round badge with a graduation-cap glyph on a short point. The selected one turns
// green, grows and pulses; its name sits above it in a label.
const CAP =
  '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>'
const PIN_SVG = `<svg viewBox="0 0 40 50" aria-hidden="true"><path d="M20 49 14.2 38.6A18 18 0 1 1 25.8 38.6Z" fill="currentColor" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><g transform="translate(9 8.5) scale(.92)" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${CAP}</g></svg>`
const pinIcon = (active: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="map-pin${active ? " is-active" : ""}">${PIN_SVG}</span>`,
    iconSize: [40, 50],
    iconAnchor: [20, 49],
    tooltipAnchor: [0, -50],
  })
const youIcon = L.divIcon({
  className: "",
  html: `<span class="map-you"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

// OpenStreetMap's own tiles: free, no key or account (CARTO's now ask for one). OSM has no dark style, so the
// dark theme darkens the same tiles with a CSS filter (`.map-dark` in index.css).
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const isDark = () => {
  const theme = document.documentElement.dataset.theme
  return theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches
}
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Leaflet map of the centres: pins, the visitor's dot, a label on the selected centre and a flight to it. */
export default function LocationMap({ pins, frame, origin, selected, onSelect, onLocate, labels }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef(new Map<number, L.Marker>())
  const youMarker = useRef<L.Marker | null>(null)
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches)
  // On touch screens one finger scrolls the page, so the map only takes drags after a tap on it ("unlocked").
  const [unlocked, setUnlocked] = useState(false)
  const select = useRef(onSelect)
  useEffect(() => {
    select.current = onSelect
  })

  // Map, tiles and centre pins, once. Tiles follow the site theme.
  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { scrollWheelZoom: false, dragging: !touch, zoomSnap: 0.25, zoomControl: false })
    m.attributionControl.setPrefix(false)
    L.tileLayer(TILES, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    const container = el.current
    const retheme = () => container.classList.toggle("map-dark", isDark())
    retheme()
    const themeWatch = new MutationObserver(retheme)
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", retheme)

    for (const p of pins) {
      const marker = L.marker([p.lat, p.lng], {
        icon: pinIcon(false),
        title: p.name,
        keyboard: true,
        riseOnHover: true,
      })
        .on("click", () => select.current(p.id))
        .addTo(m)
      markers.current.set(p.id, marker)
    }
    m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [40, 40] })
    map.current = m
    const all = markers.current
    return () => {
      themeWatch.disconnect()
      mq.removeEventListener("change", retheme)
      m.remove()
      map.current = null
      all.clear()
    }
    // The centre list never changes after mount.
  }, [])

  // Visitor's dot.
  useEffect(() => {
    const m = map.current
    if (!m) return
    youMarker.current?.remove()
    youMarker.current = origin
      ? L.marker([origin.lat, origin.lng], { icon: youIcon, title: labels.you, zIndexOffset: 1000 }).addTo(m)
      : null
  }, [origin, labels.you])

  // Nothing selected: frame the filtered centres (and the visitor, if known).
  const showFrame = () => {
    const m = map.current
    if (!m || !frame.length) return
    const points = frame.map((id) => markers.current.get(id)!.getLatLng())
    if (origin) points.push(L.latLng(origin.lat, origin.lng))
    m.flyToBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 13, animate: !reduceMotion(), duration: 1 })
  }
  const frameKey = frame.join(",")
  useEffect(() => {
    if (selected === null) showFrame()
    // frameKey stands for `frame`; showFrame reads the current props.
  }, [frameKey, selected, origin])

  // Selected centre: green pin with its name, and a flight there that keeps the visitor in view while near.
  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((marker, id) => {
      const on = id === selected
      marker.setIcon(pinIcon(on)).setZIndexOffset(on ? 500 : 0)
      marker.unbindTooltip()
      if (on) {
        const name = pins.find((p) => p.id === id)?.name ?? ""
        marker.bindTooltip(name, { permanent: true, direction: "top", className: "map-label" }).openTooltip()
      }
    })
    if (selected === null) return
    const target = markers.current.get(selected)?.getLatLng()
    if (!target) return
    const animate = !reduceMotion()
    if (origin && target.distanceTo(origin) < 40_000) {
      m.flyToBounds(L.latLngBounds([target, [origin.lat, origin.lng]]), {
        padding: [70, 70],
        maxZoom: 15,
        animate,
        duration: 1.1,
      })
    } else {
      m.flyTo(target, 15, { animate, duration: 1.1 })
    }
  }, [selected, origin, pins])

  useEffect(() => {
    const m = map.current
    if (!m || !touch) return
    if (unlocked) m.dragging.enable()
    else m.dragging.disable()
  }, [touch, unlocked])

  // Scrolling the map away locks it again, so it can't trap the page next time a thumb lands on it.
  useEffect(() => {
    if (!unlocked || !el.current) return
    const io = new IntersectionObserver(([e]) => !e.isIntersecting && setUnlocked(false), { threshold: 0.2 })
    io.observe(el.current)
    return () => io.disconnect()
  }, [unlocked])

  const control =
    "grid size-10 place-items-center text-foreground transition-colors outline-none hover:bg-secondary focus-visible:bg-secondary active:bg-border"
  return (
    <div className="relative h-full w-full">
      <div ref={el} className="h-full w-full" role="region" aria-label={labels.map} />
      {/* Apple Maps-style controls: one rounded group for zoom, separate round buttons for "all" and "me". */}
      <div className="absolute top-3 right-3 z-[1001] flex flex-col items-end gap-2">
        <div className="flex flex-col overflow-hidden rounded-xl bg-background/95 shadow-[0_6px_20px_-6px_rgb(13_36_33/0.35)] ring-1 ring-border/60">
          <button type="button" aria-label={labels.zoomIn} onClick={() => map.current?.zoomIn()} className={control}>
            <Plus className="size-[1.1rem]" />
          </button>
          <span className="mx-2 h-px bg-border" />
          <button type="button" aria-label={labels.zoomOut} onClick={() => map.current?.zoomOut()} className={control}>
            <Minus className="size-[1.1rem]" />
          </button>
        </div>
        <button
          type="button"
          aria-label={labels.fitAll}
          title={labels.fitAll}
          onClick={showFrame}
          className={cn(
            control,
            "rounded-xl bg-background/95 shadow-[0_6px_20px_-6px_rgb(13_36_33/0.35)] ring-1 ring-border/60",
          )}
        >
          <Expand className="size-[1.05rem]" />
        </button>
        <button
          type="button"
          aria-label={labels.locateMe}
          title={labels.locateMe}
          onClick={onLocate}
          className={cn(
            control,
            "rounded-xl bg-background/95 text-[#0a84ff] shadow-[0_6px_20px_-6px_rgb(13_36_33/0.35)] ring-1 ring-border/60",
          )}
        >
          <LocateFixed className="size-[1.05rem]" />
        </button>
      </div>
      {touch && !unlocked && (
        <button
          type="button"
          onClick={() => setUnlocked(true)}
          className="absolute inset-0 z-[1000] flex items-end justify-center bg-transparent pb-4"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-sm font-semibold shadow-lg">
            <Hand className="size-4" />
            {labels.unlockMap}
          </span>
        </button>
      )}
      {touch && unlocked && (
        <button
          type="button"
          onClick={() => setUnlocked(false)}
          className="absolute top-3 left-3 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-2 text-sm font-semibold shadow-lg"
        >
          <X className="size-4" />
          {labels.lockMap}
        </button>
      )}
    </div>
  )
}
