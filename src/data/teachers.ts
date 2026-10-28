/**
 * Ustozlar ma’lumoti. Har bir ustoz uchun maydonlarni to‘ldiring:
 * name (ism-familiya), subject (fan), exp (tajriba, masalan "8 yil"), about (qisqacha), wins (yutuqlar ro‘yxati).
 * Bo‘sh maydonlar saytda chiroyli tarzda yashiriladi.
 */
export type Teacher = {
  name: string
  subject: string
  exp: string
  about: string
  wins: string[]
  img: string
}

const img = (n: number) => `${import.meta.env.BASE_URL}teachers/ustoz-${n}.jpg`

export const TEACHERS: Teacher[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  name: "",
  subject: "",
  exp: "",
  about: "",
  wins: [],
  img: img(n),
}))
