export type LatLng = { lat: number; lng: number }

const R = 6371 // Earth's mean radius, km
const rad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance in km (Haversine). */
export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The items with their distance from `origin`, nearest first. */
export function byDistance<T extends LatLng>(items: readonly T[], origin: LatLng) {
  return items.map((item) => ({ ...item, km: distanceKm(origin, item) })).sort((a, b) => a.km - b.km)
}

/** "850 m" under a kilometre, "2,4 km" under 10, "37 km" beyond. */
export function formatKm(km: number, sep: string) {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`
  return `${(km < 10 ? km.toFixed(1) : Math.round(km).toString()).replace(".", sep)} km`
}

const ll = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`

/** Google Maps directions. Without an origin, Google starts from the visitor's own location. */
export function googleDirections(destination: LatLng, origin?: LatLng) {
  return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${ll(origin)}` : ""}&destination=${ll(destination)}`
}

export function appleDirections(destination: LatLng, origin?: LatLng) {
  return `https://maps.apple.com/?${origin ? `saddr=${ll(origin)}&` : ""}daddr=${ll(destination)}&dirflg=d`
}

export const isAppleMobile = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
