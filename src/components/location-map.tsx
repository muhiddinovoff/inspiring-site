import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import { Hand, X } from "lucide-react"
import "leaflet/dist/leaflet.css"

import type { LatLng } from "@/lib/geo"

type Pin = LatLng & { id: number; name: string }
type Props = {
  pins: Pin[]
  /** Pins to frame when nothing is selected (the current city filter). */
  frame: number[]
  origin: LatLng | null
  selected: number | null
  onSelect: (id: number) => void
  labels: { you: string; map: string; unlockMap: string; lockMap: string }
}

// A classic map pin: brand teardrop, white ring, white centre. The selected one turns green, grows and pulses.
const PIN_SVG = `<svg viewBox="0 0 36 46" aria-hidden="true"><path d="M18 44.5S33 29.6 33 18.2A15 15 0 0 0 3 18.2C3 29.6 18 44.5 18 44.5Z" fill="currentColor" stroke="#fff" stroke-width="2.5"/><circle cx="18" cy="18" r="6.2" fill="#fff"/></svg>`
const pinIcon = (active: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="map-pin${active ? " is-active" : ""}">${PIN_SVG}</span>`,
    iconSize: [36, 46],
    iconAnchor: [18, 45],
    tooltipAnchor: [0, -46],
  })
const youIcon = L.divIcon({
  className: "",
  html: `<span class="map-you"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

// CARTO's OpenStreetMap basemaps: no key, and calmer than the default OSM style. Dark tiles in the dark theme.
const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
}
const isDark = () => {
  const theme = document.documentElement.dataset.theme
  return theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches
}
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Leaflet map of the centres: pins, the visitor's dot, a label on the selected centre and a flight to it. */
export default function LocationMap({ pins, frame, origin, selected, onSelect, labels }: Props) {
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
    L.control.zoom({ position: "bottomright" }).addTo(m)
    const tiles = L.tileLayer(isDark() ? TILES.dark : TILES.light, {
      maxZoom: 19,
      subdomains: "abcd",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(m)
    const retheme = () => tiles.setUrl(isDark() ? TILES.dark : TILES.light)
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
  const frameKey = frame.join(",")
  useEffect(() => {
    const m = map.current
    if (!m || selected !== null || !frame.length) return
    const points = frame.map((id) => markers.current.get(id)!.getLatLng())
    if (origin) points.push(L.latLng(origin.lat, origin.lng))
    m.flyToBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 13, animate: !reduceMotion(), duration: 1 })
    // frameKey stands for `frame`.
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

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="h-full w-full" role="region" aria-label={labels.map} />
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
          className="absolute top-3 right-3 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-2 text-sm font-semibold shadow-lg"
        >
          <X className="size-4" />
          {labels.lockMap}
        </button>
      )}
    </div>
  )
}
