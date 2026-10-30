import { describe, expect, it } from "vitest"

import { leadMessage, parseLead } from "./lead.ts"

const ok = { firstName: " Dilnoza ", lastName: "Karimova", phone: "+998 90 123-45-67", lang: "uz" }

describe("parseLead", () => {
  it("accepts a complete application and tidies it", () => {
    expect(parseLead(ok)).toEqual({
      lead: { firstName: "Dilnoza", lastName: "Karimova", phone: "+998901234567", lang: "uz" },
    })
  })
  it("refuses a missing surname or a short phone", () => {
    expect(parseLead({ ...ok, lastName: "" })).toEqual({ error: "lastName" })
    expect(parseLead({ ...ok, phone: "+99890123" })).toEqual({ error: "phone" })
    expect(parseLead(null)).toEqual({ error: "body" })
  })
  it("keeps a valid location with its nearest branch, drops a broken one", () => {
    const r = parseLead({
      ...ok,
      location: { lat: 41.3, lng: 69.2, accuracy: 25 },
      nearest: { name: "Chilonzor", km: 1.6 },
    })
    expect(r).toMatchObject({
      lead: { location: { lat: 41.3, lng: 69.2, accuracy: 25 }, nearest: { name: "Chilonzor" } },
    })
    expect(parseLead({ ...ok, location: { lat: "x", lng: 69 } })).not.toHaveProperty("lead.location")
  })
})

describe("leadMessage", () => {
  it("formats the call-centre message, escaping what the visitor typed", () => {
    const { lead } = parseLead({ ...ok, firstName: "<b>Ali</b>" }) as { lead: Parameters<typeof leadMessage>[0] }
    const { text, buttons } = leadMessage(lead, new Date("2026-10-30T10:20:00Z"))
    expect(text).toContain("&lt;b&gt;Ali&lt;/b&gt;")
    expect(text).toContain("+998 90 123 45 67")
    expect(text).toContain("30.10.2026, 15:20")
    expect(text).toContain("Joylashuv:</b> berilmagan")
    expect(buttons).toEqual([])
  })
  it("adds the map link and button when there is a location", () => {
    const { lead } = parseLead({
      ...ok,
      location: { lat: 41.2924, lng: 69.2236 },
      nearest: { name: "Chilonzor", km: 0.42 },
    }) as {
      lead: Parameters<typeof leadMessage>[0]
    }
    const { text, buttons } = leadMessage(lead)
    expect(text).toContain("Chilonzor — 420 m")
    expect(text).toContain("search/?api=1&amp;query=41.292400")
    expect(buttons[0][0].url).toBe("https://www.google.com/maps/search/?api=1&query=41.292400,69.223600")
  })
})
