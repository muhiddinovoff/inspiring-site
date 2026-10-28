import type { Lang } from "@/i18n"
import { asset } from "@/lib/site-root"

/** A text in all three site languages. Leave a language empty and the Uzbek text is shown instead. */
export type Localized = Record<Lang, string>

/**
 * Ustozlar ma’lumoti. Har bir ustoz uchun to‘ldiring:
 * - name: ism-familiya (barcha tillarda bir xil)
 * - subject, exp, about: uch tilda, masalan { uz: "Matematika", ru: "Математика", en: "Mathematics" }
 * - wins: yutuqlar, har biri uch tilda
 * Bo‘sh maydonlar saytda yashiriladi yoki umumiy matn bilan almashtiriladi.
 */
export type Teacher = {
  name: string
  subject: Localized
  exp: Localized
  about: Localized
  wins: Localized[]
  img: string
}

const empty = (): Localized => ({ uz: "", ru: "", en: "" })

export const TEACHERS: Teacher[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  name: "",
  subject: empty(),
  exp: empty(),
  about: empty(),
  wins: [],
  img: asset(`teachers/ustoz-${n}.jpg`),
}))

/** Picks the text for `lang`, falling back to Uzbek. */
export const pick = (text: Localized, lang: Lang) => text[lang] || text.uz
