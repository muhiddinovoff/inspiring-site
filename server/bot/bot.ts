/**
 * The user side of the Telegram bot.
 *
 *  1. Lead: /start → short form (name, surname, father’s name, grade, region → city/district buttons, whether they
 *     already study at Inspiring Education → branch, phone). People who don't study with us yet are leads: their
 *     card goes to the call centre only, with status buttons. Website applications arrive the same way.
 *  2. Required channel: the menu opens only after subscribing to the channel (@inspiringuz).
 *  3. Menu for registered users: 🎓 online lesson (unlocked by inviting friends), results, courses, branches,
 *     consultation request, weekly referral rating, friends, social links.
 *  4. Online lesson: each user has a referral link. A friend counts once they are new to the bot, finished the form
 *     and subscribed. At the goal (5) the bot gives a personal join-request link to the private channel: it approves
 *     only users who earned it, so passing the link on lets nobody else in.
 *  5. Marketing: ad links (/start src_…) show which post or page brings people; unfinished forms get one reminder.
 */
import type { Lead as SiteForm } from "../lead.ts"
import type { Telegram, Update } from "../telegram.ts"
import { createAdmin } from "./admin.ts"
import { CONTACT } from "../../src/data/site.ts"
import { branchesText, coursesText, resultsText, socialButtons, socialText } from "./content.ts"
import { isStatus, STATUSES, type Store, type User } from "./db.ts"
import { answer, type Button, complete, type Draft, isStep, type Markup, question, type Step, summary } from "./form.ts"
import {
  type CardKind,
  fileName,
  isLead,
  leadCard,
  leadsWorkbook,
  siteCard,
  statsText,
  statusButtons,
  tashkentDay,
  tashkentHour,
  XLSX_TYPE,
} from "./report.ts"
import { REGIONS } from "./regions.ts"
import { type BotConfig, settingsStore } from "./settings.ts"

export type { BotConfig } from "./settings.ts"

export type Api = Pick<Telegram, "call" | "sendFile">

export const MENU = {
  online: "🎓 Online darsga qo‘shilish",
  results: "🏆 Natijalarimiz",
  courses: "📚 Kurslar",
  consult: "📞 Konsultatsiya olish",
  branches: "📍 Filiallar",
  friends: "👥 Do‘stlarim",
  rating: "🏅 Reyting",
  me: "📝 Ma’lumotlarim",
  social: "🌐 Biz bilan bog‘lanish",
} as const

const menuKeyboard: Markup = {
  keyboard: [
    [{ text: MENU.online }],
    [{ text: MENU.results }, { text: MENU.courses }],
    [{ text: MENU.consult }, { text: MENU.branches }],
    [{ text: MENU.friends }, { text: MENU.rating }],
    [{ text: MENU.me }, { text: MENU.social }],
  ],
  resize_keyboard: true,
  is_persistent: true,
}
/** Older button texts people may still have on screen. */
const OLD_MENU: Record<string, string> = {
  "🔒 Yopiq kurslar": MENU.online,
  "👥 Mening referallarim": MENU.friends,
  "📞 Aloqa": MENU.social,
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const nameOf = (f: { first_name?: string; last_name?: string }) =>
  [f.first_name, f.last_name].filter(Boolean).join(" ").slice(0, 80)
export const progress = (n: number, goal: number) => {
  const k = Math.min(n, goal)
  return `${"🟢".repeat(k)}${"⚪️".repeat(goal - k)} <b>${n}/${goal}</b>`
}
const MEMBER = new Set(["creator", "administrator", "member"])
/** Monday 00:00 in Tashkent of the week `ms` falls in. */
const weekStart = (ms: number) => {
  const day = tashkentDay(ms)
  const weekday = (new Date(day + 5 * 3_600_000).getUTCDay() + 6) % 7
  return day - weekday * 86_400_000
}

export function createBot(api: Api, store: Store, env: BotConfig, log: (m: string) => void) {
  const settings = settingsStore(store, env)
  /** Current settings: the admin panel can change them at any time. */
  const cfg = () => settings.get()
  let self: { id: number; username: string } | undefined
  const me = async () => (self ??= await api.call<{ id: number; username: string }>("getMe", {}))
  const username = async () => (await me()).username
  const refLink = async (id: number) => `https://t.me/${await username()}?start=ref_${id}`
  const isAdmin = (id: number) => cfg().admins.includes(String(id))
  const isCallCenter = (id: number) => cfg().callCenter.includes(String(id))

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
  /** To the call centre only: leads, consultation requests, the daily report. */
  const toCallCenter = (text: string, markup?: Markup) =>
    Promise.allSettled(cfg().callCenter.map((c) => send(c, text, markup))).then((r) => {
      r.forEach((x, i) => x.status === "rejected" && log(`call centre ${cfg().callCenter[i]}: ${x.reason}`))
      return r.filter((x) => x.status === "fulfilled").length
    })

  // ------------------------------------------------------------------ channel membership
  let warned = false
  const subCache = new Map<string, { ok: boolean; at: number }>()
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
        for (const a of cfg().mainAdmins) {
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
    if (!cfg().channel) return true
    const key = `${cfg().channel}:${user}`
    const c = subCache.get(key)
    if (!fresh && c?.ok && Date.now() - c.at < 10 * 60_000) return true
    const ok = await member(cfg().channel, user)
    if (ok !== null) subCache.set(key, { ok, at: Date.now() })
    if (subCache.size > 50_000) subCache.clear()
    return ok
  }

  const subscribePrompt = () =>
    [
      `📢 Davom etish uchun rasmiy kanalimiz <b>${esc(cfg().channelTitle)}</b> ga obuna bo‘ling.`,
      "",
      "U yerda natijalar, foydali darslar va e’lonlar chiqadi. Obuna bo‘lgach, «✅ Obunani tekshirish» tugmasini bosing.",
    ].join("\n")
  const subscribeMarkup = (): Markup => ({
    inline_keyboard: [
      [{ text: "📢 Kanalga o‘tish", url: cfg().channelUrl || CONTACT.telegram }],
      [{ text: "✅ Obunani tekshirish", callback_data: "sub:check" }],
    ],
  })

  /** Lets the user into the menu only when subscribed; counts them for their referrer on the way. */
  async function gate(user: User, fresh = false) {
    const ok = await subscribed(user.id, fresh)
    if (ok === false) {
      await send(user.id, subscribePrompt(), subscribeMarkup())
      return false
    }
    if (ok === true) await credit(user)
    return true
  }

  // ------------------------------------------------------------------ referrals
  async function credit(user: User) {
    if (!user.referrer_id || user.credited_at || !store.lead(user.id)) return
    if (!store.credit(user.id)) return
    const goal = cfg().goal
    const n = store.credited(user.referrer_id).length
    const lead = store.lead(user.id)
    const who = esc(lead ? `${lead.first_name} ${lead.last_name}` : user.name)
    log(`referral ${user.id} → ${user.referrer_id} (${n})`)
    const lines = [`🎉 Do‘stingiz <b>${who}</b> taklifingiz bilan qo‘shildi!`, "", progress(n, goal)]
    if (n === goal) {
      lines.push("", "🎓 <b>Tabriklaymiz! Online darsga qo‘shilish huquqini oldingiz.</b>")
      await notify(user.referrer_id, lines.join("\n"), {
        inline_keyboard: [[{ text: "🎓 Online darsga qo‘shilish", callback_data: "cl:open" }]],
      })
    } else {
      if (n < goal) lines.push(`Yana <b>${goal - n}</b> ta do‘st — va online darsga qo‘shilasiz.`)
      await notify(user.referrer_id, lines.join("\n"))
    }
  }

  const shareUrl = (link: string) =>
    `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
      "🎓 Inspiring Education — Prezident va ixtisoslashtirilgan maktablarga tayyorlov. Botga qo‘shiling: natijalar, kurslar va maxsus online dars 👇",
    )}`

  async function onlineScreen(user: User) {
    const goal = cfg().goal
    const n = store.credited(user.id).length
    const link = await refLink(user.id)
    const open = n >= goal || user.unlocked_at
    const text = [
      "🎓 <b>Online darsga qo‘shilish</b>",
      "",
      "Inspiring Education ustozlarining maxsus online darslari — faqat taklif orqali kiriladigan yopiq kanalda.",
      "",
      `Qo‘shilish uchun <b>${goal} ta do‘stingizni</b> taklif qiling. Do‘stingiz hisoblanadi, agar u:`,
      "1) botga sizning havolangiz orqali birinchi marta kirsa,",
      "2) anketani to‘ldirsa,",
      ...(cfg().channel ? [`3) ${esc(cfg().channelTitle)} kanaliga obuna bo‘lsa.`] : []),
      "",
      `Hisob: ${progress(n, goal)}`,
      "",
      `🔗 Sizning havolangiz:\n${link}`,
      "",
      "💡 Havolani sinfdoshlar va ota-onalar guruhlariga yuboring — eng tez yo‘l.",
    ].join("\n")
    const kb: Button[][] = [
      ...(open ? [[{ text: "🎓 Online darsga kirish", callback_data: "cl:open" }]] : []),
      [{ text: "📤 Do‘stlarga yuborish", url: shareUrl(link) }],
      [
        { text: "👥 Do‘stlarim", callback_data: "u:friends" },
        { text: "🔄 Yangilash", callback_data: "cl:show" },
      ],
    ]
    return { text, markup: { inline_keyboard: kb } as Markup }
  }

  function friendsText(user: User) {
    const list = store.invited(user.id)
    const n = list.filter((f) => f.credited_at).length
    const rows = list.slice(-30).map((f) => {
      const name = esc(f.lead || f.name || `ID ${f.id}`)
      return f.credited_at
        ? `✅ ${name}`
        : `⏳ ${name} — ${f.lead ? "kanalga obuna bo‘lmagan" : "anketani to‘ldirmagan"}`
    })
    return [
      "👥 <b>Do‘stlarim</b>",
      "",
      `Hisob: ${progress(n, cfg().goal)}`,
      "",
      rows.length
        ? rows.join("\n")
        : `Hali hech kim taklifingiz bilan kirmagan. «${MENU.online}» bo‘limidan havolangizni oling.`,
      ...(list.length > 30 ? ["", `… jami ${list.length} ta`] : []),
      ...(rows.some((r) => r.startsWith("⏳"))
        ? ["", "⏳ belgili do‘stlaringizga anketani tugatish va kanalga obuna bo‘lishni eslating."]
        : []),
    ].join("\n")
  }

  function ratingText(user: User, now = Date.now()) {
    const since = weekStart(now)
    const top = store.leaders(since, 10)
    const mine = store.leaders(since, 10_000).findIndex((r) => r.id === user.id)
    const medal = ["🥇", "🥈", "🥉"]
    return [
      "🏅 <b>Haftalik reyting</b> — eng ko‘p do‘st taklif qilganlar",
      "",
      ...(top.length
        ? top.map(
            (r, i) => `${medal[i] ?? `${i + 1}.`} ${esc(r.name)} — <b>${r.n}</b>${r.id === user.id ? " ← siz" : ""}`,
          )
        : ["Bu hafta hali hech kim do‘st taklif qilmagan — birinchi bo‘ling!"]),
      "",
      mine >= 10 ? `Sizning o‘rningiz: <b>${mine + 1}</b>` : mine < 0 ? "Siz hali reytingda yo‘qsiz." : "",
      "Reyting har dushanba yangilanadi.",
    ]
      .filter((l, i, a) => l || a[i - 1])
      .join("\n")
  }

  async function openClosed(user: User, cbId: string) {
    const goal = cfg().goal
    if (!cfg().closedChannel) {
      return api.call("answerCallbackQuery", {
        callback_query_id: cbId,
        text: "Online dars kanali tez orada ochiladi. Hisobingiz saqlanadi.",
        show_alert: true,
      })
    }
    if (!user.unlocked_at) {
      // Recount: friends who left the channel since they were counted don't count now.
      let active = 0
      for (const id of store.credited(user.id)) {
        if ((await subscribed(id, true)) !== false) active++
        if (active >= goal) break
      }
      if (active < goal) {
        await api.call("answerCallbackQuery", { callback_query_id: cbId })
        return send(
          user.id,
          `Hozir faol do‘stlaringiz: ${progress(active, goal)}\n\nBa’zi do‘stlaringiz ${esc(cfg().channelTitle)} kanalidan chiqib ketgan. Ularni qaytarish yoki yangi do‘st taklif qilish kerak.`,
        )
      }
      store.unlock(user.id)
      log(`unlocked ${user.id}`)
    }
    await api.call("answerCallbackQuery", { callback_query_id: cbId })
    if ((await member(cfg().closedChannel, user.id)) === true) {
      return send(user.id, "✅ Siz allaqachon online dars kanalidasiz.")
    }
    const now = Date.now()
    let link = user.invite_link
    if (!link || !user.invite_expires || user.invite_expires < now + 10 * 60_000) {
      const expires = now + 24 * 3_600_000
      const res = await api.call<{ invite_link: string }>("createChatInviteLink", {
        chat_id: cfg().closedChannel,
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
        "🎓 <b>Online dars kanaliga havolangiz tayyor!</b>",
        "",
        "Tugmani bosing va «Qo‘shilish so‘rovi»ni yuboring — bot uni darhol tasdiqlaydi.",
        "",
        "🔐 Havola shaxsiy: faqat siz kira olasiz, boshqa odamning so‘rovi rad etiladi. 24 soat amal qiladi.",
      ].join("\n"),
      { inline_keyboard: [[{ text: "➡️ Kanalga qo‘shilish", url: link }]] },
    )
  }

  async function onJoinRequest(r: NonNullable<Update["chat_join_request"]>) {
    const closed = cfg().closedChannel
    const ids = [String(r.chat.id), r.chat.username ? `@${r.chat.username}` : ""]
    if (!closed || !ids.includes(closed)) return
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
      await notify(dm, "🎉 <b>Xush kelibsiz!</b> Siz online dars kanaliga qo‘shildingiz.")
    } else {
      await api.call("declineChatJoinRequest", { chat_id: r.chat.id, user_id: r.from.id })
      log(`declined closed channel: ${r.from.id}`)
      await notify(
        dm,
        [
          "🔒 Bu havola sizga tegishli emas, shuning uchun so‘rov rad etildi.",
          "",
          `Online darsga qo‘shilish uchun botda <b>${cfg().goal} ta do‘stingizni</b> taklif qiling — shunda sizga shaxsiy havola beriladi.`,
        ].join("\n"),
        { inline_keyboard: [[{ text: "🤖 Botni ochish", url: `https://t.me/${await username()}?start=online` }]] },
      )
    }
  }

  // ------------------------------------------------------------------ leads → call centre
  function cardMarkup(id: number): Markup | undefined {
    const l = store.lead(id)
    return l ? { inline_keyboard: statusButtons("b", id, l.status) } : undefined
  }
  async function sendLeadCard(id: number, kind: CardKind) {
    const row = store.leadRow(id)
    if (!row || !isLead(row)) return 0
    return toCallCenter(leadCard(row, kind, store), cardMarkup(id))
  }

  /** An application from the website form: saved, then sent to the call centre. Returns how many got it. */
  async function siteLead(f: SiteForm, now = Date.now()) {
    const id = store.addSiteLead({
      first_name: f.firstName,
      last_name: f.lastName,
      phone: f.phone,
      lang: f.lang,
      lat: f.location?.lat ?? null,
      lng: f.location?.lng ?? null,
      accuracy: f.location?.accuracy ?? null,
      nearest: f.nearest?.name ?? null,
      nearest_km: f.nearest?.km ?? null,
      page: f.page ?? null,
      created_at: now,
    })
    const card = siteCard(store.siteLead(id)!)
    return toCallCenter(card.text, { inline_keyboard: card.buttons })
  }

  /** A call-centre button under a lead card: ld:<b|s>:<id>:<status>. */
  async function onStatus(c: NonNullable<Update["callback_query"]>) {
    const [, kind, idRaw, status] = (c.data ?? "").split(":")
    const id = Number(idRaw)
    const who = c.from.id
    if (!isCallCenter(who) && !isAdmin(who)) {
      return api.call("answerCallbackQuery", { callback_query_id: c.id })
    }
    if ((kind !== "b" && kind !== "s") || !isStatus(status)) {
      return api.call("answerCallbackQuery", { callback_query_id: c.id })
    }
    const by = nameOf(c.from) || String(who)
    if (!store.setStatus(kind, id, status, by)) {
      return api.call("answerCallbackQuery", { callback_query_id: c.id, text: "Lid topilmadi", show_alert: true })
    }
    log(`lead ${kind}${id} → ${status} by ${who}`)
    await api.call("answerCallbackQuery", { callback_query_id: c.id, text: STATUSES[status] })
    const msg = c.message?.message_id
    if (!msg) return
    let text = ""
    let markup: Markup
    if (kind === "b") {
      const row = store.leadRow(id)!
      const head = c.message?.text?.startsWith("🔥") ? "consult" : "new"
      text = leadCard(row, head, store)
      markup = cardMarkup(id)!
    } else {
      const card = siteCard(store.siteLead(id)!)
      text = card.text
      markup = { inline_keyboard: card.buttons }
    }
    await edit(c.message!.chat.id, msg, text, markup).catch(() => {})
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
      await send(user.id, res.draft.phone && res.next === "confirm" ? "✅ Raqam qabul qilindi." : "⬅️", {
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
    const prev = store.saveLead({
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
    const isNew = !prev
    store.setStep(user.id, null)
    log(`${isNew ? "new" : "updated"} form from bot: ${user.id}${d.isStudent ? " (Inspiring student)" : ""}`)
    const done = `✅ <b>Ma’lumotlaringiz qabul qilindi!</b>\n\n${summary(d)}`
    if (message) await edit(user.id, message, done).catch(() => send(user.id, done))
    else await send(user.id, done)

    // Only people who don't study with us yet are leads, and only the call centre gets them.
    if (!d.isStudent) await sendLeadCard(user.id, !prev || !isLead(prev) ? "new" : "updated")

    await send(
      user.id,
      isNew
        ? d.isStudent
          ? "🙏 Rahmat! Inspiring oilasiga xush kelibsiz."
          : "🙏 Rahmat! Inspiring Education mutaxassislari siz bilan tez orada bog‘lanishadi."
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
          `🎓 <b>Online darsga qo‘shiling:</b> ${cfg().goal} ta do‘stingizni taklif qiling — maxsus online darslar kanali ochiladi.`,
          "🏆 Natijalarimiz, 📚 kurslar va 📍 filiallar bilan tanishing.",
          "📞 Savolingiz bo‘lsa — «Konsultatsiya olish», mutaxassis qo‘ng‘iroq qiladi.",
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

  async function consult(user: User) {
    const last = Number(store.meta(`consult:${user.id}`) ?? 0)
    if (Date.now() - last < 6 * 3_600_000) {
      return send(user.id, "✅ So‘rovingiz qabul qilingan. Mutaxassisimiz tez orada qo‘ng‘iroq qiladi.")
    }
    return send(
      user.id,
      `📞 <b>Konsultatsiya</b>\n\nMutaxassisimiz farzandingizga mos kurs, narx va jadval haqida aytib beradi.\n\nQo‘ng‘iroq qilishimiz uchun tasdiqlang. Yoki o‘zingiz qo‘ng‘iroq qiling: ${CONTACT.phone}`,
      { inline_keyboard: [[{ text: "✅ Qo‘ng‘iroq qiling", callback_data: "u:consult" }]] },
    )
  }

  async function sendExcel(chat: number | string, since = 0, caption?: string) {
    const rows = store.leads(since)
    const site = store.siteLeads(since)
    if (!rows.length && !site.length) {
      return notify(chat, since ? "Bu davrda lid yo‘q." : "Hozircha lid yo‘q.")
    }
    const data = leadsWorkbook(rows, site, store)
    const name = fileName(since ? "lidlar_davr" : "lidlar", Date.now())
    return api
      .sendFile(
        String(chat),
        { name, data, type: XLSX_TYPE },
        caption ?? `📥 Lidlar: bot <b>${rows.filter(isLead).length}</b>, sayt <b>${site.length}</b>`,
      )
      .catch((e) => log(`excel → ${chat}: ${(e as Error).message}`))
  }

  const admin = createAdmin({ api, store, settings, send, edit, notify, sendExcel, me, log })

  // ------------------------------------------------------------------ dispatch
  async function onMessage(m: NonNullable<Update["message"]>) {
    const text = (m.text ?? "").trim()
    if (/^\/id(@\w+)?$/.test(text)) {
      return send(m.chat.id, `🆔 Chat ID: <code>${m.chat.id}</code>`)
    }
    if (m.chat.type !== "private" || !m.from) return
    const from = m.from
    const start = text.match(/^\/start(?:\s+(\S+))?$/)

    if (isAdmin(from.id) && (await admin.onMessage(m))) return

    // Referral: only a person new to the bot can be invited, and not by themselves.
    const payload = start?.[1] ?? ""
    const ref = Number(payload.match(/^ref_(\d+)$/)?.[1])
    const referrer = ref && ref !== from.id && store.user(ref) ? ref : null
    const ad = payload.match(/^src_([a-z0-9_]{1,40})$/)?.[1]
    const source = referrer ? "referral" : ad && store.sourceName(ad) ? ad : null
    const isNew = store.addUser(from.id, from.username ?? null, nameOf(from), referrer, source)
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
            "📝 Qisqa anketani to‘ldiring (1 daqiqa) — shundan so‘ng:",
            `🎓 do‘stlaringizni taklif qilib, <b>online darsga</b> qo‘shilasiz;`,
            "🏆 natijalarimiz, 📚 kurslar va 📍 filiallar bilan tanishasiz;",
            "📞 mutaxassisdan konsultatsiya olasiz.",
          ].join("\n"),
        )
        if (referrer) log(`invited ${from.id} by ${referrer}`)
        if (source && source !== "referral") log(`ad link ${source}: ${from.id}`)
      }
      if (isStep(user.step)) {
        const q = question(user.step, draftOf(user))
        return send(from.id, `Anketani davom ettiramiz 👇\n\n${q.text}`, q.markup)
      }
      if (!store.lead(from.id)) return startForm(user)
      if (await gate(user)) {
        if (payload === "online" || payload === "closed") {
          const s = await onlineScreen(store.user(from.id)!)
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
    switch (OLD_MENU[text] ?? text) {
      case MENU.online:
      case "/online":
      case "/closed": {
        const s = await onlineScreen(user)
        return send(from.id, s.text, s.markup)
      }
      case MENU.friends:
        return send(from.id, friendsText(user))
      case MENU.rating:
        return send(from.id, ratingText(user))
      case MENU.results:
        return send(from.id, resultsText(), {
          inline_keyboard: [[{ text: "📞 Farzandim uchun konsultatsiya", callback_data: "u:consult" }]],
        })
      case MENU.courses:
        return send(from.id, coursesText(), {
          inline_keyboard: [[{ text: "📞 Narx va jadvalni bilish", callback_data: "u:consult" }]],
        })
      case MENU.branches:
        return send(from.id, branchesText())
      case MENU.consult:
        return consult(user)
      case MENU.me:
        return showMe(user)
      case MENU.social:
        return send(from.id, socialText(cfg().site), { inline_keyboard: socialButtons(cfg().site) })
      default:
        return showMenu(user)
    }
  }

  async function onCallback(c: NonNullable<Update["callback_query"]>) {
    const data = c.data ?? ""
    if (data.startsWith("ld:")) return onStatus(c)
    if (data.startsWith("a:")) {
      if (isAdmin(c.from.id)) return admin.onCallback(c)
      return void (await api.call("answerCallbackQuery", { callback_query_id: c.id }))
    }
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
    if (data === "u:consult") {
      const last = Number(store.meta(`consult:${user.id}`) ?? 0)
      if (Date.now() - last < 6 * 3_600_000) {
        return done("So‘rovingiz allaqachon qabul qilingan — tez orada qo‘ng‘iroq qilamiz.", true)
      }
      store.setMeta(`consult:${user.id}`, String(Date.now()))
      const l = store.lead(user.id)!
      if (l.status !== "new") store.setStatus("b", user.id, "new", "")
      const delivered = l.is_student
        ? await toCallCenter(
            leadCard(store.leadRow(user.id)!, "consult", store).replace(
              "🔥 Konsultatsiya so‘radi",
              "🔥 Konsultatsiya so‘radi (Inspiring o‘quvchisi)",
            ),
          )
        : await sendLeadCard(user.id, "consult")
      log(`consult request ${user.id} → ${delivered}`)
      await done("✅ So‘rov yuborildi")
      const t = "✅ <b>So‘rovingiz qabul qilindi!</b> Mutaxassisimiz tez orada qo‘ng‘iroq qiladi."
      if (message) return edit(user.id, message, t).catch(() => send(user.id, t))
      return send(user.id, t)
    }
    if (data === "u:friends") {
      await done()
      return send(user.id, friendsText(user))
    }
    if (data === "cl:show") {
      if (!(await subscribed(user.id))) {
        await done()
        return send(user.id, subscribePrompt(), subscribeMarkup())
      }
      user = store.user(user.id)!
      const s = await onlineScreen(user)
      await done("Yangilandi")
      if (message) return edit(user.id, message, s.text, s.markup).catch(() => {})
      return send(user.id, s.text, s.markup)
    }
    if (data === "cl:open") {
      if ((await subscribed(user.id, true)) === false) {
        await done()
        return send(user.id, subscribePrompt(), subscribeMarkup())
      }
      return openClosed(store.user(user.id)!, c.id)
    }
    return done()
  }

  /** One reminder to people who started the form an hour+ ago and stopped. */
  async function remind(now: number) {
    for (const u of store.toRemind(now)) {
      store.reminded(u.id, now)
      if (!isStep(u.step)) continue
      const q = question(u.step, draftOf(u))
      await notify(
        u.id,
        `👋 Anketani oxiriga yetkazmadingiz — bor-yo‘g‘i bir necha savol qoldi.\nTugatsangiz, online dars va boshqa imkoniyatlar ochiladi.\n\n${q.text}`,
        q.markup,
      )
    }
  }

  return {
    async handle(u: Update) {
      if (u.message) return void (await onMessage(u.message))
      if (u.callback_query) return void (await onCallback(u.callback_query))
      if (u.chat_join_request) return void (await onJoinRequest(u.chat_join_request))
      if (u.my_chat_member) return void (await admin.onMyChatMember(u.my_chat_member))
    },

    siteLead,

    /** Call every minute: form reminders, and the daily report once at reportHour (Tashkent) to the call centre. */
    async tick(now = Date.now()) {
      await remind(now).catch((e) => log(`remind: ${(e as Error).message}`))
      const hour = cfg().reportHour
      if (hour === null || tashkentHour(now) !== hour) return
      const day = String(tashkentDay(now))
      if (store.meta("daily_report") === day) return
      store.setMeta("daily_report", day)
      const since = tashkentDay(now)
      const today = store.leads(since).filter(isLead).length + store.siteLeads(since).length
      for (const a of cfg().callCenter) {
        await notify(a, `🕗 <b>Kunlik hisobot</b>\n\n${statsText(store, now)}`)
        if (today) await sendExcel(a, since, `📥 Bugungi lidlar: <b>${today}</b> ta. Hammasi: /excel`)
      }
    },

    settings,
  }
}
