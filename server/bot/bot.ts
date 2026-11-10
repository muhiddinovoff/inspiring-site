/**
 * The user side of the Telegram bot.
 *
 *  1. Lead: /start → short form (name, surname, father’s name, grade, region → city/district buttons, whether they
 *     already study at Inspiring Education → branch, phone) → card to the admins; Excel on demand and every evening.
 *  2. Required channel: the menu opens only after subscribing to REQUIRED_CHANNEL (@inspiringuz).
 *  3. Closed courses: each user has a referral link. A friend counts once they are new to the bot, finished the
 *     form and subscribed to the channel. At REFERRAL_GOAL (5) friends the bot gives a personal join-request link
 *     to the closed channel: it approves only users who earned it, so passing the link on lets nobody else in.
 */
import { CONTACT } from "../../src/data/site.ts"
import type { Telegram, Update } from "../telegram.ts"
import type { Store, User } from "./db.ts"
import { answer, type Button, complete, type Draft, isStep, type Markup, question, type Step, summary } from "./form.ts"
import { fileName, leadCard, leadsWorkbook, statsText, tashkentDay, tashkentHour, XLSX_TYPE } from "./report.ts"
import { REGIONS } from "./regions.ts"

export type Api = Pick<Telegram, "call" | "sendFile">

export type BotConfig = {
  /** Who gets lead cards and may use /excel, /stats (chat IDs). */
  admins: string[]
  /** "@inspiringuz"; empty turns the subscription gate off. */
  channel: string
  /** Numeric ID of the private channel with the closed courses ("-100…"); empty: not set up yet. */
  closedChannel: string
  goal: number
  /** Hour in Tashkent for the daily Excel report; null: off. */
  reportHour: number | null
  site: string
}

const MENU = {
  closed: "🔒 Yopiq kurslar",
  friends: "👥 Mening referallarim",
  me: "📝 Ma’lumotlarim",
  contact: "📞 Aloqa",
} as const
const ADMIN = { excel: "📥 Excel", stats: "📊 Statistika" } as const

const menuKeyboard: Markup = {
  keyboard: [[{ text: MENU.closed }], [{ text: MENU.friends }, { text: MENU.me }], [{ text: MENU.contact }]],
  resize_keyboard: true,
  is_persistent: true,
}
const adminKeyboard: Markup = {
  keyboard: [[{ text: ADMIN.excel }, { text: ADMIN.stats }]],
  resize_keyboard: true,
  is_persistent: true,
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const nameOf = (f: { first_name?: string; last_name?: string }) =>
  [f.first_name, f.last_name].filter(Boolean).join(" ").slice(0, 80)
export const progress = (n: number, goal: number) => {
  const k = Math.min(n, goal)
  return `${"🟢".repeat(k)}${"⚪️".repeat(goal - k)} <b>${n}/${goal}</b>`
}
const MEMBER = new Set(["creator", "administrator", "member"])

export function createBot(api: Api, store: Store, cfg: BotConfig, log: (m: string) => void) {
  let botName: string | undefined
  const username = async () => (botName ??= (await api.call<{ username: string }>("getMe", {})).username)
  const refLink = async (id: number) => `https://t.me/${await username()}?start=ref_${id}`
  const isAdmin = (id: number) => cfg.admins.includes(String(id))
  const channelUrl = `https://t.me/${cfg.channel.replace(/^@/, "")}`

  const send = (chat: number | string, text: string, markup?: Markup) =>
    api.call<{ message_id: number }>("sendMessage", {
      chat_id: chat,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(markup ? { reply_markup: markup } : {}),
    })
  /** Sends and only logs a failure (the person may have blocked the bot). */
  const notify = (chat: number | string, text: string, markup?: Markup) =>
    send(chat, text, markup).catch((e) => log(`send → ${chat}: ${(e as Error).message}`))
  const edit = (chat: number, message: number, text: string, markup?: Markup) =>
    api.call("editMessageText", {
      chat_id: chat,
      message_id: message,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(markup ? { reply_markup: markup } : {}),
    })

  // ------------------------------------------------------------------ channel membership
  let warned = false
  const subCache = new Map<number, { ok: boolean; at: number }>()
  /** true / false, or null when the bot can't tell (it must be an admin of the channel). */
  async function member(chat: string, user: number): Promise<boolean | null> {
    try {
      const m = await api.call<{ status: string; is_member?: boolean }>("getChatMember", {
        chat_id: chat,
        user_id: user,
      })
      return MEMBER.has(m.status) || (m.status === "restricted" && Boolean(m.is_member))
    } catch (e) {
      log(`getChatMember ${chat}/${user}: ${(e as Error).message}`)
      if (!warned) {
        warned = true
        for (const a of cfg.admins) {
          void notify(
            a,
            `⚠️ Bot <b>${esc(chat)}</b> a’zolarini tekshira olmayapti. Botni shu kanalga <b>admin</b> qilib qo‘shing.\n\n<code>${esc((e as Error).message)}</code>`,
          )
        }
      }
      return null
    }
  }
  async function subscribed(user: number, fresh = false) {
    if (!cfg.channel) return true
    const c = subCache.get(user)
    if (!fresh && c?.ok && Date.now() - c.at < 10 * 60_000) return true
    const ok = await member(cfg.channel, user)
    if (ok !== null) subCache.set(user, { ok, at: Date.now() })
    if (subCache.size > 50_000) subCache.clear()
    return ok
  }

  const subscribePrompt = () =>
    [
      `📢 Davom etish uchun rasmiy kanalimiz <b>${esc(cfg.channel)}</b> ga obuna bo‘ling.`,
      "",
      "U yerda natijalar, foydali darslar va yangiliklar chiqadi. Obuna bo‘lgach, «✅ Obunani tekshirish» tugmasini bosing.",
    ].join("\n")
  const subscribeMarkup: Markup = {
    inline_keyboard: [
      [{ text: "📢 Kanalga o‘tish", url: channelUrl }],
      [{ text: "✅ Obunani tekshirish", callback_data: "sub:check" }],
    ],
  }

  /** Lets the user into the menu only when subscribed; counts them for their referrer on the way. */
  async function gate(user: User, fresh = false) {
    const ok = await subscribed(user.id, fresh)
    if (ok === false) {
      await send(user.id, subscribePrompt(), subscribeMarkup)
      return false
    }
    if (ok === true) await credit(user)
    return true
  }

  // ------------------------------------------------------------------ referrals
  async function credit(user: User) {
    if (!user.referrer_id || user.credited_at || !store.lead(user.id)) return
    if (!store.credit(user.id)) return
    const n = store.credited(user.referrer_id).length
    const lead = store.lead(user.id)
    const who = esc(lead ? `${lead.first_name} ${lead.last_name}` : user.name)
    log(`referral ${user.id} → ${user.referrer_id} (${n})`)
    const lines = [`🎉 Do‘stingiz <b>${who}</b> taklifingiz bilan qo‘shildi!`, "", progress(n, cfg.goal)]
    if (n === cfg.goal) {
      lines.push("", "🔓 <b>Tabriklaymiz! Yopiq kurslar siz uchun ochildi.</b>")
      await notify(user.referrer_id, lines.join("\n"), {
        inline_keyboard: [[{ text: "🔓 Yopiq kanalga kirish", callback_data: "cl:open" }]],
      })
    } else {
      if (n < cfg.goal) lines.push(`Yana <b>${cfg.goal - n}</b> ta do‘st qoldi.`)
      await notify(user.referrer_id, lines.join("\n"))
    }
  }

  async function closedScreen(user: User) {
    const n = store.credited(user.id).length
    const link = await refLink(user.id)
    const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
      "Inspiring Education botiga qo‘shiling: Prezident va ixtisoslashtirilgan maktablarga tayyorlov, foydali darslar 👇",
    )}`
    const open = n >= cfg.goal || user.unlocked_at
    const text = [
      "🔒 <b>Yopiq kurslar</b>",
      "",
      "Faqat taklif orqali kiriladigan maxsus darslar kanali.",
      "",
      `Kirish uchun <b>${cfg.goal} ta do‘stingizni</b> taklif qiling. Do‘stingiz hisoblanadi, agar u:`,
      "1) botga sizning havolangiz orqali birinchi marta kirsa,",
      "2) anketani to‘ldirsa,",
      `3) ${esc(cfg.channel || "kanal")} ga obuna bo‘lsa.`,
      "",
      `Hisob: ${progress(n, cfg.goal)}`,
      "",
      `🔗 Sizning havolangiz:\n${link}`,
    ].join("\n")
    const kb: Button[][] = [
      ...(open ? [[{ text: "🔓 Yopiq kanalga kirish", callback_data: "cl:open" }]] : []),
      [{ text: "📤 Do‘stlarga yuborish", url: share }],
      [{ text: "🔄 Yangilash", callback_data: "cl:show" }],
    ]
    return { text, markup: { inline_keyboard: kb } as Markup }
  }

  async function friendsScreen(user: User) {
    const list = store.invited(user.id)
    const n = list.filter((f) => f.credited_at).length
    const rows = list.slice(-30).map((f) => {
      const name = esc(f.lead || f.name || `ID ${f.id}`)
      return f.credited_at
        ? `✅ ${name}`
        : `⏳ ${name} — ${f.lead ? "kanalga obuna bo‘lmagan" : "anketani to‘ldirmagan"}`
    })
    return [
      "👥 <b>Mening referallarim</b>",
      "",
      `Hisob: ${progress(n, cfg.goal)}`,
      "",
      rows.length
        ? rows.join("\n")
        : "Hali hech kim taklifingiz bilan kirmagan. «🔒 Yopiq kurslar» bo‘limidan havolangizni oling.",
      ...(list.length > 30 ? ["", `… jami ${list.length} ta`] : []),
    ].join("\n")
  }

  async function openClosed(user: User, cbId: string) {
    if (!cfg.closedChannel) {
      return api.call("answerCallbackQuery", {
        callback_query_id: cbId,
        text: "Yopiq kanal tez orada ochiladi. Hisobingiz saqlanadi.",
        show_alert: true,
      })
    }
    if (!user.unlocked_at) {
      // Recount: friends who left the channel since they were counted don't count now.
      let active = 0
      for (const id of store.credited(user.id)) {
        if ((await subscribed(id, true)) !== false) active++
        if (active >= cfg.goal) break
      }
      if (active < cfg.goal) {
        await api.call("answerCallbackQuery", { callback_query_id: cbId })
        return send(
          user.id,
          `Hozir faol do‘stlaringiz: ${progress(active, cfg.goal)}\n\nBa’zi do‘stlaringiz ${esc(cfg.channel)} kanalidan chiqib ketgan. Ularni qaytarish yoki yangi do‘st taklif qilish kerak.`,
        )
      }
      store.unlock(user.id)
      log(`unlocked ${user.id}`)
    }
    await api.call("answerCallbackQuery", { callback_query_id: cbId })
    if ((await member(cfg.closedChannel, user.id)) === true) {
      return send(user.id, "✅ Siz allaqachon yopiq kurslar kanalidasiz.")
    }
    const now = Date.now()
    let link = user.invite_link
    if (!link || !user.invite_expires || user.invite_expires < now + 10 * 60_000) {
      const expires = now + 24 * 3_600_000
      const res = await api.call<{ invite_link: string }>("createChatInviteLink", {
        chat_id: cfg.closedChannel,
        name: `u${user.id}`,
        creates_join_request: true,
        expire_date: Math.floor(expires / 1000),
      })
      link = res.invite_link
      store.setInvite(user.id, link, expires)
    }
    return send(
      user.id,
      [
        "🔓 <b>Yopiq kurslar kanaliga havolangiz tayyor!</b>",
        "",
        "Tugmani bosing va «Qo‘shilish so‘rovi»ni yuboring — bot uni darhol tasdiqlaydi.",
        "",
        "🔐 Havola shaxsiy: faqat siz kira olasiz, boshqa odamning so‘rovi rad etiladi. 24 soat amal qiladi.",
      ].join("\n"),
      { inline_keyboard: [[{ text: "➡️ Kanalga qo‘shilish", url: link }]] },
    )
  }

  async function onJoinRequest(r: NonNullable<Update["chat_join_request"]>) {
    const ids = [String(r.chat.id), r.chat.username ? `@${r.chat.username}` : ""]
    if (!cfg.closedChannel || !ids.includes(cfg.closedChannel)) return
    const user = store.user(r.from.id)
    const dm = r.user_chat_id ?? r.from.id
    if (user?.unlocked_at) {
      await api.call("approveChatJoinRequest", { chat_id: r.chat.id, user_id: r.from.id })
      if (user.invite_link) {
        await api
          .call("revokeChatInviteLink", { chat_id: r.chat.id, invite_link: user.invite_link })
          .catch((e) => log(`revoke: ${(e as Error).message}`))
      }
      store.joined(user.id)
      log(`joined closed channel: ${user.id}`)
      await notify(dm, "🎉 <b>Xush kelibsiz!</b> Siz yopiq kurslar kanaliga qo‘shildingiz.")
    } else {
      await api.call("declineChatJoinRequest", { chat_id: r.chat.id, user_id: r.from.id })
      log(`declined closed channel: ${r.from.id}`)
      await notify(
        dm,
        [
          "🔒 Bu havola sizga tegishli emas, shuning uchun so‘rov rad etildi.",
          "",
          `Yopiq kurslarga kirish uchun botda <b>${cfg.goal} ta do‘stingizni</b> taklif qiling — shunda sizga shaxsiy havola beriladi.`,
        ].join("\n"),
        { inline_keyboard: [[{ text: "🤖 Botni ochish", url: `https://t.me/${await username()}?start=closed` }]] },
      )
    }
  }

  // ------------------------------------------------------------------ registration
  const draftOf = (u: User): Draft => {
    try {
      return u.draft ? (JSON.parse(u.draft) as Draft) : {}
    } catch {
      return {}
    }
  }

  async function ask(id: number, step: Step, draft: Draft) {
    store.setStep(id, step, draft)
    const q = question(step, draft)
    await send(id, q.text, q.markup)
  }

  async function startForm(user: User, draft: Draft = {}) {
    await ask(user.id, "firstName", draft)
  }

  /** One answer to the form: text, a shared contact, or a button (callback). */
  async function onForm(user: User, input: Parameters<typeof answer>[1], cb?: { id: string; message: number }) {
    const step = user.step
    if (!isStep(step)) return startForm(user)
    const draft = draftOf(user)
    const res = answer(step, input, draft)
    const ack = (text?: string, alert = false) =>
      cb
        ? api.call("answerCallbackQuery", { callback_query_id: cb.id, ...(text ? { text, show_alert: alert } : {}) })
        : null

    if ("stale" in res) return ack("Bu tugma eskirgan. Oxirgi savolga javob bering.")
    if ("error" in res) {
      if (cb) return ack(res.error.replace(/<[^>]+>/g, ""), true)
      return send(user.id, `⚠️ ${res.error}`)
    }
    if ("done" in res) {
      await ack()
      return finish(user, res.done, cb?.message)
    }
    await ack()
    // Leaving the phone question: take its reply keyboard away first.
    if (step === "phone" && res.next !== "phone") {
      await send(user.id, res.draft.phone && res.next === "confirm" ? "✅ Raqam qabul qilindi." : BACK_TEXT, {
        remove_keyboard: true,
      })
    }
    const q = question(res.next, res.draft)
    store.setStep(user.id, res.next, res.draft)
    if (cb && "inline_keyboard" in q.markup) {
      try {
        await edit(user.id, cb.message, q.text, q.markup)
        return
      } catch {
        // Too old to edit: send it as a new message below.
      }
    } else if (cb) {
      await api.call("editMessageReplyMarkup", { chat_id: user.id, message_id: cb.message }).catch(() => {})
    }
    await send(user.id, q.text, q.markup)
  }

  async function finish(user: User, d: Draft, message?: number) {
    if (!complete(d)) return startForm(user)
    const isNew = store.saveLead({
      user_id: user.id,
      first_name: d.firstName,
      last_name: d.lastName,
      middle_name: d.middleName,
      grade: d.grade,
      region: REGIONS[d.region]?.name ?? "",
      district: d.district,
      is_student: d.isStudent ? 1 : 0,
      branch: d.isStudent ? (d.branch ?? null) : null,
      phone: d.phone,
    })
    store.setStep(user.id, null)
    log(`${isNew ? "new" : "updated"} lead from bot: ${user.id}`)
    const done = `✅ <b>Ma’lumotlaringiz qabul qilindi!</b>\n\n${summary(d)}`
    if (message) await edit(user.id, message, done).catch(() => send(user.id, done))
    else await send(user.id, done)

    const row = store.leadRow(user.id)
    if (row) for (const a of cfg.admins) void notify(a, leadCard(row, isNew))

    await send(
      user.id,
      isNew
        ? "🙏 Rahmat! Inspiring Education mutaxassislari siz bilan bog‘lanishadi."
        : "🙏 Rahmat! Ma’lumotlaringiz yangilandi.",
    )
    const fresh = store.user(user.id)!
    if (await gate(fresh, true)) await showMenu(fresh, isNew)
  }

  // ------------------------------------------------------------------ screens
  async function showMenu(user: User, intro = false) {
    const text = intro
      ? [
          "🏠 <b>Asosiy menyu</b>",
          "",
          `🔒 Do‘stlaringizni taklif qiling: <b>${cfg.goal} ta</b> do‘st qo‘shilsa, maxsus <b>yopiq kurslar</b> ochiladi.`,
        ].join("\n")
      : "🏠 <b>Asosiy menyu</b>"
    await send(user.id, text, menuKeyboard)
  }

  async function showMe(user: User) {
    const l = store.lead(user.id)
    if (!l) return startForm(user)
    const d: Draft = {
      firstName: l.first_name,
      lastName: l.last_name,
      middleName: l.middle_name,
      grade: l.grade,
      region: Math.max(
        REGIONS.findIndex((r) => r.name === l.region),
        0,
      ),
      district: l.district,
      isStudent: Boolean(l.is_student),
      branch: l.branch ?? undefined,
      phone: l.phone,
    }
    await send(user.id, `📝 <b>Ma’lumotlaringiz</b>\n\n${summary(d)}`, {
      inline_keyboard: [[{ text: "✏️ O‘zgartirish", callback_data: "f:edit" }]],
    })
  }

  const contactText = () =>
    [
      "📞 <b>Inspiring Education</b>",
      "",
      `☎️ ${CONTACT.phone}`,
      `🌐 ${cfg.site}`,
      `📢 Telegram: ${CONTACT.handle}`,
      `📸 Instagram: ${CONTACT.instagram.replace("https://", "")}`,
    ].join("\n")

  async function sendExcel(chat: number | string, since = 0, caption?: string) {
    const rows = store.leads(since)
    if (!rows.length) return notify(chat, since ? "Bugun yangi lid yo‘q." : "Hozircha lid yo‘q.")
    const data = leadsWorkbook(rows)
    const name = fileName(since ? "lidlar_bugun" : "lidlar", Date.now())
    return api
      .sendFile(String(chat), { name, data, type: XLSX_TYPE }, caption ?? `📥 Barcha lidlar: <b>${rows.length}</b> ta`)
      .catch((e) => log(`excel → ${chat}: ${(e as Error).message}`))
  }

  // ------------------------------------------------------------------ dispatch
  async function onMessage(m: NonNullable<Update["message"]>) {
    const text = (m.text ?? "").trim()
    if (/^\/id(@\w+)?$/.test(text)) {
      return send(m.chat.id, `🆔 Chat ID: <code>${m.chat.id}</code>`)
    }
    if (m.chat.type !== "private" || !m.from) return
    const from = m.from
    const start = text.match(/^\/start(?:\s+(\S+))?$/)

    if (isAdmin(from.id)) {
      if (start) {
        return send(
          from.id,
          [
            `<b>Assalomu alaykum, ${esc(from.first_name ?? "admin")}!</b> 👋 Siz bot administratorisiz.`,
            "",
            "Yangi lidlar shu yerga darhol keladi.",
            `📥 /excel — barcha lidlar Excel faylda`,
            `📊 /stats — statistika`,
            cfg.reportHour !== null ? `🕗 Har kuni ${cfg.reportHour}:00 da kunlik hisobot keladi.` : "",
            "",
            "Foydalanuvchi sifatida sinab ko‘rish: /anketa, menyu: /menu",
            `🆔 Chat ID: <code>${from.id}</code>`,
          ]
            .filter((l, i, a) => l || a[i - 1])
            .join("\n"),
          adminKeyboard,
        )
      }
      if (text === "/excel" || text === ADMIN.excel) return sendExcel(from.id)
      if (text === "/stats" || text === ADMIN.stats) return send(from.id, statsText(store), adminKeyboard)
    }

    // Referral: only a person new to the bot can be invited, and not by themselves.
    const ref = Number(start?.[1]?.match(/^ref_(\d+)$/)?.[1])
    const referrer = ref && ref !== from.id && store.user(ref) ? ref : null
    const isNew = store.addUser(from.id, from.username ?? null, nameOf(from), referrer)
    store.touch(from.id, from.username ?? null, nameOf(from))
    let user = store.user(from.id)!

    if (text === "/anketa") {
      store.setStep(from.id, null)
      return startForm(user)
    }

    if (start) {
      if (isNew) {
        await send(
          from.id,
          [
            `<b>Assalomu alaykum, ${esc(from.first_name ?? "")}!</b> 👋`,
            "",
            "<b>Inspiring Education</b> — Prezident va ixtisoslashtirilgan maktablarga tayyorlov markazi botiga xush kelibsiz.",
            "",
            "📝 Qisqa anketani to‘ldiring (1 daqiqa) — mutaxassislarimiz siz bilan bog‘lanishadi.",
            `🔒 So‘ng do‘stlaringizni taklif qilib, <b>yopiq kurslarga</b> kirish huquqini oling.`,
          ].join("\n"),
        )
        if (referrer) log(`invited ${from.id} by ${referrer}`)
      }
      if (isStep(user.step)) {
        const q = question(user.step, draftOf(user))
        return send(from.id, `Anketani davom ettiramiz 👇\n\n${q.text}`, q.markup)
      }
      if (!store.lead(from.id)) return startForm(user)
      if (await gate(user)) {
        if (start[1] === "closed") {
          const s = await closedScreen(user)
          return send(from.id, s.text, s.markup)
        }
        await showMenu(user)
      }
      return
    }

    if (isStep(user.step)) {
      if (m.contact) return onForm(user, { contact: m.contact.phone_number })
      if (m.text) return onForm(user, { text: m.text })
      return send(from.id, "⚠️ Iltimos, javobni matn ko‘rinishida yuboring.")
    }
    if (!store.lead(from.id)) return startForm(user)

    if (!(await gate(user))) return
    user = store.user(from.id)!
    switch (text) {
      case MENU.closed:
      case "/closed": {
        const s = await closedScreen(user)
        return send(from.id, s.text, s.markup)
      }
      case MENU.friends:
        return send(from.id, await friendsScreen(user))
      case MENU.me:
        return showMe(user)
      case MENU.contact:
        return send(from.id, contactText(), menuKeyboard)
      default:
        return showMenu(user)
    }
  }

  async function onCallback(c: NonNullable<Update["callback_query"]>) {
    const data = c.data ?? ""
    const done = (text?: string, alert = false) =>
      api.call("answerCallbackQuery", { callback_query_id: c.id, ...(text ? { text, show_alert: alert } : {}) })
    store.addUser(c.from.id, c.from.username ?? null, nameOf(c.from), null)
    let user = store.user(c.from.id)!
    const message = c.message?.message_id

    if (data === "f:edit") {
      await done()
      store.setStep(user.id, null)
      return startForm(user)
    }
    if (data.startsWith("f:")) {
      if (!isStep(user.step)) return done("Anketa allaqachon yakunlangan.")
      return onForm(user, { data }, message ? { id: c.id, message } : undefined)
    }
    if (data === "sub:check") {
      const ok = await subscribed(user.id, true)
      if (ok === false)
        return done("Siz hali kanalga obuna bo‘lmagansiz. Avval obuna bo‘ling, so‘ng qayta bosing.", true)
      await done("✅ Obuna tasdiqlandi!")
      if (message) await edit(user.id, message, "✅ Obuna tasdiqlandi. Rahmat!").catch(() => {})
      if (ok) await credit(user)
      if (!store.lead(user.id)) return startForm(user)
      return showMenu(store.user(user.id)!, true)
    }
    if (!store.lead(user.id)) {
      await done()
      return startForm(user)
    }
    if (data === "cl:show") {
      if (!(await subscribed(user.id))) {
        await done()
        return send(user.id, subscribePrompt(), subscribeMarkup)
      }
      user = store.user(user.id)!
      const s = await closedScreen(user)
      await done("Yangilandi")
      if (message) return edit(user.id, message, s.text, s.markup).catch(() => {})
      return send(user.id, s.text, s.markup)
    }
    if (data === "cl:open") {
      if ((await subscribed(user.id, true)) === false) {
        await done()
        return send(user.id, subscribePrompt(), subscribeMarkup)
      }
      return openClosed(store.user(user.id)!, c.id)
    }
    return done()
  }

  return {
    async handle(u: Update) {
      if (u.message) return void (await onMessage(u.message))
      if (u.callback_query) return void (await onCallback(u.callback_query))
      if (u.chat_join_request) return void (await onJoinRequest(u.chat_join_request))
    },

    /** Call every minute: sends the daily report once, at cfg.reportHour Tashkent time. */
    async tick(now = Date.now()) {
      if (cfg.reportHour === null || tashkentHour(now) !== cfg.reportHour) return
      const day = String(tashkentDay(now))
      if (store.meta("daily_report") === day) return
      store.setMeta("daily_report", day)
      const today = store.leads(tashkentDay(now)).length
      for (const a of cfg.admins) {
        await notify(a, `🕗 <b>Kunlik hisobot</b>\n\n${statsText(store, now)}`)
        if (today) await sendExcel(a, tashkentDay(now), `📥 Bugungi lidlar: <b>${today}</b> ta. Hammasi: /excel`)
      }
    },
  }
}

const BACK_TEXT = "⬅️"
