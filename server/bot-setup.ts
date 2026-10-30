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
    name: "Inspiring Education — Arizalar",
    short: "Inspiring Education saytidan kelgan arizalar call-markaz uchun.",
    description:
      "Inspiring Education — Prezident va ixtisoslashtirilgan maktablarga tayyorlov markazi.\n\nBu bot saytdagi har bir yangi arizani call-markazga yetkazadi: ism, familiya, telefon raqami va (ota-ona ruxsat bersa) joylashuv hamda eng yaqin filial.",
    start: "Bot haqida va chat ID",
    id: "Mening chat ID raqamim",
  },
  ru: {
    name: "Inspiring Education — Заявки",
    short: "Заявки с сайта Inspiring Education для колл-центра.",
    description:
      "Inspiring Education — центр подготовки в Президентские и специализированные школы.\n\nБот доставляет в колл-центр каждую новую заявку с сайта: имя, фамилию, телефон и (если родитель разрешил) местоположение и ближайший филиал.",
    start: "О боте и chat ID",
    id: "Мой chat ID",
  },
  en: {
    name: "Inspiring Education — Requests",
    short: "Requests from the Inspiring Education website, for the call centre.",
    description:
      "Inspiring Education prepares children for Presidential and specialised schools.\n\nThis bot brings every new request from the website to the call centre: first name, last name, phone and (if the parent allowed it) location and nearest branch.",
    start: "About the bot and chat ID",
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
        { command: "id", description: t.id },
      ],
      ...scope,
    })
  }
  console.log(`✓ ${lang}`)
}
console.log("Done. Profile picture: @BotFather → /setuserpic → docs/assets/bot-avatar.png")
