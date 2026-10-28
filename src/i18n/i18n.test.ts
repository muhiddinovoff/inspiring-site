import { describe, expect, it } from "vitest"

import { BRANCHES, OVERALL_RESULTS, RESULTS, STATS } from "@/data/site"

import en from "./en"
import ru from "./ru"
import uz from "./uz"

// TypeScript guarantees every language has the same keys; these check the lists line up with the data they label.
describe.each([
  ["uz", uz],
  ["ru", ru],
  ["en", en],
])("%s dictionary", (_, t) => {
  it("labels every result", () => expect(t.results.items).toHaveLength(RESULTS.length))
  it("labels every overall result", () => expect(t.results.overall.items).toHaveLength(OVERALL_RESULTS.length))
  it("labels every stat", () => expect(t.stats.items).toHaveLength(STATS.length))
  it("describes every branch", () => expect(t.branches.items).toHaveLength(BRANCHES.length))
  it("has one FAQ answer per question in every language", () => expect(t.faq.items).toHaveLength(uz.faq.items.length))
  it("has the same grade options", () => expect(t.lead.grades).toHaveLength(uz.lead.grades.length))
})
