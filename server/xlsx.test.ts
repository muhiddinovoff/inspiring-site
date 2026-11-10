import { inflateRawSync } from "node:zlib"

import { describe, expect, it } from "vitest"

import { colName, xlsx } from "./xlsx.ts"

/** Reads the files back out of a ZIP made by zip(). */
function unzip(buf: Buffer) {
  const files: Record<string, string> = {}
  let at = 0
  while (buf.readUInt32LE(at) === 0x04034b50) {
    const size = buf.readUInt32LE(at + 18)
    const nameLen = buf.readUInt16LE(at + 26)
    const name = buf.subarray(at + 30, at + 30 + nameLen).toString()
    const data = buf.subarray(at + 30 + nameLen, at + 30 + nameLen + size)
    files[name] = inflateRawSync(data).toString()
    at += 30 + nameLen + size
  }
  return files
}

describe("xlsx", () => {
  it("names columns like Excel", () => {
    expect([0, 25, 26, 27, 701, 702].map(colName)).toEqual(["A", "Z", "AA", "AB", "ZZ", "AAA"])
  })

  it("writes a workbook with escaped text, numbers and every sheet", () => {
    const file = xlsx([
      { name: "Lidlar", columns: [{ header: "Ism" }, { header: "Sinf" }], rows: [["<Ali> & \u0007Vali", 7]] },
      { name: "Bo‘sh", columns: [{ header: "X" }], rows: [] },
    ])
    expect(file.subarray(0, 2).toString()).toBe("PK")
    const files = unzip(file)
    expect(Object.keys(files)).toContain("xl/worksheets/sheet2.xml")
    const s1 = files["xl/worksheets/sheet1.xml"]
    expect(s1).toContain("&lt;Ali&gt; &amp; Vali")
    expect(s1).toContain('<c r="B2" s="2"><v>7</v></c>')
    expect(s1).toContain('<autoFilter ref="A1:B2"/>')
    expect(files["xl/workbook.xml"]).toContain('name="Bo‘sh"')
  })
})
