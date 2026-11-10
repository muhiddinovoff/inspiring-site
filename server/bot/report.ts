/** What the admins get: a card for each new lead, the Excel file and short statistics. */
import { type Sheet, xlsx } from "../xlsx.ts"
import type { LeadRow, Store } from "./db.ts"
import { prettyPhone } from "./form.ts"
import { REGIONS } from "./regions.ts"

const TZ = "Asia/Tashkent"
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** "10.11.2026 15:20" in Tashkent time. */
export function when(ms: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(ms)
      .map((x) => [x.type, x.value]),
  )
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`
}

/** Midnight in Tashkent (UTC+5, no daylight saving) for the day that `ms` falls on. */
export function tashkentDay(ms: number) {
  const offset = 5 * 3_600_000
  return Math.floor((ms + offset) / 86_400_000) * 86_400_000 - offset
}
export const tashkentHour = (ms: number) => new Date(ms + 5 * 3_600_000).getUTCHours()

const fullName = (l: Pick<LeadRow, "last_name" | "first_name" | "middle_name">) =>
  `${l.last_name} ${l.first_name} ${l.middle_name}`.trim()

export function leadCard(l: LeadRow, isNew: boolean) {
  const tg = l.username ? `@${esc(l.username)}` : esc(l.tg_name || "profil")
  return [
    isNew ? "<b>🆕 Yangi lid — Telegram bot</b>" : "<b>✏️ Lid ma’lumotlarini yangiladi — Telegram bot</b>",
    "",
    `👤 <b>${esc(fullName(l))}</b>`,
    `🎓 <b>Sinf:</b> ${l.grade}`,
    `📍 <b>Manzil:</b> ${esc(l.region)}, ${esc(l.district)}`,
    `📞 <b>Telefon:</b> <code>${prettyPhone(l.phone)}</code>`,
    `💬 <b>Telegram:</b> <a href="tg://user?id=${l.user_id}">${tg}</a> · <code>${l.user_id}</code>`,
    ...(l.referrer_id
      ? [`🤝 <b>Taklif qilgan:</b> ${esc(l.referrer_name || "—")} (<code>${l.referrer_id}</code>)`]
      : []),
    `🕒 ${when(l.updated_at)} (Toshkent)`,
  ].join("\n")
}

/** A lead is someone who does not study at Inspiring Education yet; students who sign up are kept apart. */
export const isLead = (l: Pick<LeadRow, "is_student">) => !l.is_student

/** "Lidlar" (not studying with us), "Inspiring o‘quvchilari", and lead counts by region and grade. */
export function leadsWorkbook(rows: LeadRow[]) {
  const leads = rows.filter(isLead)
  const students = rows.filter((l) => !isLead(l))
  const people = (name: string, list: LeadRow[], branch: boolean): Sheet => ({
    name,
    columns: [
      { header: "№", width: 6 },
      { header: "Ro‘yxatdan o‘tgan", width: 17 },
      { header: "Familiya", width: 16 },
      { header: "Ism", width: 14 },
      { header: "Otasining ismi", width: 16 },
      { header: "Sinf", width: 6 },
      { header: "Viloyat", width: 22 },
      { header: "Shahar / tuman", width: 22 },
      ...(branch ? [{ header: "Filial", width: 16 }] : []),
      { header: "Telefon", width: 18 },
      { header: "Telegram", width: 18 },
      { header: "Telegram ID", width: 13 },
      { header: "Kim taklif qilgan", width: 24 },
      { header: "Taklif qilganlari", width: 10 },
      { header: "Yopiq kanal", width: 12 },
    ],
    rows: list.map((l, i) => [
      i + 1,
      when(l.created_at),
      l.last_name,
      l.first_name,
      l.middle_name,
      l.grade,
      l.region,
      l.district,
      ...(branch ? [l.branch] : []),
      prettyPhone(l.phone),
      l.username ? `@${l.username}` : l.tg_name,
      l.user_id,
      l.referrer_id ? `${l.referrer_name || ""} (${l.referrer_id})`.trim() : "",
      l.referrals,
      l.joined_at ? "Qo‘shilgan" : l.unlocked_at ? "Ochilgan" : "",
    ]),
  })

  const group = (key: (l: LeadRow) => string | number, order: (string | number)[]) => {
    const map = new Map<string | number, { leads: number; students: number }>()
    for (const l of rows) {
      const g = map.get(key(l)) ?? { leads: 0, students: 0 }
      if (isLead(l)) g.leads++
      else g.students++
      map.set(key(l), g)
    }
    const extra = [...map.keys()].filter((k) => !order.includes(k))
    return [...order, ...extra]
      .filter((k) => map.has(k))
      .map((k) => {
        const g = map.get(k)!
        return [k, g.leads, g.students]
      })
  }
  const cols = (first: string) => [
    { header: first, width: 30 },
    { header: "Lidlar", width: 10 },
    { header: "Inspiring o‘quvchilari", width: 14 },
  ]
  return xlsx([
    people("Lidlar", leads, false),
    people("Inspiring o‘quvchilari", students, true),
    {
      name: "Viloyatlar",
      columns: cols("Viloyat"),
      rows: group(
        (l) => l.region,
        REGIONS.map((r) => r.name),
      ),
    },
    {
      name: "Sinflar",
      columns: cols("Sinf"),
      rows: group(
        (l) => l.grade,
        Array.from({ length: 11 }, (_, i) => i + 1),
      ),
    },
  ])
}

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export function fileName(prefix: string, ms: number) {
  const [d, t] = when(ms).split(" ")
  return `${prefix}_${d.split(".").reverse().join("-")}_${t.replace(":", "-")}.xlsx`
}

export function statsText(store: Store, now = Date.now()) {
  const c = store.counts(tashkentDay(now))
  return [
    "<b>📊 Bot statistikasi</b>",
    "",
    `👥 Botga kirganlar: <b>${c.users}</b>`,
    `📝 Lidlar (Inspiring’da o‘qimaydi): <b>${c.leads}</b>, bugun: <b>${c.leads_today}</b>`,
    `🏫 Anketa to‘ldirgan Inspiring o‘quvchilari: <b>${c.students}</b>`,
    `🤝 Hisoblangan referallar: <b>${c.referrals}</b>`,
    `🔓 Yopiq kursni ochganlar: <b>${c.unlocked}</b>, kanalga qo‘shilganlar: <b>${c.joined}</b>`,
    "",
    `🕒 ${when(now)} (Toshkent)`,
  ].join("\n")
}
