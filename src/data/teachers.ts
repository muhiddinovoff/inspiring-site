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
    name: "Mr. Ali",
    subject: { uz: "", ru: "", en: "" },
    exp: { uz: "", ru: "", en: "" },
    about: { uz: "", ru: "", en: "" },
    wins: [
      {
        uz: "18 ta o‘quvchi Prezident maktabiga",
        ru: "18 учеников поступили в Президентские школы",
        en: "18 students into Presidential schools",
      },
      {
        uz: "25 ta o‘quvchi Al-Xorazmiy nomidagi maktabga",
        ru: "25 учеников поступили в школу имени Аль-Хорезми",
        en: "25 students into the Al-Khorazmiy school",
      },
      {
        uz: "90+ ta o‘quvchi ixtisoslashgan maktablarga",
        ru: "90+ учеников поступили в специализированные школы",
        en: "90+ students into specialized schools",
      },
      {
        uz: "3 ta o‘quvchi xorijiy tillarga ixtisoslashtirilgan maktabga",
        ru: "3 ученика поступили в школу с углублённым изучением иностранных языков",
        en: "3 students into a foreign-language specialized school",
      },
    ],
    img: asset("teachers/ustoz-3.jpg"),
  },
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
    img: asset("teachers/ustoz-4.jpg"),
  },
  {
    name: "Anna",
    subject: { uz: "Ingliz tili", ru: "Английский язык", en: "English" },
    exp: {
      uz: "ESL/EFL o‘qituvchisi, IELTS/CEFR tayyorlov mutaxassisi — 2009-yildan beri",
      ru: "Преподаватель ESL/EFL, специалист по подготовке к IELTS/CEFR — с 2009 года",
      en: "ESL/EFL teacher, IELTS/CEFR exam prep specialist — since 2009",
    },
    about: {
      uz: "2018–2025-yillarda Bilim va malakalarni baholash agentligida CEFR imtihon testlarini tuzuvchi va baholovchi bo‘lib ishlagan, hozir Inspiring International School’da IELTS va CEFR’ga tayyorlaydi. O‘zDJTU’da lingvistika bo‘yicha magistr, ingliz tili — C1.",
      ru: "С 2018 по 2025 год работала главным специалистом Агентства по оценке знаний и навыков — разрабатывала и оценивала тесты CEFR. Сейчас преподаёт в Inspiring International School, готовит к IELTS и CEFR. Магистр лингвистики (УзГУМЯ), английский — C1.",
      en: "From 2018 to 2025 served as chief specialist at Uzbekistan's Agency for Assessing Knowledge and Skills, developing and scoring official CEFR exams. Now teaches at Inspiring International School, preparing students for IELTS and CEFR. Master's in Linguistics (UzSWLU), English level C1.",
    },
    wins: [
      {
        uz: "CEFR imtihon testlarini rasmiy tuzuvchi va baholovchisi (2018–2025)",
        ru: "Официальный разработчик и эксперт-оценщик тестов CEFR (2018–2025)",
        en: "Official CEFR exam item writer and assessor (2018–2025)",
      },
      {
        uz: "Cambridge Assessment English treninglarida ishtirok etgan",
        ru: "Участвовала в тренингах Cambridge Assessment English",
        en: "Trained with Cambridge Assessment English",
      },
      {
        uz: "Lingvistika yo‘nalishi bo‘yicha magistr (O‘zDJTU)",
        ru: "Магистр лингвистики (УзГУМЯ)",
        en: "Master's degree in Linguistics (UzSWLU)",
      },
      {
        uz: "Ingliz tili — C1 darajasi",
        ru: "Английский язык — уровень C1",
        en: "English — C1 level",
      },
    ],
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
