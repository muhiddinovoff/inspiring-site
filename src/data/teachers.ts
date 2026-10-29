import type { Lang } from "@/i18n"
import { asset } from "@/lib/site-root"

/** A text in all three site languages. Leave a language empty and the Uzbek text is shown instead. */
export type Localized = Record<Lang, string>

/**
 * Ustozlar ma’lumoti. Har bir ustoz uchun to‘ldiring:
 * - name: ism-familiya (barcha tillarda bir xil)
 * - subject, exp, about: uch tilda, masalan { uz: "Matematika", ru: "Математика", en: "Mathematics" }
 * - wins: yutuqlar, har biri uch tilda
 * Bo‘sh maydonlar o‘rniga vaqtincha umumiy yoki "Lorem ipsum" matn chiqadi (src/i18n: teachers.fallback*, teachers.placeholder).
 */
export type Teacher = {
  name: string
  subject: Localized
  exp: Localized
  about: Localized
  wins: Localized[]
  img: string
}

// Bittadan to‘ldiring. Yangi ustoz: rasmni public/teachers/ ga qo‘yib, shu ro‘yxatga yana bitta yozuv qo‘shing.
// Yutuq misoli: wins: [{ uz: "50+ o‘quvchi Prezident maktabiga", ru: "50+ учеников в Президентские школы", en: "50+ students into Presidential schools" }]
export const TEACHERS: Teacher[] = [
  {
    name: "",
    subject: { uz: "", ru: "", en: "" },
    exp: { uz: "", ru: "", en: "" },
    about: { uz: "", ru: "", en: "" },
    wins: [],
    img: asset("teachers/ustoz-1.jpg"),
  },
  {
    name: "",
    subject: { uz: "", ru: "", en: "" },
    exp: { uz: "", ru: "", en: "" },
    about: { uz: "", ru: "", en: "" },
    wins: [],
    img: asset("teachers/ustoz-2.jpg"),
  },
  {
    name: "",
    subject: { uz: "", ru: "", en: "" },
    exp: { uz: "", ru: "", en: "" },
    about: { uz: "", ru: "", en: "" },
    wins: [],
    img: asset("teachers/ustoz-3.jpg"),
  },
  {
    name: "",
    subject: { uz: "", ru: "", en: "" },
    exp: { uz: "", ru: "", en: "" },
    about: { uz: "", ru: "", en: "" },
    wins: [],
    img: asset("teachers/ustoz-4.jpg"),
  },
  {
    name: "",
    subject: { uz: "", ru: "", en: "" },
    exp: { uz: "", ru: "", en: "" },
    about: { uz: "", ru: "", en: "" },
    wins: [],
    img: asset("teachers/ustoz-5.jpg"),
  },
  {
    name: "",
    subject: { uz: "", ru: "", en: "" },
    exp: { uz: "", ru: "", en: "" },
    about: { uz: "", ru: "", en: "" },
    wins: [],
    img: asset("teachers/ustoz-6.jpg"),
  },
]

/** Picks the text for `lang`, falling back to Uzbek. */
export const pick = (text: Localized, lang: Lang) => text[lang] || text.uz
