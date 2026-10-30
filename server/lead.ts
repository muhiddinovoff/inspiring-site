/**
 * An application ("ariza") as the site's form posts it, checked here before anything is sent on.
 * The site never sees the bot token: it posts to this server, and the server talks to Telegram.
 */
export type Lead = {
  firstName: string
  lastName: string
  /** +998 and 9 digits. */
  phone: string
  lang: "uz" | "ru" | "en"
  /** Only when the visitor allowed it. */
  location?: { lat: number; lng: number; accuracy?: number }
  /** Nearest branch to that location, worked out on the site. */
  nearest?: { name: string; km: number }
  page?: string
}

const LANGS = { uz: "O‘zbekcha", ru: "Русский", en: "English" } as const

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "")
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined)

/** A clean Lead from untrusted JSON, or the reason it was refused. */
export function parseLead(body: unknown): { lead: Lead } | { error: string } {
  if (!body || typeof body !== "object") return { error: "body" }
  const b = body as Record<string, unknown>
  const firstName = text(b.firstName, 60)
  const lastName = text(b.lastName, 60)
  const phone = typeof b.phone === "string" ? b.phone.replace(/[^\d+]/g, "") : ""
  if (firstName.length < 2) return { error: "firstName" }
  if (lastName.length < 2) return { error: "lastName" }
  if (!/^\+998\d{9}$/.test(phone)) return { error: "phone" }
  const lang = b.lang === "ru" || b.lang === "en" ? b.lang : "uz"
  const lead: Lead = { firstName, lastName, phone, lang }

  const loc = b.location as Record<string, unknown> | undefined
  const lat = num(loc?.lat)
  const lng = num(loc?.lng)
  if (lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    const accuracy = num(loc?.accuracy)
    lead.location = { lat, lng, ...(accuracy !== undefined && accuracy >= 0 ? { accuracy } : {}) }
    const near = b.nearest as Record<string, unknown> | undefined
    const name = text(near?.name, 80)
    const km = num(near?.km)
    if (name && km !== undefined && km >= 0) lead.nearest = { name, km }
  }
  const page = text(b.page, 200)
  if (/^https?:\/\//.test(page)) lead.page = page
  return { lead }
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** "+998 90 123 45 67" */
export const prettyPhone = (p: string) => `+998 ${p.slice(4, 6)} ${p.slice(6, 9)} ${p.slice(9, 11)} ${p.slice(11, 13)}`

export const mapsUrl = (loc: { lat: number; lng: number }) =>
  `https://www.google.com/maps/search/?api=1&query=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`

/** The Telegram message (HTML parse mode) and its buttons, in Uzbek for the call centre. */
export function leadMessage(lead: Lead, now = new Date()) {
  const when = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now)
  const lines = [
    "<b>🆕 Yangi ariza — Inspiring Education</b>",
    "",
    `👤 <b>Ism:</b> ${escape(lead.firstName)}`,
    `👤 <b>Familiya:</b> ${escape(lead.lastName)}`,
    `📞 <b>Telefon:</b> <code>${prettyPhone(lead.phone)}</code>`,
  ]
  if (lead.location) {
    const acc = lead.location.accuracy ? ` (±${Math.round(lead.location.accuracy)} m)` : ""
    lines.push(`📍 <b>Joylashuv:</b> <a href="${escape(mapsUrl(lead.location))}">xaritada ko‘rish</a>${acc}`)
  } else {
    lines.push("📍 <b>Joylashuv:</b> berilmagan")
  }
  if (lead.nearest) {
    const km = lead.nearest.km < 1 ? `${Math.round(lead.nearest.km * 1000)} m` : `${lead.nearest.km.toFixed(1)} km`
    lines.push(`🏫 <b>Eng yaqin filial:</b> ${escape(lead.nearest.name)} — ${km.replace(".", ",")}`)
  }
  lines.push(`🌐 <b>Sayt tili:</b> ${LANGS[lead.lang]}`, `🕒 <b>Vaqt:</b> ${when} (Toshkent)`)

  const buttons = lead.location ? [[{ text: "📍 Xaritada ochish", url: mapsUrl(lead.location) }]] : []
  return { text: lines.join("\n"), buttons }
}
