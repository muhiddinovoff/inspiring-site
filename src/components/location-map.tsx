import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import { Hand, X } from "lucide-react"
import "leaflet/dist/leaflet.css"

import type { LatLng } from "@/lib/geo"

type Pin = LatLng & { id: number; name: string }
type Props = {
  pins: Pin[]
  origin: LatLng | null
  selected: number | null
  onSelect: (id: number) => void
  labels: { you: string; map: string; unlockMap: string; lockMap: string }
}

const pinIcon = (active: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="map-pin${active ? " is-active" : ""}"><span></span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
  })
const youIcon = L.divIcon({
  className: "",
  html: `<span class="map-you"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Leaflet + OpenStreetMap: a pin per centre, a blue dot for the visitor, and a flight to the selected centre. */
export default function LocationMap({ pins, origin, selected, onSelect, labels }: Props) {
  const { you } = labels
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

  // Map and centre pins, once.
  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { scrollWheelZoom: false, dragging: !touch, zoomSnap: 0.25 })
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    for (const p of pins) {
      const marker = L.marker([p.lat, p.lng], { icon: pinIcon(false), title: p.name, keyboard: true })
        .on("click", () => select.current(p.id))
        .addTo(m)
      markers.current.set(p.id, marker)
    }
    m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [30, 30] })
    map.current = m
    const all = markers.current
    return () => {
      m.remove()
      map.current = null
      all.clear()
    }
    // The centre list never changes after mount; names only feed the marker tooltips.
  }, [])

  // Visitor's dot.
  useEffect(() => {
    const m = map.current
    if (!m) return
    youMarker.current?.remove()
    youMarker.current = origin
      ? L.marker([origin.lat, origin.lng], { icon: youIcon, title: you, zIndexOffset: 1000 }).addTo(m)
      : null
  }, [origin, you])

  // Highlight and fly to the selected centre, keeping the visitor in view while it's near.
  useEffect(() => {
    const m = map.current
    if (!m || selected === null) return
    markers.current.forEach((marker, id) =>
      marker.setIcon(pinIcon(id === selected)).setZIndexOffset(id === selected ? 500 : 0),
    )
    const target = markers.current.get(selected)?.getLatLng()
    if (!target) return
    const animate = !reduceMotion()
    if (origin && target.distanceTo(origin) < 40_000) {
      m.flyToBounds(L.latLngBounds([target, [origin.lat, origin.lng]]), {
        padding: [60, 60],
        maxZoom: 15,
        animate,
        duration: 1.2,
      })
    } else {
      m.flyTo(target, 14, { animate, duration: 1.2 })
    }
  }, [selected, origin])

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
          <span className="inline-flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur">
            <Hand className="size-4" />
            {labels.unlockMap}
          </span>
        </button>
      )}
      {touch && unlocked && (
        <button
          type="button"
          onClick={() => setUnlocked(false)}
          className="absolute top-3 right-3 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur"
        >
          <X className="size-4" />
          {labels.lockMap}
        </button>
      )}
    </div>
  )
}
