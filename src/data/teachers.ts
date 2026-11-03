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
    name: "Maxanov Asilbek",
    subject: { uz: "Matematika", ru: "Математика", en: "Mathematics" },
    exp: {
      uz: "TDPU, Matematika va informatika yo‘nalishi — 2-o‘rin",
      ru: "ТГПУ, направление «Математика и информатика» — 2-е место",
      en: "TSPU, Mathematics and Informatics — 2nd place",
    },
    about: {
      uz: "A+ sertifikati (2025), mahalliy olimpiadalarda 2 marta 1–2-o‘rin sohibi.",
      ru: "Сертификат A+ (2025), дважды занимал 1–2-е места на местных олимпиадах.",
      en: "A+ certificate (2025), twice placed 1st–2nd at local olympiads.",
    },
    wins: [
      {
        uz: "4 ta o‘quvchi Prezident maktabiga",
        ru: "4 ученика поступили в Президентские школы",
        en: "4 students into Presidential schools",
      },
      {
        uz: "1 ta o‘quvchi xorijiy tillarga ixtisoslashtirilgan maktabga",
        ru: "1 ученик поступил в школу с углублённым изучением иностранных языков",
        en: "1 student into a foreign-language specialized school",
      },
      {
        uz: "20 ga yaqin o‘quvchi ixtisoslashtirilgan maktablarga",
        ru: "около 20 учеников поступили в специализированные школы",
        en: "nearly 20 students into specialized schools",
      },
      {
        uz: "6 ta o‘quvchi Alxorazmiy nomidagi maktabga",
        ru: "6 учеников поступили в школу имени Аль-Хорезми",
        en: "6 students into the Al-Khorazmiy school",
      },
    ],
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
