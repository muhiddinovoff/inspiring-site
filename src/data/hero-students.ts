/**
 * Bosh ekranda navbat bilan (har 5 soniyada) ko‘rsatiladigan o‘quvchilar — natija posterlaridan
 * (`assets/hero/posters/`). `kid` — `public/hero/cutouts/kid-N-*.webp` dagi qirqib olingan rasm raqami
 * (`scripts/cutout.py` dagi `ROW` tartibida). `city` — maktab shahri, nomi i18n `hero.school` da.
 */
export const HERO_STUDENTS = [
  { name: "Shonazarova Shahinabonu", kid: 6, score: 86.5, rank: 9, city: "tashkent" },
  { name: "Juliboyev Xondamir", kid: 10, score: 85.5, rank: 12, city: "tashkent" },
  { name: "Isomiddinov Azizbek", kid: 7, score: 85, rank: 13, city: "tashkent" },
  { name: "Burhonov Nurmuhammad", kid: 9, score: 85, rank: 14, city: "tashkent" },
  { name: "Valijonova Samira", kid: 1, score: 82.5, rank: 20, city: "tashkent" },
  { name: "Mirhabibov Mirhabib", kid: 2, score: 82.5, rank: 21, city: "tashkent" },
  { name: "Mirzasoyipov Imron", kid: 8, score: 82.5, rank: 24, city: "tashkent" },
  { name: "Yo‘ldoshev Muhammadiso", kid: 3, score: 78.5, rank: 11, city: "termez" },
  { name: "Yo‘ldoshev Zuhriddin", kid: 5, score: 74.5, rank: 19, city: "termez" },
  { name: "Xudoyberdiyev Xamid", kid: 4, score: 74.5, rank: 21, city: "termez" },
] as const

/** Year the students above were admitted. */
export const HERO_YEAR = 2026
