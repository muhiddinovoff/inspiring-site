/**
 * The bot's information screens, built from the same data as the website (src/data, src/i18n/uz.ts), so numbers,
 * branches and courses stay the same in both places.
 */
import {
  BRANCHES,
  CONTACT,
  mapLink,
  OVERALL_RESULTS,
  PRESIDENT_COUNT,
  RESULTS,
  RESULTS_TOTAL,
} from "../../src/data/site.ts"
import uz from "../../src/i18n/uz.ts"
import type { Button } from "./form.ts"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export function resultsText() {
  const r = uz.results
  return [
    `🏆 <b>${esc(r.title)}</b>`,
    "",
    `<b>${esc(r.year.title)}:</b> <b>${RESULTS_TOTAL}</b> ${esc(r.total(PRESIDENT_COUNT))}`,
    ...r.items.map((it, i) => `• ${esc(it.label)} — <b>${RESULTS[i]}</b>`),
    "",
    `<b>${esc(r.overall.title)}</b> (${esc(r.overall.note.toLowerCase())}):`,
    ...r.overall.items.map((it, i) => `• ${esc(it)} — <b>${OVERALL_RESULTS[i]}+</b>`),
  ].join("\n")
}

export function coursesText() {
  const p = uz.programs
  return [
    `📚 <b>${esc(p.title)}</b>`,
    "",
    ...p.items.flatMap((it) => [
      `<b>${esc(it.grade)} · ${esc(it.title)}</b>`,
      esc(it.text),
      ...it.points.map((pt) => `  ✓ ${esc(pt)}`),
      "",
    ]),
    `ℹ️ ${esc(p.text)}`,
  ].join("\n")
}

export function branchesText() {
  const b = uz.branches
  const cities = b.cities as Record<string, string>
  const byCity = new Map<string, string[]>()
  b.items.forEach((it, i) => {
    const city = cities[BRANCHES[i]?.city ?? "tashkent"] ?? ""
    const line = `• <a href="${esc(mapLink(BRANCHES[i]?.map ?? it.address))}">${esc(it.name)}</a> — ${esc(it.address)}${it.landmark ? `\n   <i>${esc(b.landmark)}: ${esc(it.landmark)}</i>` : ""}`
    byCity.set(city, [...(byCity.get(city) ?? []), line])
  })
  return [
    `📍 <b>${esc(b.title)}</b>`,
    "",
    ...[...byCity].flatMap(([city, lines]) => [`<b>${esc(city)}</b>`, ...lines, ""]),
    "Filial nomini bossangiz, xarita ochiladi.",
  ].join("\n")
}

export function socialText(site: string) {
  return [
    "🌐 <b>Inspiring Education — biz bilan bog‘laning</b>",
    "",
    `☎️ ${CONTACT.phone}`,
    `🌐 ${site}`,
    `📢 Telegram: ${CONTACT.handle}`,
    `📸 Instagram: ${CONTACT.instagram.replace("https://", "")}`,
    "",
    "Natijalar, foydali darslar va e’lonlar — kanalimizda. Obuna bo‘ling va do‘stlaringizga ulashing! 👇",
  ].join("\n")
}

export function socialButtons(site: string): Button[][] {
  return [
    [
      { text: "📢 Telegram kanal", url: CONTACT.telegram },
      { text: "📸 Instagram", url: CONTACT.instagram },
    ],
    [{ text: "🌐 Sayt", url: site }],
  ]
}
