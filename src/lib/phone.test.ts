import { describe, expect, it } from "vitest"

import { formatLocal, isCompletePhone, localDigits } from "./phone"

describe("localDigits", () => {
  it("keeps the 9 local digits", () => {
    expect(localDigits("90 123 45 67")).toBe("901234567")
  })

  it("drops a pasted +998 country code", () => {
    expect(localDigits("+998 (90) 123-45-67")).toBe("901234567")
  })

  it("caps input at 9 digits", () => {
    expect(localDigits("9012345678999")).toBe("901234567")
  })
})

describe("formatLocal", () => {
  it("groups digits as 90 123 45 67", () => {
    expect(formatLocal("901234567")).toBe("90 123 45 67")
  })

  it("formats partial input without trailing spaces", () => {
    expect(formatLocal("9012")).toBe("90 12")
  })
})

describe("isCompletePhone", () => {
  it("accepts exactly 9 digits", () => {
    expect(isCompletePhone("901234567")).toBe(true)
    expect(isCompletePhone("90123456")).toBe(false)
  })
})
