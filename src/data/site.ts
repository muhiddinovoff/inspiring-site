export const CONTACT = {
  phone: "+998 77 256 11 77",
  phoneHref: "tel:+998772561177",
  telegram: "https://t.me/inspiringuz",
  instagram: "https://instagram.com/inspiringuz",
  handle: "@inspiringuz",
  telegramSubscribers: "13,6 ming",
}

export const NAV = [
  { id: "natijalar", label: "Natijalar" },
  { id: "ustozlar", label: "Ustozlar" },
  { id: "dasturlar", label: "Dasturlar" },
  { id: "yol", label: "Qanday ishlaymiz" },
  { id: "savollar", label: "Savollar" },
  { id: "filiallar", label: "Filiallar" },
] as const

/** 2025–2026 o‘quv yili natijalari. Jami: 192. */
export const RESULTS = [
  { label: "Davlat ixtisoslashtirilgan maktablari", short: "Davlat ixt.", value: 88 },
  { label: "Al-Xorazmiy nomidagi xalqaro maktab", short: "Al-Xorazmiy", value: 42 },
  { label: "Xorijiy ixtisoslashtirilgan maktablar", short: "Xorijiy ixt.", value: 31 },
  { label: "Boshqa nufuzli muassasalar", short: "Boshqa", value: 20 },
  { label: "Prezident maktablari", short: "Prezident", value: 11 },
] as const

export const RESULTS_TOTAL = RESULTS.reduce((s, r) => s + r.value, 0)

export const STATS = [
  { value: 192, suffix: "+", label: "o‘quvchi 2025–2026-yilda qabul qilindi" },
  { value: 97.7, suffix: "%", decimals: 1, label: "ota-ona darslardan mamnun" },
  { value: 10, suffix: "", label: "filial to‘rt shaharda" },
  { value: 13.6, suffix: " ming", decimals: 1, label: "ota-ona Telegram kanalimizda" },
] as const

export const REASONS = [
  {
    title: "Imtihonni biladigan ustozlar",
    text: "Ustozlarimiz yillar davomida aynan Prezident va ixtisoslashtirilgan maktablar imtihoniga tayyorlab kelgan.",
  },
  {
    title: "Real imtihon formatida",
    text: "Darslar va sinov imtihonlari haqiqiy test talablari, vaqti va savol turlariga moslab o‘tkaziladi.",
  },
  {
    title: "Natijani ko‘rib turasiz",
    text: "Sinov imtihonlaridan keyin farzandingiz qaysi mavzuda kuchli, qayerda ishlash kerakligini bilib borasiz.",
  },
  {
    title: "Uyingizga yaqin",
    text: "Toshkentda 7 ta, Samarqand, Termiz va Navoiyda filiallarimiz bor. Qatnov uchun vaqt ketmaydi.",
  },
] as const

export const PROGRAMS = [
  {
    grade: "1–2-sinf",
    title: "Erta boshlash",
    text: "Bosimsiz, o‘yin orqali mantiq va o‘qish ko‘nikmalari. Keyingi bosqich uchun mustahkam poydevor.",
    points: ["Mantiqiy fikrlash", "O‘qish va tushunish", "Kichik guruhlar"],
  },
  {
    grade: "3–4-sinf",
    title: "Prezident maktablariga tayyorlov",
    text: "Asosiy yo‘nalishimiz. Imtihonning har bir bo‘limi bo‘yicha tizimli tayyorgarlik.",
    points: ["Matematika va mantiq", "Ona tili va ingliz tili", "Muntazam sinov imtihonlari"],
    featured: true,
  },
  {
    grade: "2–4-sinf",
    title: "Ixtisoslashtirilgan maktablarga",
    text: "Al-Xorazmiy, davlat va xorijiy tillarga ixtisoslashgan maktablar imtihoni hamda suhbatiga tayyorlov.",
    points: ["Al-Xorazmiy maktabi", "Xorijiy til maktablari", "Suhbatga tayyorlash"],
  },
] as const

export const STEPS = [
  { title: "Ariza qoldirasiz", text: "Bir daqiqa vaqt oladi: ism va telefon raqami yetarli." },
  { title: "Menejer qo‘ng‘iroq qiladi", text: "Farzandingiz, sinfi va maqsadingiz haqida so‘raydi, savollaringizga javob beradi." },
  { title: "Darajani aniqlaymiz", text: "Farzandingiz hozir qayerda turganini bilib, mos guruh va reja tanlanadi." },
  { title: "Tizimli darslar", text: "Imtihon mavzulari bo‘yicha mashg‘ulotlar va muntazam sinov imtihonlari." },
  { title: "Qabul", text: "Hujjat topshirish va imtihon kunlariga oxirgi tayyorgarlik." },
] as const

export const FAQ = [
  {
    q: "Farzandim 2-sinfda, hali erta emasmi?",
    a: "Yo‘q. Erta boshlash tayyorgarlikni bosimsiz qiladi: farzandingiz mavzularni shoshmasdan o‘zlashtiradi. Menejerimiz yoshiga mos yo‘nalishni tushuntirib beradi.",
  },
  {
    q: "Kurs narxi va dars jadvali qanday?",
    a: "Narx va jadval sinf, yo‘nalish va filialga qarab belgilanadi. Ariza qoldirsangiz, menejerimiz aniq ma’lumotni aytadi.",
  },
  {
    q: "Qaysi maktablarga tayyorlaysiz?",
    a: "Prezident maktablari, Al-Xorazmiy nomidagi xalqaro maktab, davlat va xorijiy ixtisoslashtirilgan maktablar hamda boshqa nufuzli ta’lim muassasalari.",
  },
  {
    q: "Qabul qachon boshlanadi?",
    a: "Qabul doimo ochiq. Istalgan vaqtda ariza qoldirib, tayyorgarlikni boshlashingiz mumkin.",
  },
  {
    q: "Darslar qayerda o‘tadi?",
    a: "Toshkentning 7 ta hududida, shuningdek Samarqand, Termiz va Navoiydagi filiallarimizda. Manzillarni pastdagi “Filiallar” bo‘limida topasiz.",
  },
] as const

export type City = "Toshkent" | "Samarqand" | "Termiz" | "Navoiy"

export const BRANCHES: { city: City; name: string; address: string; landmark?: string }[] = [
  { city: "Toshkent", name: "Chilonzor", address: "Novza metro bekati, Sport tovar chorrahasi, 4-qavat" },
  { city: "Toshkent", name: "Sergeli", address: "Sergeli tumani, 3-bekat oldida", landmark: "Asal med klinikasi tepasida, Saxiy bozor yaqinida" },
  { city: "Toshkent", name: "Yunusobod", address: "Yunusobod tumani", landmark: "Turkiston metrosi yonida" },
  { city: "Toshkent", name: "Yangidarxon", address: "Yangihayot tumani, Yangidarxon mahallasi", landmark: "Sergeli 2" },
  { city: "Toshkent", name: "Yashnobod", address: "Mahtumquli ko‘chasi, 85-uy", landmark: "Makro supermarketi qarshisida" },
  { city: "Toshkent", name: "Olmos", address: "Yashnobod tumani, Harbiylar shaharchasi, 58a, 8-uy", landmark: "Olmos metrosidan 10 daqiqa, Aziz shifo med qarshisida" },
  { city: "Toshkent", name: "TTZ", address: "Mirzo Ulug‘bek tumani, TTZ", landmark: "Diadora chorrahasi, Lokomotiv bekati yonida" },
  { city: "Samarqand", name: "Future Leaders’ Academy", address: "Samarqand, Bo‘stonsaroy ko‘chasi, 29-uy", landmark: "Respublika kasalxonasi, Dag‘bit yo‘nalishidagi Yangi ko‘prik" },
  { city: "Termiz", name: "Termiz", address: "Termiz shahri", landmark: "Soat chorrahasi" },
  { city: "Navoiy", name: "Navoiy", address: "Talabalar ko‘chasi, 50/1", landmark: "Azamat Fayz to‘yxonasi qarshisi, 14-mikrorayon" },
]

export const SCHOOL = {
  name: "Inspiring International School",
  address: "Chilonzor tumani, 1-Katta Chilonzor MFY, 6-uy",
  landmark: "Toshkent shahar Prokuraturasi yaqinida",
}

/** Uzbek map search link for an address; opens Yandex Maps in the app on phones. */
export function mapLink(city: string, address: string) {
  return `https://yandex.uz/maps/?text=${encodeURIComponent(`Inspiring Education, ${city}, ${address}`)}`
}

/** Unsplash stock photos used for atmosphere (classroom, studying). */
export const PHOTOS = {
  classroom: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80",
  studying: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
  books: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
}
