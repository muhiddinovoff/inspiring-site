import { BRANCHES, CONTACT, type City } from "@/data/site"
import type { LatLng } from "@/lib/geo"

/**
 * Learning centres for the "find the nearest one" map. Names and addresses come from i18n `branches.items`
 * (same order as BRANCHES). Coordinates are approximate placeholders taken from the address: check each one on
 * a map and correct it. Phone and hours are placeholders too.
 */
export type Center = LatLng & { id: number; city: City; phone: string; phoneHref: string; hours: string }

const COORDS: LatLng[] = [
  { lat: 41.2924, lng: 69.2236 }, // Chilonzor, Novza
  { lat: 41.2235, lng: 69.2204 }, // Sergeli, 3-bekat
  { lat: 41.3597, lng: 69.2889 }, // Yunusobod, Turkiston
  { lat: 41.2046, lng: 69.1986 }, // Yangihayot, Yangidarxon
  { lat: 41.2969, lng: 69.3214 }, // Yashnobod, Mahtumquli 85
  { lat: 41.3037, lng: 69.3451 }, // Harbiylar shaharchasi
  { lat: 41.3435, lng: 69.3446 }, // TTZ, Lokomotiv
  { lat: 39.6608, lng: 66.9588 }, // Samarqand, Bo‘stonsaroy 29
  { lat: 37.2243, lng: 67.2784 }, // Termiz, Soat chorrahasi
  { lat: 40.1031, lng: 65.3691 }, // Navoiy, Talabalar 50/1
]

export const CENTERS: Center[] = BRANCHES.map((b, id) => ({
  id,
  city: b.city,
  ...COORDS[id],
  phone: CONTACT.phone,
  phoneHref: CONTACT.phoneHref,
  hours: "09:00–19:00",
}))

/** Where to measure from when the visitor picks a city instead of sharing their location. */
export const CITY_CENTERS: Record<City, LatLng> = {
  tashkent: { lat: 41.2995, lng: 69.2401 },
  samarkand: { lat: 39.6542, lng: 66.9597 },
  termez: { lat: 37.2242, lng: 67.2783 },
  navoi: { lat: 40.0844, lng: 65.3792 },
}
