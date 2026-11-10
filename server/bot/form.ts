/**
 * The registration form as a small state machine, separate from Telegram so it can be tested on its own:
 * ism → familiya → otasining ismi → sinf → viloyat → tuman/shahar → Inspiring’da o‘qiydimi (→ filial) → telefon → tasdiq.
 * Every question can go one step back; choices are buttons, and a place missing from the list can be typed.
 */
import uz from "../../src/i18n/uz.ts"
import { REGIONS } from "./regions.ts"

export const BRANCHES = uz.branches.items.map((b) => b.name)

export type Draft = {
  firstName?: string
  lastName?: string
  middleName?: string
  grade?: number
  region?: number
  district?: string
  isStudent?: boolean
  branch?: string
  phone?: string
}

export const STEPS = [
  "firstName",
  "lastName",
  "middleName",
  "grade",
  "region",
  "district",
  "isStudent",
  "branch",
  "phone",
  "confirm",
] as const
export type Step = (typeof STEPS)[number]

export type Button = { text: string; callback_data?: string; url?: string }
export type Markup =
  | { inline_keyboard: Button[][] }
  | {
      keyboard: { text: string; request_contact?: boolean }[][]
      resize_keyboard: true
      is_persistent?: boolean
      one_time_keyboard?: boolean
    }
  | { remove_keyboard: true }

export type Input = { text: string } | { data: string } | { contact: string }

export const BACK = "⬅️ Orqaga"
const back: Button = { text: BACK, callback_data: "f:back" }
const rows = <T>(items: T[], n: number) =>
  Array.from({ length: Math.ceil(items.length / n) }, (_, i) => items.slice(i * n, i * n + n))

const skip = (step: Step, d: Draft) => step === "branch" && !d.isStudent

export function nextStep(step: Step, d: Draft): Step {
  let i = STEPS.indexOf(step) + 1
  while (skip(STEPS[i], d)) i++
  return STEPS[Math.min(i, STEPS.length - 1)]
}

export function prevStep(step: Step, d: Draft): Step {
  let i = STEPS.indexOf(step) - 1
  while (i > 0 && skip(STEPS[i], d)) i--
  return STEPS[Math.max(i, 0)]
}

export const isStep = (s: unknown): s is Step => STEPS.includes(s as Step)

/** "ali-vali  o‘g‘li" → "Ali-Vali O‘g‘li" */
export function cleanName(raw: string) {
  const s = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[`'ʻʼ’]/g, "‘")
  if (!/^[\p{L}‘ -]{2,40}$/u.test(s) || !/\p{L}.*\p{L}/u.test(s)) return null
  return s.toLowerCase().replace(/(^|[ -])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

/** Any Uzbek mobile number, however it is written → "+998901234567" */
export function cleanPhone(raw: string) {
  let d = raw.replace(/\D/g, "")
  if (d.length === 9) d = `998${d}`
  return /^998\d{9}$/.test(d) ? `+${d}` : null
}

export const prettyPhone = (p: string) =>
  /^\+998\d{9}$/.test(p) ? `+998 ${p.slice(4, 6)} ${p.slice(6, 9)} ${p.slice(9, 11)} ${p.slice(11, 13)}` : p

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export function summary(d: Draft) {
  const region = d.region !== undefined ? REGIONS[d.region]?.name : ""
  return [
    `👤 <b>F.I.Sh.:</b> ${esc(`${d.lastName ?? ""} ${d.firstName ?? ""} ${d.middleName ?? ""}`.trim())}`,
    `🎓 <b>Sinf:</b> ${d.grade ?? "—"}`,
    `📍 <b>Manzil:</b> ${esc([region, d.district].filter(Boolean).join(", "))}`,
    `🏫 <b>Inspiring Education o‘quvchisi:</b> ${d.isStudent ? `ha${d.branch ? ` (${esc(d.branch)} filiali)` : ""}` : "yo‘q"}`,
    `📞 <b>Telefon:</b> ${d.phone ? prettyPhone(d.phone) : "—"}`,
  ].join("\n")
}

const total = (d: Draft) => (d.isStudent ? 9 : 8)
const num = (step: Step, d: Draft) => {
  const order = STEPS.filter((s) => s !== "confirm" && !skip(s, d))
  return `<i>${order.indexOf(step) + 1}/${total(d)}</i>`
}

/** The message that asks for `step`. */
export function question(step: Step, d: Draft): { text: string; markup: Markup } {
  const inline = (kb: Button[][]) => ({ inline_keyboard: kb })
  switch (step) {
    case "firstName":
      return {
        text: `${num(step, d)}\n✍️ O‘quvchining <b>ismini</b> yozing:\n\n<i>Masalan: Azizbek</i>`,
        markup: { remove_keyboard: true },
      }
    case "lastName":
      return {
        text: `${num(step, d)}\n✍️ O‘quvchining <b>familiyasini</b> yozing:\n\n<i>Masalan: Karimov</i>`,
        markup: inline([[back]]),
      }
    case "middleName":
      return {
        text: `${num(step, d)}\n✍️ O‘quvchining <b>otasining ismini</b> yozing:\n\n<i>Masalan: Rustamovich yoki Rustam</i>`,
        markup: inline([[back]]),
      }
    case "grade":
      return {
        text: `${num(step, d)}\n🎓 O‘quvchi nechanchi <b>sinfda</b> o‘qiydi?`,
        markup: inline([
          ...rows(
            Array.from({ length: 11 }, (_, i) => ({ text: `${i + 1}-sinf`, callback_data: `f:grade:${i + 1}` })),
            4,
          ),
          [back],
        ]),
      }
    case "region":
      return {
        text: `${num(step, d)}\n📍 Qaysi <b>viloyatda</b> yashaysiz?`,
        markup: inline([
          ...rows(
            REGIONS.map((r, i) => ({ text: r.name.replace(" Respublikasi", ""), callback_data: `f:region:${i}` })),
            2,
          ),
          [back],
        ]),
      }
    case "district": {
      const r = REGIONS[d.region ?? 0]
      return {
        text: `${num(step, d)}\n📍 <b>${esc(r.name)}</b>: qaysi <b>shahar yoki tumanda</b> yashaysiz?\n\n<i>Ro‘yxatda bo‘lmasa, nomini yozib yuboring.</i>`,
        markup: inline([
          ...rows(
            r.places.map((p, i) => ({ text: p, callback_data: `f:district:${i}` })),
            2,
          ),
          [back],
        ]),
      }
    }
    case "isStudent":
      return {
        text: `${num(step, d)}\n🏫 O‘quvchi hozir <b>Inspiring Education</b>’da o‘qiydimi?`,
        markup: inline([
          [
            { text: "✅ Ha, o‘qiydi", callback_data: "f:isStudent:1" },
            { text: "❌ Yo‘q", callback_data: "f:isStudent:0" },
          ],
          [back],
        ]),
      }
    case "branch":
      return {
        text: `${num(step, d)}\n🏫 Qaysi <b>filialda</b> o‘qiydi?`,
        markup: inline([
          ...rows(
            BRANCHES.map((b, i) => ({ text: b, callback_data: `f:branch:${i}` })),
            2,
          ),
          [back],
        ]),
      }
    case "phone":
      return {
        text: `${num(step, d)}\n📞 Bog‘lanish uchun <b>telefon raqamingizni</b> yuboring.\n\nPastdagi <b>«📱 Raqamni yuborish»</b> tugmasini bosing yoki raqamni yozing: <i>+998 90 123 45 67</i>`,
        markup: {
          keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }], [{ text: BACK }]],
          resize_keyboard: true,
          is_persistent: true,
        },
      }
    case "confirm":
      return {
        text: `<b>Ma’lumotlaringizni tekshiring:</b>\n\n${summary(d)}\n\nHammasi to‘g‘rimi?`,
        markup: inline([
          [{ text: "✅ Tasdiqlash", callback_data: "f:ok" }],
          [{ text: "✏️ Qaytadan to‘ldirish", callback_data: "f:redo" }],
          [back],
        ]),
      }
  }
}

export type Result =
  | { draft: Draft; next: Step }
  | { error: string }
  /** Callback from an old message: nothing to do. */
  | { stale: true }
  | { done: Draft }

/** Applies one answer to the current step. */
export function answer(step: Step, input: Input, d: Draft): Result {
  if (("data" in input && input.data === "f:back") || ("text" in input && input.text === BACK)) {
    return { draft: d, next: prevStep(step, d) }
  }
  const pick = "data" in input ? input.data.match(/^f:(\w+):(\d+)$/) : null
  if (pick && pick[1] !== step) return { stale: true }
  const choice = pick ? Number(pick[2]) : undefined
  const go = (draft: Draft) => ({ draft, next: nextStep(step, draft) })
  const text = "text" in input ? input.text : undefined

  switch (step) {
    case "firstName":
    case "lastName":
    case "middleName": {
      if (text === undefined) return "data" in input ? { stale: true } : { error: "Iltimos, matn ko‘rinishida yozing." }
      const name = cleanName(text)
      if (!name) return { error: "Faqat harflardan iborat bo‘lsin (2–40 ta belgi). Qaytadan yozing:" }
      return go({ ...d, [step]: name })
    }
    case "grade":
      if (choice !== undefined && choice >= 1 && choice <= 11) return go({ ...d, grade: choice })
      if (text && /^\s*(1[01]|[1-9])\s*(-?\s*sinf)?\s*$/i.test(text)) return go({ ...d, grade: parseInt(text, 10) })
      return pick ? { stale: true } : { error: "Sinfni pastdagi tugmalardan tanlang 👇" }
    case "region":
      if (choice !== undefined && REGIONS[choice]) {
        // Choosing another region forgets the old district.
        return go({ ...d, region: choice, district: d.region === choice ? d.district : undefined })
      }
      return pick ? { stale: true } : { error: "Viloyatni pastdagi tugmalardan tanlang 👇" }
    case "district": {
      const places = REGIONS[d.region ?? 0].places
      if (choice !== undefined && places[choice]) return go({ ...d, district: places[choice] })
      if (pick) return { stale: true }
      const typed = text?.trim().replace(/\s+/g, " ")
      if (typed && /^[\p{L}\d‘'’ .-]{3,40}$/u.test(typed)) return go({ ...d, district: typed })
      return { error: "Shahar yoki tumanni tugmalardan tanlang yoki nomini yozing (3–40 ta belgi)." }
    }
    case "isStudent":
      if (choice === 0 || choice === 1) {
        const isStudent = choice === 1
        return go({ ...d, isStudent, branch: isStudent ? d.branch : undefined })
      }
      return pick ? { stale: true } : { error: "Pastdagi «Ha» yoki «Yo‘q» tugmasini bosing 👇" }
    case "branch":
      if (choice !== undefined && BRANCHES[choice]) return go({ ...d, branch: BRANCHES[choice] })
      return pick ? { stale: true } : { error: "Filialni pastdagi tugmalardan tanlang 👇" }
    case "phone": {
      const raw = "contact" in input ? input.contact : text
      const phone = raw ? cleanPhone(raw) : null
      if (phone) return go({ ...d, phone })
      if ("data" in input) return { stale: true }
      return { error: "Raqam noto‘g‘ri. «📱 Raqamni yuborish» tugmasini bosing yoki shunday yozing: +998 90 123 45 67" }
    }
    case "confirm":
      if ("data" in input && input.data === "f:ok") return { done: d }
      if ("data" in input && input.data === "f:redo") return { draft: {}, next: "firstName" }
      return "data" in input ? { stale: true } : { error: "Pastdagi «✅ Tasdiqlash» tugmasini bosing 👇" }
  }
}

/** Whether a finished draft has every field (a guard before saving it). */
export function complete(d: Draft): d is Required<Omit<Draft, "branch">> & Draft {
  return Boolean(
    d.firstName &&
    d.lastName &&
    d.middleName &&
    d.grade &&
    d.region !== undefined &&
    d.district &&
    d.isStudent !== undefined &&
    d.phone &&
    (!d.isStudent || d.branch),
  )
}
