/**
 * Gives the Telegram bot its name, descriptions and command menu in all three languages. Run once (and again after
 * changing the texts):  npm run bot:setup
 *
 * The profile picture can't be set through the Bot API: in @BotFather send /setuserpic, pick the bot and send
 * docs/assets/bot-avatar.png.
 */
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"

import { telegram } from "./telegram.ts"

const ROOT = resolve(import.meta.dirname, "..")
if (existsSync(join(ROOT, ".env"))) process.loadEnvFile(join(ROOT, ".env"))
const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set (.env)")
const bot = telegram(token)

const TEXTS = {
  uz: {
    name: "Inspiring Education",
    short:
      "Prezident va ixtisoslashtirilgan maktablarga tayyorlov markazi. Ro‘yxatdan o‘ting va yopiq kurslarni oching.",
    description:
      "Inspiring Education — Prezident va ixtisoslashtirilgan maktablarga tayyorlov markazi.\n\nBotda:\n• qisqa anketani to‘ldirasiz — mutaxassislarimiz siz bilan bog‘lanishadi;\n• do‘stlaringizni taklif qilib, maxsus yopiq kurslarga kirish huquqini olasiz.",
    start: "Boshlash",
    menu: "Asosiy menyu",
    closed: "Yopiq kurslar va taklif havolasi",
    anketa: "Anketani qayta to‘ldirish",
    id: "Mening chat ID raqamim",
  },
  ru: {
    name: "Inspiring Education",
    short: "Центр подготовки в Президентские и специализированные школы. Регистрируйтесь и откройте закрытые курсы.",
    description:
      "Inspiring Education — центр подготовки в Президентские и специализированные школы.\n\nВ боте:\n• заполните короткую анкету — наши специалисты свяжутся с вами;\n• пригласите друзей и получите доступ к закрытым курсам.",
    start: "Начать",
    menu: "Главное меню",
    closed: "Закрытые курсы и ссылка-приглашение",
    anketa: "Заполнить анкету заново",
    id: "Мой chat ID",
  },
  en: {
    name: "Inspiring Education",
    short: "Preparation for Presidential and specialised schools. Sign up and unlock the closed courses.",
    description:
      "Inspiring Education prepares children for Presidential and specialised schools.\n\nIn this bot:\n• fill in a short form and our team will contact you;\n• invite friends to unlock the closed courses.",
    start: "Start",
    menu: "Main menu",
    closed: "Closed courses and invite link",
    anketa: "Fill in the form again",
    id: "My chat ID",
  },
}

for (const [lang, t] of Object.entries(TEXTS)) {
  // Uzbek is also the default for every other language.
  const variants = lang === "uz" ? [undefined, "uz"] : [lang]
  for (const language_code of variants) {
    const scope = language_code ? { language_code } : {}
    await bot.call("setMyName", { name: t.name, ...scope })
    await bot.call("setMyShortDescription", { short_description: t.short, ...scope })
    await bot.call("setMyDescription", { description: t.description, ...scope })
    await bot.call("setMyCommands", {
      commands: [
        { command: "start", description: t.start },
        { command: "menu", description: t.menu },
        { command: "closed", description: t.closed },
        { command: "anketa", description: t.anketa },
      ],
      ...scope,
    })
  }
  console.log(`✓ ${lang}`)
}

// Admins (TELEGRAM_CHAT_IDS) also see their own commands. Each must have pressed Start in the bot.
const admins = (process.env.TELEGRAM_CHAT_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
for (const chat_id of admins) {
  try {
    await bot.call("setMyCommands", {
      scope: { type: "chat", chat_id },
      commands: [
        { command: "admin", description: "Admin panel" },
        { command: "excel", description: "Lidlar Excel faylda" },
        { command: "stats", description: "Statistika" },
        { command: "anketa", description: "Anketani sinab ko‘rish" },
        { command: "menu", description: "Foydalanuvchi menyusi" },
        { command: "id", description: "Chat ID" },
      ],
    })
    console.log(`✓ admin ${chat_id}`)
  } catch (e) {
    console.log(`✗ admin ${chat_id}: ${(e as Error).message}`)
  }
}
console.log("Done. Profile picture: @BotFather → /setuserpic → docs/assets/bot-avatar.png")
