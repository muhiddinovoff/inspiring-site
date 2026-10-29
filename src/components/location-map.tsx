import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import type { LatLng } from "@/lib/geo"

type Pin = LatLng & { id: number; name: string }
type Props = {
  pins: Pin[]
  origin: LatLng | null
  selected: number | null
  onSelect: (id: number) => void
  you: string
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
export default function LocationMap({ pins, origin, selected, onSelect, you }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef(new Map<number, L.Marker>())
  const youMarker = useRef<L.Marker | null>(null)
  const select = useRef(onSelect)
  useEffect(() => {
    select.current = onSelect
  })

  // Map and centre pins, once.
  useEffect(() => {
    if (!el.current) return
    // On touch screens one finger scrolls the page; the zoom buttons and the cards below move the map.
    const touch = window.matchMedia("(pointer: coarse)").matches
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

  return <div ref={el} className="h-full w-full" role="region" aria-label="OpenStreetMap" />
}
