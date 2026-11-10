import { describe, expect, it } from "vitest"

import { answer, cleanName, cleanPhone, complete, type Draft, nextStep, prevStep, question } from "./form.ts"
import { REGIONS } from "./regions.ts"

describe("cleaners", () => {
  it("tidies names and refuses non-names", () => {
    expect(cleanName("  azizbek ")).toBe("Azizbek")
    expect(cleanName("ali-vali  o'g'li")).toBe("Ali-Vali O‘g‘li")
    expect(cleanName("АЛИШЕР")).toBe("Алишер")
    expect(cleanName("a")).toBeNull()
    expect(cleanName("Ali123")).toBeNull()
    expect(cleanName("/start")).toBeNull()
  })
  it("reads phone numbers written any way", () => {
    expect(cleanPhone("+998 90 123-45-67")).toBe("+998901234567")
    expect(cleanPhone("901234567")).toBe("+998901234567")
    expect(cleanPhone("998901234567")).toBe("+998901234567")
    expect(cleanPhone("12345")).toBeNull()
  })
})

describe("steps", () => {
  it("asks for the branch only from Inspiring students", () => {
    expect(nextStep("isStudent", { isStudent: false })).toBe("phone")
    expect(nextStep("isStudent", { isStudent: true })).toBe("branch")
    expect(prevStep("phone", { isStudent: false })).toBe("isStudent")
    expect(prevStep("phone", { isStudent: true })).toBe("branch")
    expect(prevStep("firstName", {})).toBe("firstName")
  })

  it("walks the whole form", () => {
    let d: Draft = {}
    let step = "firstName" as Parameters<typeof answer>[0]
    const go = (input: Parameters<typeof answer>[1]) => {
      const r = answer(step, input, d)
      if (!("next" in r)) throw new Error(JSON.stringify(r))
      d = r.draft
      step = r.next
    }
    go({ text: "azizbek" })
    go({ text: "Karimov" })
    go({ text: "Rustamovich" })
    go({ data: "f:grade:7" })
    go({ data: "f:region:0" })
    go({ data: "f:district:1" })
    go({ data: "f:isStudent:1" })
    go({ data: "f:branch:0" })
    go({ contact: "998901234567" })
    expect(step).toBe("confirm")
    expect(d).toEqual({
      firstName: "Azizbek",
      lastName: "Karimov",
      middleName: "Rustamovich",
      grade: 7,
      region: 0,
      district: "Chilonzor tumani",
      isStudent: true,
      branch: "Chilonzor",
      phone: "+998901234567",
    })
    expect(complete(d)).toBe(true)
    expect(answer("confirm", { data: "f:ok" }, d)).toEqual({ done: d })
    expect(question("confirm", d).text).toContain("Karimov Azizbek Rustamovich")
  })

  it("goes back, ignores old buttons and explains mistakes", () => {
    expect(answer("grade", { data: "f:back" }, {})).toMatchObject({ next: "middleName" })
    expect(answer("phone", { text: "⬅️ Orqaga" }, { isStudent: false })).toMatchObject({ next: "isStudent" })
    expect(answer("district", { data: "f:grade:3" }, { region: 0 })).toEqual({ stale: true })
    expect(answer("grade", { text: "salom" }, {})).toHaveProperty("error")
    expect(answer("phone", { text: "123" }, {})).toHaveProperty("error")
  })

  it("lets a place missing from the list be typed, and forgets it when the region changes", () => {
    expect(answer("district", { text: "Yangi shahar" }, { region: 3 })).toMatchObject({
      draft: { district: "Yangi shahar" },
    })
    expect(answer("region", { data: "f:region:2" }, { region: 1, district: "Chirchiq shahri" })).toMatchObject({
      draft: { region: 2, district: undefined },
    })
  })

  it("fits Telegram's limits: callback data ≤ 64 bytes, every region has places", () => {
    for (const [i, r] of REGIONS.entries()) {
      expect(r.places.length).toBeGreaterThan(3)
      const q = question("district", { region: i })
      const kb = (q.markup as { inline_keyboard: { callback_data?: string }[][] }).inline_keyboard
      for (const b of kb.flat()) expect(Buffer.byteLength(b.callback_data ?? "")).toBeLessThanOrEqual(64)
    }
    expect(REGIONS).toHaveLength(14)
  })
})
