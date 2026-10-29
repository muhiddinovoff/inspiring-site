import { useEffect, useState } from "react"

import { CITY_CENTERS } from "@/data/centers"
import type { City } from "@/data/site"
import type { LatLng } from "@/lib/geo"

export type GeoStatus = "prompt" | "locating" | "denied" | "unavailable" | "picking" | "gps" | "city"

/**
 * The visitor's starting point for "nearest branch": their location (asked only on a button press, or straight
 * away if they allowed it on an earlier visit) or, as a fallback, the centre of a city they pick.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>("prompt")
  const [origin, setOrigin] = useState<LatLng | null>(null)
  const [city, setCity] = useState<City | null>(null)

  const locate = () => {
    if (!("geolocation" in navigator)) return setStatus("unavailable")
    setStatus("locating")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setCity(null)
        setStatus("gps")
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60_000 },
    )
  }

  const pickCity = (c: City) => {
    setCity(c)
    setOrigin(CITY_CENTERS[c])
    setStatus("city")
  }

  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => !cancelled && p.state === "granted" && locate())
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return { status, origin, city, locate, pickCity, choose: () => setStatus("picking") }
}
