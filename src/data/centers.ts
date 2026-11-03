import { BRANCHES, CONTACT, type City } from "@/data/site"
import type { LatLng } from "@/lib/geo"

/**
 * Learning centres for the "find the nearest one" map. Names and addresses come from i18n `branches.items`
 * (same order as BRANCHES). Coordinates are taken from each branch's Google Maps pin. Phone and hours are
 * placeholders.
 */
export type Center = LatLng & { id: number; city: City; phone: string; phoneHref: string; hours: string }

const COORDS: LatLng[] = [
  { lat: 41.295964, lng: 69.216439 }, // Chilonzor, Novza
  { lat: 41.221157, lng: 69.20606 }, // Sergeli, 3-bekat
  { lat: 41.377766, lng: 69.296575 }, // Yunusobod, Turkiston
  { lat: 41.218043, lng: 69.191003 }, // Yangihayot, Yangidarxon
  { lat: 41.304767, lng: 69.322865 }, // Yashnobod, Mahtumquli 85
  { lat: 41.279999, lng: 69.369058 }, // Harbiylar shaharchasi (Olmos)
  { lat: 41.360618, lng: 69.390229 }, // TTZ, Lokomotiv
  { lat: 39.668694, lng: 66.963011 }, // Samarqand, Bo‘stonsaroy 29
  { lat: 37.236085, lng: 67.27848 }, // Termiz, Soat chorrahasi
  { lat: 40.085013, lng: 65.38574 }, // Navoiy, Talabalar 50/1
  { lat: 41.340334, lng: 69.204443 }, // Beruniy, Shayxontohur
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
