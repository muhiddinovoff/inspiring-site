/**
 * Monitoring test: registration for the prize test in the Tashkent branches (grades 5–8), the participant's
 * "ticket", extra points for friends who register through their link, reminders and the admins' Excel list.
 */
import { BRANCHES, mapLink } from "../../src/data/site.ts"
import uz from "../../src/i18n/uz.ts"
import { type Sheet, xlsx } from "../xlsx.ts"
import type { MonitoringRow, Store } from "./db.ts"
import { type Button, prettyPhone } from "./form.ts"
import { sourceLabel, tashkentDay, when } from "./report.ts"
import type { Monitoring } from "./settings.ts"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const DAY = 86_400_000
const WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"]
const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
]

/** The Tashkent branches, where the test takes place. */
export const TEST_BRANCHES = uz.branches.items
  .map((b, i) => ({ ...b, map: mapLink(BRANCHES[i]?.map ?? b.address), city: BRANCHES[i]?.city }))
  .filter((b) => b.city === "tashkent")

export const branchInfo = (name: string) => TEST_BRANCHES.find((b) => b.name === name)

/** Midnight (Tashkent) of the test day. */
export function testDay(m: Monitoring) {
  const [y, mo, d] = m.date.split("-").map(Number)
  return Date.UTC(y, mo - 1, d) - 5 * 3_600_000
}
export const daysLeft = (m: Monitoring, now = Date.now()) => Math.round((testDay(m) - tashkentDay(now)) / DAY)
/** Registration is possible until the test day ends. */
export const isOpen = (m: Monitoring, now = Date.now()) => m.open && daysLeft(m, now) >= 0

/** "15-noyabr, yakshanba" (+ ", soat 10:00") */
export function dateLabel(m: Monitoring, withTime = true) {
  const [, mo, d] = m.date.split("-").map(Number)
  const wd = WEEKDAYS[new Date(testDay(m) + 5 * 3_600_000).getUTCDay()]
  return `${d}-${MONTHS[mo - 1]}, ${wd}${withTime && m.time ? `, soat ${m.time}` : ""}`
}

const left = (n: number) => (n === 0 ? "bugun" : n === 1 ? "ertaga" : `${n} kun qoldi`)
const gradesLabel = (m: Monitoring) => `${m.grades.join("-")}-sinf`

export function aboutText(m: Monitoring, now = Date.now()) {
  const n = daysLeft(m, now)
  return [
    "📝 <b>Yutuqli monitoring test</b>",
    "",
    `🗓 <b>${dateLabel(m)}</b>${n >= 0 ? ` (${left(n)})` : ""}`,
    `🎓 <b>${gradesLabel(m)}</b> o‘quvchilari uchun`,
    `📍 Toshkent shahridagi <b>${TEST_BRANCHES.length} ta filialimizda</b> — o‘zingizga yaqinini tanlaysiz`,
    "🎁 G‘oliblarga sovg‘alar",
    "",
    "Farzandingiz bilimini real imtihon sharoitida sinab ko‘radi va qaysi mavzularni kuchaytirish kerakligini bilib oladi.",
    ...(m.time ? [] : ["", "⏰ Boshlanish vaqti alohida e’lon qilinadi."]),
  ].join("\n")
}

/** The registered participant's "ticket". */
export function ticketText(
  m: Monitoring,
  reg: { id: number; grade: number; branch: string },
  name: string,
  points: number,
  now = Date.now(),
) {
  const b = branchInfo(reg.branch)
  const n = daysLeft(m, now)
  return [
    "🎟 <b>Siz monitoring testiga ro‘yxatdan o‘tgansiz</b>",
    "",
    `№ <b>${String(reg.id).padStart(4, "0")}</b>`,
    `👤 ${esc(name)}`,
    `🎓 ${reg.grade}-sinf`,
    `📍 <b>${esc(reg.branch)}</b> filiali${b ? ` — ${esc(b.address)}` : ""}`,
    ...(b?.landmark ? [`   <i>Mo‘ljal: ${esc(b.landmark)}</i>`] : []),
    `🗓 ${dateLabel(m)}${n >= 0 ? ` (${left(n)})` : ""}`,
    "",
    `⭐ Qo‘shimcha ballaringiz: <b>${points}</b>`,
  ].join("\n")
}

export function ticketButtons(reg: { branch: string }): Button[][] {
  const b = branchInfo(reg.branch)
  return [
    [{ text: "⭐ Qo‘shimcha ball yig‘ish", callback_data: "m:pts" }],
    ...(b ? [[{ text: "🗺 Filial xaritada", url: b.map }]] : []),
    [
      { text: "✏️ O‘zgartirish", callback_data: "m:reg" },
      { text: "❌ Bekor qilish", callback_data: "m:cancel" },
    ],
  ]
}

export function gradeButtons(m: Monitoring, current?: number): Button[][] {
  return [
    m.grades.map((g) => ({ text: g === current ? `✅ ${g}-sinf` : `${g}-sinf`, callback_data: `m:g:${g}` })),
    [{ text: "⬅️ Orqaga", callback_data: "m:show" }],
  ]
}

export function branchButtons(): Button[][] {
  const rows: Button[][] = []
  TEST_BRANCHES.forEach((b, i) => {
    const btn = { text: `📍 ${b.name}`, callback_data: `m:b:${i}` }
    if (i % 2 === 0) rows.push([btn])
    else rows[rows.length - 1].push(btn)
  })
  rows.push([{ text: "⬅️ Orqaga", callback_data: "m:reg" }])
  return rows
}

export function branchListText(grade: number) {
  return [
    `🎓 ${grade}-sinf ✅`,
    "",
    "📍 <b>Qaysi filialda topshirasiz?</b> Uyingizga yaqinini tanlang:",
    "",
    ...TEST_BRANCHES.map((b) => `• <b>${esc(b.name)}</b> — ${esc(b.address)}`),
  ].join("\n")
}

export function pointsText(store: Store, id: number, link: string) {
  const friends = store.monitoringFriends(id)
  const points = friends.filter((f) => f.registered).length
  const shown = friends.slice(0, 20)
  return [
    "⭐ <b>Qo‘shimcha ball yig‘ing</b>",
    "",
    "Do‘stlaringiz va sinfdoshlaringizni monitoringga taklif qiling: havolangiz orqali botga kirib, monitoringga ro‘yxatdan o‘tgan har bir o‘quvchi uchun sizga <b>+1 ball</b>.",
    "",
    `Sizning ballaringiz: <b>${points}</b>`,
    ...(shown.length
      ? [
          "",
          ...shown.map((f) =>
            f.registered ? `✅ ${esc(f.name)} — +1` : `⏳ ${esc(f.name)} — hali ro‘yxatdan o‘tmagan`,
          ),
        ]
      : []),
    ...(friends.length > 20 ? [`… jami ${friends.length} ta`] : []),
    "",
    `🔗 Havolangiz:\n${link}`,
  ].join("\n")
}

export function pointsButtons(link: string, m: Monitoring): Button[][] {
  const text = `📝 ${dateLabel(m, false)} kuni Inspiring Education’da ${gradesLabel(m)} o‘quvchilari uchun yutuqli monitoring test! Ro‘yxatdan o‘ting 👇`
  return [
    [
      {
        text: "📤 Do‘stlarga yuborish",
        url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
      },
    ],
    [
      { text: "🏅 Ballar reytingi", callback_data: "m:top" },
      { text: "🔄 Yangilash", callback_data: "m:pts" },
    ],
    [{ text: "⬅️ Mening chiptam", callback_data: "m:show" }],
  ]
}

export function topText(store: Store, id: number) {
  const top = store.monitoringTop(10)
  const medal = ["🥇", "🥈", "🥉"]
  return [
    "🏅 <b>Monitoring: qo‘shimcha ballar reytingi</b>",
    "",
    ...(top.length
      ? top.map((r, i) => `${medal[i] ?? `${i + 1}.`} ${esc(r.name)} — <b>${r.n}</b>${r.id === id ? " ← siz" : ""}`)
      : ["Hali hech kim ball yig‘magan — birinchi bo‘ling!"]),
  ].join("\n")
}

/** Reminder for the registered: "kind" daily (2+ days left), eve (1 day), today (the morning of the test). */
export function reminderText(
  kind: "daily" | "eve" | "today",
  m: Monitoring,
  reg: { grade: number; branch: string },
  points: number,
  now = Date.now(),
) {
  const b = branchInfo(reg.branch)
  const place = `📍 <b>${esc(reg.branch)}</b> filiali${b ? ` — ${esc(b.address)}` : ""}${b?.landmark ? `\n   <i>Mo‘ljal: ${esc(b.landmark)}</i>` : ""}`
  if (kind === "daily") {
    return [
      `⏳ Monitoring testigacha <b>${daysLeft(m, now)} kun</b> qoldi!`,
      "",
      `🗓 ${dateLabel(m)} · 🎓 ${reg.grade}-sinf · 📍 ${esc(reg.branch)}`,
      "",
      `⭐ Qo‘shimcha ballaringiz: <b>${points}</b>. Do‘stlaringizni taklif qilib, ko‘paytiring!`,
    ].join("\n")
  }
  if (kind === "eve") {
    return [
      "🔔 <b>Ertaga — monitoring test!</b>",
      "",
      `🗓 <b>${dateLabel(m)}</b>`,
      place,
      `🎓 ${reg.grade}-sinf`,
      "",
      "✅ Kechqurun erta yoting va yaxshi dam oling.",
      "✅ Testdan 15–20 daqiqa oldin yetib keling.",
      ...(m.time ? [] : ["⏰ Boshlanish vaqti haqida qo‘shimcha xabar beramiz."]),
      "",
      "Omad tilaymiz! 🍀",
    ].join("\n")
  }
  return [
    "🌅 <b>Bugun — monitoring test!</b>",
    "",
    `🗓 ${dateLabel(m)}`,
    place,
    "",
    "Kechikmang — 15–20 daqiqa oldin keling. Omad! 🍀",
  ].join("\n")
}

export function monitoringWorkbook(rows: MonitoringRow[], store?: Pick<Store, "sourceName">) {
  const list: Sheet = {
    name: "Monitoring",
    columns: [
      { header: "№", width: 7 },
      { header: "Ro‘yxatdan o‘tgan", width: 17 },
      { header: "Familiya", width: 16 },
      { header: "Ism", width: 14 },
      { header: "Otasining ismi", width: 16 },
      { header: "Sinf", width: 6 },
      { header: "Filial", width: 16 },
      { header: "Telefon", width: 18 },
      { header: "Telegram", width: 18 },
      { header: "Telegram ID", width: 13 },
      { header: "Qo‘shimcha ball", width: 10 },
      { header: "Inspiring o‘quvchisi", width: 12 },
      { header: "Manba", width: 18 },
    ],
    rows: rows.map((r) => [
      r.id,
      when(r.created_at),
      r.last_name,
      r.first_name,
      r.middle_name,
      r.grade,
      r.branch,
      r.phone ? prettyPhone(r.phone) : "",
      r.username ? `@${r.username}` : r.tg_name,
      r.user_id,
      r.points,
      r.is_student ? "Ha" : "Yo‘q",
      sourceLabel(r.source, store),
    ]),
  }
  const grades = [...new Set(rows.map((r) => r.grade))].sort((a, b) => a - b)
  const byBranch: Sheet = {
    name: "Filiallar",
    columns: [
      { header: "Filial", width: 24 },
      ...grades.map((g) => ({ header: `${g}-sinf`, width: 9 })),
      { header: "Jami", width: 9 },
    ],
    rows: TEST_BRANCHES.map((b) => b.name)
      .concat([...new Set(rows.map((r) => r.branch))].filter((n) => !branchInfo(n)))
      .map((name) => {
        const mine = rows.filter((r) => r.branch === name)
        return [name, ...grades.map((g) => mine.filter((r) => r.grade === g).length), mine.length]
      }),
  }
  return xlsx([list, byBranch])
}

/** Short counts for the admin screen. */
export function countsText(rows: MonitoringRow[]) {
  const by = (key: (r: MonitoringRow) => string | number) => {
    const map = new Map<string | number, number>()
    for (const r of rows) map.set(key(r), (map.get(key(r)) ?? 0) + 1)
    return map
  }
  const branches = by((r) => r.branch)
  const grades = by((r) => r.grade)
  return [
    `👥 Ro‘yxatdan o‘tganlar: <b>${rows.length}</b>`,
    ...(rows.length
      ? [
          "",
          "<b>Filiallar:</b>",
          ...[...branches].sort((a, b) => b[1] - a[1]).map(([k, n]) => `• ${esc(String(k))} — ${n}`),
          "",
          `<b>Sinflar:</b> ${[...grades]
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([g, n]) => `${g}-sinf — ${n}`)
            .join(" · ")}`,
        ]
      : []),
  ].join("\n")
}
