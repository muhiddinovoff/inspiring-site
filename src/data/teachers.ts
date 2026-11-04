import type { Lang } from "@/i18n"
import { asset } from "@/lib/site-root"

/** A text in all three site languages. Leave a language empty and the Uzbek text is shown instead. */
export type Localized = Record<Lang, string>

/**
 * Ustozlar ma’lumoti. Har bir ustoz uchun to‘ldiring:
 * - name: ism-familiya (barcha tillarda bir xil)
 * - subject, exp, about: uch tilda, masalan { uz: "Matematika", ru: "Математика", en: "Mathematics" }
 * - wins: yutuqlar, har biri uch tilda
 * Bo‘sh qoldirilgan maydon kartada ko‘rsatilmaydi (ism bo‘sh bo‘lsa, src/i18n dagi teachers.fallbackName chiqadi).
 * Kartada yutuqlardan birinchi 5 tasi (telefonda 3 tasi) ko‘rinadi.
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
    name: "Sherzod Dustov",
    subject: { uz: "Matematika", ru: "Математика", en: "Mathematics" },
    exp: {
      uz: "30+ yillik tajriba, Inspiring asoschisi",
      ru: "Опыт 30+ лет, основатель Inspiring",
      en: "30+ years of experience, founder of Inspiring",
    },
    about: {
      uz: "Xalqaro darajadagi matematika ustozi. Yurtimizning eng kuchli ta’lim maskanlarida dars bergan, hozir o‘zi asos solgan Inspiring’da matematikani sodda, oson va samarali o‘rgatadi. Ijtimoiy tarmoqlarda matematikani keng targ‘ib qiladi: t.me/dustov_math.",
      ru: "Преподаватель математики международного уровня. Преподавал в сильнейших учебных заведениях страны, сейчас в основанном им Inspiring учит математике просто, понятно и эффективно. Активно популяризирует математику в соцсетях: t.me/dustov_math.",
      en: "An internationally recognised mathematics teacher. He has taught at the country's strongest schools and now teaches maths simply, clearly and effectively at Inspiring, which he founded. He actively promotes mathematics on social media: t.me/dustov_math.",
    },
    wins: [
      {
        uz: "50+ o‘quvchisi xalqaro va milliy matematika olimpiadalari g‘olibi",
        ru: "50+ учеников — победители международных и национальных олимпиад по математике",
        en: "50+ students have won international and national maths olympiads",
      },
      {
        uz: "5000+ iqtidorli yoshlarga matematikadan dars bergan",
        ru: "Обучил математике 5000+ одарённых ребят",
        en: "Has taught mathematics to 5,000+ gifted young people",
      },
      {
        uz: "Shogirdlari O‘zbekiston va xorijning nufuzli universitetlarida grant asosida o‘qimoqda",
        ru: "Ученики учатся в престижных вузах Узбекистана и за рубежом, в том числе на грантах",
        en: "Former students study at top universities in Uzbekistan and abroad, many on grants",
      },
    ],
    img: asset("teachers/ustoz-1.jpg"),
  },
  {
    name: "Xalilov Dilshodbek",
    subject: { uz: "", ru: "", en: "" },
    exp: {
      uz: "2021-yildan beri dars beradi",
      ru: "Преподаёт с 2021 года",
      en: "Teaching since 2021",
    },
    about: {
      uz: "2022–2024-yillarda 60+ abituriyentni oliy ta’limga kiritgan, 2024-yildan yosh bolalarni nufuzli maktablarga tayyorlaydi.",
      ru: "В 2022–2024 годах помог 60+ абитуриентам поступить в вузы, с 2024 года готовит детей в престижные школы.",
      en: "Helped 60+ applicants get into university in 2022–2024; since 2024 prepares children for top schools.",
    },
    wins: [
      {
        uz: "7 ta o‘quvchi Prezident maktabiga",
        ru: "7 учеников поступили в Президентские школы",
        en: "7 students into Presidential schools",
      },
      {
        uz: "20 ta o‘quvchi Al-Xorazmiy nomidagi maktabga",
        ru: "20 учеников поступили в школу имени Аль-Хорезми",
        en: "20 students into the Al-Khorazmiy school",
      },
      {
        uz: "33 ta o‘quvchi ixtisoslashtirilgan maktablarga",
        ru: "33 ученика поступили в специализированные школы",
        en: "33 students into specialized schools",
      },
      {
        uz: "7 ta o‘quvchi 2026-yilda ochilgan xorijiy tillarga ixtisoslashtirilgan maktabga",
        ru: "7 учеников поступили в открытую в 2026 году школу с углублённым изучением иностранных языков",
        en: "7 students into the foreign-language specialized school opened in 2026",
      },
    ],
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
    name: "Najmiddin Ibrohimov",
    subject: { uz: "Matematika", ru: "Математика", en: "Mathematics" },
    exp: {
      uz: "O‘zMU, Matematika yo‘nalishi — 2023-yildan beri",
      ru: "НУУз, направление «Математика» — с 2023 года",
      en: "NUUz, Mathematics — since 2023",
    },
    about: {
      uz: "MS A+ sertifikati sohibi, 2023-yildan matematika o‘qitadi. Dars namunalari: t.me/mathustoz.",
      ru: "Обладатель сертификата MS A+, преподаёт математику с 2023 года. Примеры уроков: t.me/mathustoz.",
      en: "Holds an MS A+ certificate, teaching mathematics since 2023. Lesson samples: t.me/mathustoz.",
    },
    wins: [
      {
        uz: "10 ta o‘quvchi Prezident maktabiga (1–3-o‘rinlar)",
        ru: "10 учеников поступили в Президентские школы (1–3-е места)",
        en: "10 students into Presidential schools (1st–3rd place)",
      },
      {
        uz: "25+ o‘quvchi Alxorazmiy nomidagi maktabga",
        ru: "25+ учеников поступили в школу имени Аль-Хорезми",
        en: "25+ students into the Al-Khorazmiy school",
      },
      {
        uz: "8 ta o‘quvchi Mirzo Ulug‘bek maktabiga (2 tasi 1-o‘rin)",
        ru: "8 учеников поступили в школу Мирзо Улугбека (2 — на 1-м месте)",
        en: "8 students into the Mirzo Ulugbek school (2 took 1st place)",
      },
      {
        uz: "10+ o‘quvchi xorijiy tillarga ixtisoslashtirilgan maktablarga",
        ru: "10+ учеников поступили в школы с углублённым изучением иностранных языков",
        en: "10+ students into foreign-language specialized schools",
      },
      {
        uz: "50+ o‘quvchi ixtisoslashtirilgan maktablarga",
        ru: "50+ учеников поступили в специализированные школы",
        en: "50+ students into specialized schools",
      },
    ],
    img: asset("teachers/ustoz-6.jpg"),
  },
]

/** Picks the text for `lang`, falling back to Uzbek. */
export const pick = (text: Localized, lang: Lang) => text[lang] || text.uz
