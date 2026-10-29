import { describe, expect, it } from "vitest"

import { byDistance, distanceKm, formatKm, googleDirections } from "./geo"

const tashkent = { lat: 41.2995, lng: 69.2401 }
const samarkand = { lat: 39.6542, lng: 66.9597 }

describe("geo", () => {
  it("measures Tashkent to Samarkand at about 270 km", () => {
    expect(distanceKm(tashkent, samarkand)).toBeGreaterThan(260)
    expect(distanceKm(tashkent, samarkand)).toBeLessThan(280)
  })
  it("is zero for the same point", () => expect(distanceKm(tashkent, tashkent)).toBe(0))
  it("sorts nearest first", () => {
    const sorted = byDistance([samarkand, tashkent], { lat: 41.3, lng: 69.2 })
    expect(sorted[0]).toMatchObject(tashkent)
    expect(sorted[0].km).toBeLessThan(sorted[1].km)
  })
  it("formats distances", () => {
    expect(formatKm(0.42, ",")).toBe("420 m")
    expect(formatKm(2.44, ",")).toBe("2,4 km")
    expect(formatKm(37.4, ".")).toBe("37 km")
  })
  it("builds a Google Maps directions link", () =>
    expect(googleDirections(samarkand, tashkent)).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=41.299500,69.240100&destination=39.654200,66.959700",
    ))
})

describe("centres", () => {
  it("has coordinates for every branch", async () => {
    const { CENTERS } = await import("@/data/centers")
    for (const c of CENTERS) {
      expect(c.lat).toBeGreaterThan(37)
      expect(c.lat).toBeLessThan(46)
      expect(c.lng).toBeGreaterThan(55)
      expect(c.lng).toBeLessThan(74)
    }
  })
})
