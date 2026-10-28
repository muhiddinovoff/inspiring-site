// Language-neutral data: numbers, links, ids. All visible text lives in src/i18n/<lang>.ts.

export const CONTACT = {
  phone: "+998 77 256 11 77",
  phoneHref: "tel:+998772561177",
  telegram: "https://t.me/inspiringuz",
  instagram: "https://instagram.com/inspiringuz",
  handle: "@inspiringuz",
}

export const NAV_IDS = ["natijalar", "ustozlar", "dasturlar", "yol", "savollar", "filiallar"] as const
export type NavId = (typeof NAV_IDS)[number]

/** 2025–2026 o‘quv yili natijalari, kattasidan kichigiga. Matnlari i18n `results.items` da shu tartibda. */
export const RESULTS = [88, 42, 31, 20, 11] as const
export const PRESIDENT_COUNT = 11
export const RESULTS_TOTAL = RESULTS.reduce((s, v) => s + v, 0)

export const STATS = [
  { value: 192, decimals: 0 },
  { value: 97.7, decimals: 1 },
  { value: 10, decimals: 0 },
  { value: 13.6, decimals: 1 },
] as const

export type City = "tashkent" | "samarkand" | "termez" | "navoi"

/** Order matches i18n `branches.items`. `map` is the Uzbek address used for the map search. */
export const BRANCHES: { city: City; map: string }[] = [
  { city: "tashkent", map: "Toshkent, Novza metro, Sport tovar chorrahasi" },
  { city: "tashkent", map: "Toshkent, Sergeli tumani, 3-bekat" },
  { city: "tashkent", map: "Toshkent, Yunusobod, Turkiston metrosi" },
  { city: "tashkent", map: "Toshkent, Yangihayot tumani, Yangidarxon mahallasi" },
  { city: "tashkent", map: "Toshkent, Mahtumquli ko‘chasi, 85" },
  { city: "tashkent", map: "Toshkent, Harbiylar shaharchasi, 58a" },
  { city: "tashkent", map: "Toshkent, Mirzo Ulug‘bek tumani, TTZ, Lokomotiv bekati" },
  { city: "samarkand", map: "Samarqand, Bo‘stonsaroy ko‘chasi, 29" },
  { city: "termez", map: "Termiz, Soat chorrahasi" },
  { city: "navoi", map: "Navoiy, Talabalar ko‘chasi, 50/1" },
]

export const SCHOOL_MAP = "Toshkent, Chilonzor tumani, 1-Katta Chilonzor MFY, 6-uy"

/** Opens Yandex Maps (the app on phones) searching for the branch. */
export function mapLink(address: string) {
  return `https://yandex.uz/maps/?text=${encodeURIComponent(`Inspiring Education, ${address}`)}`
}

/** Unsplash stock photos used for atmosphere (classroom, studying). */
export const PHOTOS = {
  classroom: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80",
  studying: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
}
