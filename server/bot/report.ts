/** What the admins get: a card for each new lead, the Excel file and short statistics. */
import { type Sheet, xlsx } from "../xlsx.ts"
import { leadMessage } from "../lead.ts"
import { type LeadRow, type SiteLead, STATUSES, type Status, type Store } from "./db.ts"
import { type Button, prettyPhone } from "./form.ts"
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

/** "📌 Holat: ✅ Yozildi — Dilnoza, 11.11.2026 10:20" once the call centre has touched the lead. */
const statusLine = (l: { status: Status; status_by: string | null; status_at: number | null }) =>
  l.status === "new" || !l.status
    ? []
    : [
        `📌 <b>Holat:</b> ${STATUSES[l.status]}${l.status_by ? ` — ${esc(l.status_by)}` : ""}${l.status_at ? `, ${when(l.status_at)}` : ""}`,
      ]

/** Call-centre buttons under a lead: kind b = bot, s = site. */
export function statusButtons(kind: "b" | "s", id: number, current: Status): Button[][] {
  const b = (st: Exclude<Status, "new">): Button => ({
    text: current === st ? `• ${STATUSES[st]} •` : STATUSES[st],
    callback_data: `ld:${kind}:${id}:${st}`,
  })
  return [
    [b("contacted"), b("noanswer")],
    [b("enrolled"), b("refused")],
  ]
}

export type CardKind = "new" | "updated" | "consult"
const HEAD: Record<CardKind, string> = {
  new: "<b>🆕 Yangi lid — Telegram bot</b>",
  updated: "<b>✏️ Lid ma’lumotlarini yangiladi — Telegram bot</b>",
  consult: "<b>🔥 Konsultatsiya so‘radi — Telegram bot</b>",
}

export function sourceLabel(code: string | null, store?: Pick<Store, "sourceName">) {
  if (!code) return "To‘g‘ridan-to‘g‘ri"
  if (code === "referral") return "Do‘st taklifi"
  return store?.sourceName(code) ?? code
}

export function leadCard(l: LeadRow, kind: CardKind | boolean, store?: Pick<Store, "sourceName">) {
  const k: CardKind = typeof kind === "boolean" ? (kind ? "new" : "updated") : kind
  const tg = l.username ? `@${esc(l.username)}` : esc(l.tg_name || "profil")
  return [
    HEAD[k],
    "",
    `👤 <b>${esc(fullName(l))}</b>`,
    `🎓 <b>Sinf:</b> ${l.grade}`,
    `📍 <b>Manzil:</b> ${esc(l.region)}, ${esc(l.district)}`,
    `📞 <b>Telefon:</b> <code>${prettyPhone(l.phone)}</code>`,
    `💬 <b>Telegram:</b> <a href="tg://user?id=${l.user_id}">${tg}</a> · <code>${l.user_id}</code>`,
    ...(l.referrer_id
      ? [`🤝 <b>Taklif qilgan:</b> ${esc(l.referrer_name || "—")} (<code>${l.referrer_id}</code>)`]
      : []),
    ...(l.source && l.source !== "referral" ? [`📈 <b>Manba:</b> ${esc(sourceLabel(l.source, store))}`] : []),
    `🕒 ${when(l.updated_at)} (Toshkent)`,
    ...statusLine(l),
  ].join("\n")
}

/** The website application card (same text as before) with the call-centre buttons. */
export function siteCard(sl: SiteLead) {
  const { text, buttons } = leadMessage(
    {
      firstName: sl.first_name,
      lastName: sl.last_name,
      phone: sl.phone,
      lang: sl.lang === "ru" || sl.lang === "en" ? sl.lang : "uz",
      ...(sl.lat !== null && sl.lng !== null
        ? { location: { lat: sl.lat, lng: sl.lng, ...(sl.accuracy !== null ? { accuracy: sl.accuracy } : {}) } }
        : {}),
      ...(sl.nearest && sl.nearest_km !== null ? { nearest: { name: sl.nearest, km: sl.nearest_km } } : {}),
      ...(sl.page ? { page: sl.page } : {}),
    },
    new Date(sl.created_at),
  )
  return {
    text: [text, ...statusLine(sl)].join("\n"),
    buttons: [...buttons, ...statusButtons("s", sl.id, sl.status)] as Button[][],
  }
}

/** A lead is someone who does not study at Inspiring Education yet; students who sign up are kept apart. */
export const isLead = (l: Pick<LeadRow, "is_student">) => !l.is_student

/** "Lidlar" (not studying with us), "Inspiring o‘quvchilari", and lead counts by region and grade. */
export function leadsWorkbook(rows: LeadRow[], site: SiteLead[] = [], store?: Pick<Store, "sourceName">) {
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
      { header: "Online dars", width: 12 },
      { header: "Manba", width: 18 },
      { header: "Holat", width: 16 },
      { header: "Kim ishladi", width: 16 },
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
      sourceLabel(l.source, store),
      STATUSES[l.status] ?? "",
      l.status_by,
    ]),
  })
  const siteSheet: Sheet = {
    name: "Sayt arizalari",
    columns: [
      { header: "№", width: 6 },
      { header: "Sana", width: 17 },
      { header: "Familiya", width: 16 },
      { header: "Ism", width: 14 },
      { header: "Telefon", width: 18 },
      { header: "Sayt tili", width: 8 },
      { header: "Eng yaqin filial", width: 18 },
      { header: "Masofa, km", width: 10 },
      { header: "Xarita", width: 30 },
      { header: "Holat", width: 16 },
      { header: "Kim ishladi", width: 16 },
    ],
    rows: site.map((l, i) => [
      i + 1,
      when(l.created_at),
      l.last_name,
      l.first_name,
      prettyPhone(l.phone),
      l.lang,
      l.nearest,
      l.nearest_km === null ? null : Math.round(l.nearest_km * 10) / 10,
      l.lat !== null && l.lng !== null ? `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}` : null,
      STATUSES[l.status] ?? "",
      l.status_by,
    ]),
  }

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
    siteSheet,
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
  const st = store.statusCounts()
  const site = store.siteLeads().length
  const all = c.leads + site
  const pct = (n: number) => (all ? ` (${Math.round((n / all) * 100)}%)` : "")
  return [
    "<b>📊 Statistika</b>",
    "",
    `👥 Botga kirganlar: <b>${c.users}</b> (bugun +${c.users_today})`,
    `📝 Lidlar: <b>${all}</b> — bot: ${c.leads}, sayt: ${site}; bugun bot: +${c.leads_today}`,
    `🏫 Anketa to‘ldirgan Inspiring o‘quvchilari: <b>${c.students}</b>`,
    "",
    "<b>📞 Call-markaz:</b>",
    ...(["new", "contacted", "noanswer", "enrolled", "refused"] as Status[]).map(
      (k) => `${STATUSES[k]}: <b>${st[k] ?? 0}</b>${pct(st[k] ?? 0)}`,
    ),
    "",
    `🤝 Referallar: <b>${c.referrals}</b> · 🎓 online darsni ochganlar: <b>${c.unlocked}</b>, kanalda: <b>${c.joined}</b>`,
    "",
    `🕒 ${when(now)} (Toshkent)`,
  ].join("\n")
}
