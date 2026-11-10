/**
 * Admin panel: everything an admin needs without touching the server.
 *
 *  • Statistics and Excel (all leads, today, last 7 days).
 *  • Closed courses channel and the required channel: connected with Telegram's own "choose a channel" button —
 *    Telegram adds the bot there as an admin with the rights it needs. Also offered on its own when someone makes
 *    the bot an admin of a channel.
 *  • Number of friends for the closed courses, time of the daily report.
 *  • Broadcast any message (text, photo, video…) to all users or to those who filled in the form.
 *  • Find a user (ID, @username, phone, name): their form, referrals; open or take away the closed courses by hand.
 *  • Admins: main ones come from .env; they add and remove others here.
 */
import type { Update } from "../telegram.ts"
import type { Store } from "./db.ts"
import { type Markup, prettyPhone } from "./form.ts"
import { isLead, statsText, tashkentDay, when } from "./report.ts"
import type { SettingsStore } from "./settings.ts"

export type AdminContext = {
  api: { call: <T>(method: string, body: Record<string, unknown>) => Promise<T> }
  store: Store
  settings: SettingsStore
  send: (chat: number | string, text: string, markup?: Markup) => Promise<{ message_id: number }>
  edit: (chat: number, message: number, text: string, markup?: Markup) => Promise<unknown>
  notify: (chat: number | string, text: string, markup?: Markup) => Promise<unknown>
  sendExcel: (chat: number | string, since?: number, caption?: string) => Promise<unknown>
  me: () => Promise<{ id: number; username: string }>
  log: (m: string) => void
}

type Btn = { text: string; callback_data?: string; url?: string }
type Msg = NonNullable<Update["message"]>

export const ADMIN_BUTTONS = { panel: "⚙️ Admin panel", excel: "📥 Excel", stats: "📊 Statistika" } as const
const CANCEL = "❌ Bekor qilish"
export const adminKeyboard: Markup = {
  keyboard: [[{ text: ADMIN_BUTTONS.panel }], [{ text: ADMIN_BUTTONS.excel }, { text: ADMIN_BUTTONS.stats }]],
  resize_keyboard: true,
  is_persistent: true,
}

/** request_id of Telegram's chat/user pickers. */
const PICK = { closed: 1, required: 2, admin: 3 } as const

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const inline = (rows: Btn[][]): Markup => ({ inline_keyboard: rows })
const home: Btn = { text: "⬅️ Admin panel", callback_data: "a:home" }
const rows2 = <T>(items: T[], n = 2) =>
  Array.from({ length: Math.ceil(items.length / n) }, (_, i) => items.slice(i * n, i * n + n))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Rights the bot asks for in the channels (Telegram's ChatAdministratorRights: every field is required). */
const rights = (invite: boolean) => ({
  is_anonymous: false,
  can_manage_chat: true,
  can_delete_messages: false,
  can_manage_video_chats: false,
  can_restrict_members: invite,
  can_promote_members: false,
  can_change_info: false,
  can_invite_users: true,
  can_post_stories: false,
  can_edit_stories: false,
  can_delete_stories: false,
})

const pickChannel = (kind: "closed" | "required"): Markup =>
  ({
    keyboard: [
      [
        {
          text: kind === "closed" ? "🔒 Yopiq kanalni tanlash" : "📢 Majburiy kanalni tanlash",
          request_chat: {
            request_id: PICK[kind],
            chat_is_channel: true,
            request_title: true,
            request_username: true,
            user_administrator_rights: rights(kind === "closed"),
            bot_administrator_rights: rights(kind === "closed"),
          },
        },
      ],
      [{ text: CANCEL }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  }) as unknown as Markup

const pickAdmin: Markup = {
  keyboard: [
    [
      {
        text: "👤 Foydalanuvchini tanlash",
        request_users: { request_id: PICK.admin, user_is_bot: false, max_quantity: 1 },
      },
    ],
    [{ text: CANCEL }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
} as unknown as Markup

type State = { kind: "broadcast" | "find" | "addAdmin" | "pickClosed" | "pickRequired" }

export function createAdmin(ctx: AdminContext) {
  const { api, store, settings, send, edit, notify, log } = ctx
  const s = () => settings.get()
  const states = new Map<number, State>()
  /** Broadcast drafts: admin → the message they want to send. */
  const drafts = new Map<number, number>()
  let broadcasting = false

  // ------------------------------------------------------------------ channels
  /** Who the bot is in `chat`: can it see members and make invite links? */
  async function check(chat: string) {
    try {
      const me = await ctx.me()
      const [info, bot] = await Promise.all([
        api.call<{ id: number; title?: string; username?: string }>("getChat", { chat_id: chat }),
        api.call<{ status: string; can_invite_users?: boolean }>("getChatMember", { chat_id: chat, user_id: me.id }),
      ])
      const members = await api.call<number>("getChatMemberCount", { chat_id: chat }).catch(() => null)
      return {
        id: String(info.id),
        title: info.title ?? chat,
        username: info.username,
        admin: bot.status === "administrator" || bot.status === "creator",
        invite: bot.status === "creator" || Boolean(bot.can_invite_users),
        members,
      }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  async function connect(kind: "closed" | "required", chat: string, admin: number) {
    const c = await check(chat)
    if ("error" in c) {
      return send(
        admin,
        `❌ Kanalga ulanib bo‘lmadi: <code>${esc(c.error ?? "")}</code>\n\nBotni kanalga admin qilib, qayta urinib ko‘ring.`,
        adminKeyboard,
      )
    }
    if (!c.admin || (kind === "closed" && !c.invite)) {
      return send(
        admin,
        [
          `⚠️ Bot «${esc(c.title)}» kanalida ${c.admin ? "<b>«Foydalanuvchilarni qo‘shish»</b> huquqiga ega emas" : "<b>admin emas</b>"}.`,
          "",
          kind === "closed"
            ? "Kanal → Administratorlar → botni tanlang → «Foydalanuvchilarni taklif qilish / Invite users» ni yoqing, so‘ng qayta tanlang."
            : "Kanal → Administratorlar → botni qo‘shing, so‘ng qayta tanlang.",
        ].join("\n"),
        adminKeyboard,
      )
    }
    if (kind === "closed") {
      if (c.username) {
        await notify(
          admin,
          "ℹ️ Bu kanal ochiq (public). Yopiq kurslar uchun <b>private</b> kanal tavsiya etiladi — aks holda har kim havolasiz kira oladi.",
        )
      }
      settings.set({ closedChannel: c.id, closedTitle: c.title })
      log(`closed channel set: ${c.id} by ${admin}`)
    } else {
      let url = c.username ? `https://t.me/${c.username}` : ""
      if (!url) {
        const link = await api
          .call<{ invite_link: string }>("createChatInviteLink", { chat_id: c.id, name: "Majburiy obuna (bot)" })
          .catch(() => null)
        if (!link) return send(admin, "⚠️ Private kanal uchun botga «Invite users» huquqini bering.", adminKeyboard)
        url = link.invite_link
      }
      settings.set({ channel: c.id, channelTitle: c.username ? `@${c.username}` : c.title, channelUrl: url })
      log(`required channel set: ${c.id} by ${admin}`)
    }
    states.delete(admin)
    await send(
      admin,
      `✅ «${esc(c.title)}» ${kind === "closed" ? "yopiq kurslar kanali" : "majburiy obuna kanali"} sifatida ulandi.`,
      adminKeyboard,
    )
    return send(admin, ...(kind === "closed" ? await closedScreen() : await requiredScreen()))
  }

  // ------------------------------------------------------------------ screens
  type Screen = [string, Markup]

  function panel(): Screen {
    const st = s()
    const c = store.counts(tashkentDay(Date.now()))
    return [
      [
        "⚙️ <b>Admin panel</b>",
        "",
        `👥 Foydalanuvchilar: <b>${c.users}</b> (bugun +${c.users_today})`,
        `📝 Lidlar (Inspiring’da o‘qimaydi): <b>${c.leads}</b> (bugun +${c.leads_today})`,
        `🏫 Anketa to‘ldirgan o‘quvchilar: <b>${c.students}</b>`,
        "",
        `🔒 Yopiq kanal: ${st.closedChannel ? `<b>${esc(st.closedTitle)}</b> ✅` : "⚠️ <b>ulanmagan</b>"}`,
        `📢 Majburiy obuna: ${st.channel ? `<b>${esc(st.channelTitle)}</b> ✅` : "o‘chirilgan"}`,
        `🎯 Yopiq kurs uchun: <b>${st.goal}</b> ta do‘st`,
        `🕗 Kunlik hisobot: ${st.reportHour === null ? "o‘chirilgan" : `<b>${String(st.reportHour).padStart(2, "0")}:00</b>`}`,
      ].join("\n"),
      inline([
        [
          { text: "📊 Statistika", callback_data: "a:stats" },
          { text: "📥 Excel", callback_data: "a:xl" },
        ],
        [
          { text: "🔒 Yopiq kanal", callback_data: "a:cl" },
          { text: "📢 Majburiy kanal", callback_data: "a:rq" },
        ],
        [
          { text: "🎯 Referal soni", callback_data: "a:goal" },
          { text: "🕗 Hisobot vaqti", callback_data: "a:rep" },
        ],
        [
          { text: "📣 Xabar yuborish", callback_data: "a:bc" },
          { text: "🔍 Foydalanuvchi", callback_data: "a:find" },
        ],
        [{ text: "👮 Adminlar", callback_data: "a:adm" }],
      ]),
    ]
  }

  function stats(): Screen {
    const top = store.topRegions()
    const text = [
      statsText(store),
      ...(top.length
        ? ["", "<b>📍 Eng ko‘p lid kelgan hududlar:</b>", ...top.map((r, i) => `${i + 1}. ${esc(r.region)} — ${r.n}`)]
        : []),
    ].join("\n")
    return [text, inline([[{ text: "🔄 Yangilash", callback_data: "a:stats" }], [home]])]
  }

  async function closedScreen(): Promise<Screen> {
    const st = s()
    const c = store.counts(0)
    if (!st.closedChannel) {
      return [
        [
          "🔒 <b>Yopiq kurslar kanali</b> — ⚠️ ulanmagan",
          "",
          "Qanday ulanadi:",
          "1) Telegram’da <b>private</b> kanal oching (agar hali bo‘lmasa).",
          "2) Pastdagi «🔗 Kanalni ulash» → «🔒 Yopiq kanalni tanlash» ni bosib, kanalni tanlang.",
          "3) Telegram botni o‘zi admin qiladi (havola yaratish huquqi bilan) — tayyor.",
          "",
          "Kanal ulanmaguncha, 5 ta do‘st yig‘ganlarga «tez orada» deyiladi va hisobi saqlanadi.",
        ].join("\n"),
        inline([[{ text: "🔗 Kanalni ulash", callback_data: "a:cl:pick" }], [home]]),
      ]
    }
    const ch = await check(st.closedChannel)
    const status =
      "error" in ch
        ? `❌ Bot kanalga kira olmayapti: <code>${esc(ch.error ?? "")}</code>`
        : ch.invite
          ? "✅ Bot admin, havola yarata oladi"
          : "⚠️ Botda «Invite users» huquqi yo‘q — havola berib bo‘lmaydi"
    return [
      [
        "🔒 <b>Yopiq kurslar kanali</b>",
        "",
        `Kanal: <b>${esc(st.closedTitle)}</b> (<code>${esc(st.closedChannel)}</code>)`,
        status,
        ...("error" in ch || ch.members === null ? [] : [`👥 Kanal a’zolari: <b>${ch.members}</b>`]),
        `🔓 Huquq olganlar: <b>${c.unlocked}</b>, bot orqali kirganlar: <b>${c.joined}</b>`,
        "",
        "Har bir kishiga shaxsiy, so‘rovli havola beriladi: bot faqat huquqi borlarni qabul qiladi.",
      ].join("\n"),
      inline([
        [{ text: "🔄 Tekshirish", callback_data: "a:cl" }],
        [{ text: "🔁 Boshqa kanalga almashtirish", callback_data: "a:cl:pick" }],
        [{ text: "🔌 Uzish", callback_data: "a:cl:off" }],
        [home],
      ]),
    ]
  }

  async function requiredScreen(): Promise<Screen> {
    const st = s()
    if (!st.channel) {
      return [
        "📢 <b>Majburiy obuna</b> — o‘chirilgan\n\nFoydalanuvchilar kanalga obuna bo‘lmasdan menyudan foydalanadi, referallar obunasiz hisoblanadi.",
        inline([
          [{ text: "↩️ @inspiringuz ni yoqish", callback_data: "a:rq:def" }],
          [{ text: "🔗 Boshqa kanalni ulash", callback_data: "a:rq:pick" }],
          [home],
        ]),
      ]
    }
    const ch = await check(st.channel)
    const status =
      "error" in ch
        ? `❌ Bot a’zolarni tekshira olmayapti: <code>${esc(ch.error ?? "")}</code>\nBotni kanalga admin qiling.`
        : ch.admin
          ? "✅ Bot admin, obunani tekshira oladi"
          : "⚠️ Bot admin emas — obunani tekshira olmaydi"
    return [
      [
        "📢 <b>Majburiy obuna kanali</b>",
        "",
        `Kanal: <b>${esc(st.channelTitle)}</b>`,
        status,
        ...("error" in ch || ch.members === null ? [] : [`👥 Obunachilar: <b>${ch.members}</b>`]),
        "",
        "Anketadan keyin menyu faqat shu kanalga obuna bo‘lgach ochiladi; referal ham faqat obunachi bo‘lsa hisoblanadi.",
      ].join("\n"),
      inline([
        [{ text: "🔄 Tekshirish", callback_data: "a:rq" }],
        [{ text: "🔁 Boshqa kanal", callback_data: "a:rq:pick" }],
        [{ text: "⏸ Majburiy obunani o‘chirish", callback_data: "a:rq:off" }],
        [home],
      ]),
    ]
  }

  function goalScreen(): Screen {
    const g = s().goal
    return [
      `🎯 <b>Yopiq kurslar uchun nechta do‘st kerak?</b>\n\nHozir: <b>${g}</b>. Huquqni allaqachon olganlarniki saqlanadi.`,
      inline([
        [1, 3, 5, 7, 10, 15].map((n) => ({ text: n === g ? `• ${n} •` : String(n), callback_data: `a:goal:${n}` })),
        [home],
      ]),
    ]
  }

  function reportScreen(): Screen {
    const h = s().reportHour
    const hours = [8, 10, 12, 15, 18, 19, 20, 21, 22]
    return [
      `🕗 <b>Kunlik hisobot</b>\n\nHar kuni shu soatda (Toshkent) statistika va o‘sha kungi lidlar Excel fayli keladi.\nHozir: <b>${h === null ? "o‘chirilgan" : `${h}:00`}</b>`,
      inline([
        ...rows2(
          hours.map((n) => ({ text: n === h ? `• ${n}:00 •` : `${n}:00`, callback_data: `a:rep:${n}` })),
          3,
        ),
        [{ text: h === null ? "• O‘chirilgan •" : "⏸ O‘chirish", callback_data: "a:rep:off" }],
        [home],
      ]),
    ]
  }

  function excelScreen(): Screen {
    return [
      "📥 <b>Excel</b>\n\nQaysi davrdagi lidlar kerak?",
      inline([
        [
          { text: "Bugun", callback_data: "a:xl:today" },
          { text: "7 kun", callback_data: "a:xl:week" },
          { text: "30 kun", callback_data: "a:xl:month" },
        ],
        [{ text: "Hammasi", callback_data: "a:xl:all" }],
        [home],
      ]),
    ]
  }

  function adminsScreen(viewer: number): Screen {
    const st = s()
    const main = st.mainAdmins.includes(String(viewer))
    const line = (id: string) => {
      const u = store.user(Number(id))
      const l = store.lead(Number(id))
      const name = l ? `${l.first_name} ${l.last_name}` : u?.name || ""
      return `${name ? `${esc(name)} ` : ""}<code>${id}</code>${u?.username ? ` @${esc(u.username)}` : ""}`
    }
    return [
      [
        "👮 <b>Adminlar</b>",
        "",
        "<b>Asosiy</b> (serverdagi .env, o‘chirib bo‘lmaydi):",
        ...st.mainAdmins.map((a) => `• ${line(a)}`),
        "",
        "<b>Botda qo‘shilganlar:</b>",
        ...(st.extraAdmins.length ? st.extraAdmins.map((a) => `• ${line(a)}`) : ["— yo‘q"]),
        "",
        "Adminlarga yangi lidlar, kunlik hisobot keladi va admin panel ochiladi.",
        ...(main ? [] : ["", "Admin qo‘shish/o‘chirish faqat asosiy adminlarda."]),
      ].join("\n"),
      inline([
        ...(main
          ? [
              [{ text: "➕ Admin qo‘shish", callback_data: "a:adm:add" }],
              ...st.extraAdmins.map((a) => [{ text: `➖ ${a} ni o‘chirish`, callback_data: `a:adm:del:${a}` }]),
            ]
          : []),
        [home],
      ]),
    ]
  }

  function userCard(id: number): Screen {
    const st = s()
    const u = store.user(id)
    if (!u) return ["Foydalanuvchi topilmadi.", inline([[home]])]
    const l = store.lead(id)
    const refs = store.credited(id).length
    const invited = store.invited(id).length
    const ref = u.referrer_id ? store.user(u.referrer_id) : undefined
    const closed = u.joined_at
      ? `✅ kanalda (${when(u.joined_at)})`
      : u.unlocked_at
        ? `🔓 ochilgan (${when(u.unlocked_at)}), hali kirmagan`
        : "🔒 ochilmagan"
    return [
      [
        `👤 <b>${esc(l ? `${l.last_name} ${l.first_name} ${l.middle_name}` : u.name || "—")}</b>`,
        `🆔 <code>${u.id}</code>${u.username ? ` · @${esc(u.username)}` : ""} · <a href="tg://user?id=${u.id}">profil</a>`,
        "",
        ...(l
          ? [
              `📞 ${prettyPhone(l.phone)}`,
              `🎓 ${l.grade}-sinf · 📍 ${esc(l.region)}, ${esc(l.district)}`,
              `🏫 Inspiring o‘quvchisi: ${l.is_student ? `ha (${esc(l.branch ?? "")})` : "yo‘q"}`,
            ]
          : ["📝 Anketa to‘ldirilmagan"]),
        `📅 Botga kirgan: ${when(u.started_at)}`,
        ...(u.referrer_id ? [`🤝 Taklif qilgan: ${esc(ref?.name || "")} <code>${u.referrer_id}</code>`] : []),
        `👥 Referallar: <b>${refs}/${st.goal}</b> (havola orqali kirgan: ${invited})`,
        `🔒 Yopiq kurs: ${closed}`,
      ].join("\n"),
      inline([
        u.unlocked_at
          ? [{ text: "🔒 Huquqni olib qo‘yish", callback_data: `a:u:close:${id}` }]
          : [{ text: "🔓 Yopiq kursni qo‘lda ochish", callback_data: `a:u:open:${id}` }],
        [{ text: "🔍 Boshqa qidirish", callback_data: "a:find" }],
        [home],
      ]),
    ]
  }

  // ------------------------------------------------------------------ broadcast
  async function broadcast(admin: number, message: number, leadsOnly: boolean, status: number) {
    broadcasting = true
    const ids = store.userIds(leadsOnly).filter((id) => id !== admin)
    let ok = 0
    let failed = 0
    const started = Date.now()
    log(`broadcast by ${admin} to ${ids.length}`)
    for (const [i, id] of ids.entries()) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await api.call("copyMessage", { chat_id: id, from_chat_id: admin, message_id: message })
          ok++
          break
        } catch (e) {
          const wait = Number((e as Error).message.match(/retry after (\d+)/i)?.[1])
          if (wait && attempt < 2) {
            await sleep((wait + 1) * 1000)
            continue
          }
          failed++
          break
        }
      }
      if (i % 200 === 199) {
        await edit(admin, status, `⏳ Yuborilmoqda… ${i + 1}/${ids.length}`).catch(() => {})
      }
      await sleep(40) // ~25 messages a second, under Telegram's limit
    }
    broadcasting = false
    const mins = Math.max(1, Math.round((Date.now() - started) / 60_000))
    await edit(
      admin,
      status,
      [
        "✅ <b>Xabar yuborildi</b>",
        "",
        `📬 Yetkazildi: <b>${ok}</b>`,
        `🚫 Yetmadi (botni bloklagan va h.k.): <b>${failed}</b>`,
        `⏱ ~${mins} daqiqa`,
      ].join("\n"),
    ).catch(() => notify(admin, `✅ Yuborildi: ${ok}, yetmadi: ${failed}`))
  }

  // ------------------------------------------------------------------ input
  async function cancel(admin: number) {
    states.delete(admin)
    drafts.delete(admin)
    await send(admin, "Bekor qilindi.", adminKeyboard)
  }

  async function addAdmin(admin: number, id: number) {
    const st = s()
    states.delete(admin)
    if (st.admins.includes(String(id))) return send(admin, "Bu odam allaqachon admin.", adminKeyboard)
    settings.set({ extraAdmins: [...st.extraAdmins, String(id)] })
    log(`admin added: ${id} by ${admin}`)
    const reached = await send(
      id,
      "👮 Siz <b>Inspiring Education</b> botiga admin qilindingiz. Panel: /admin",
      adminKeyboard,
    ).then(
      () => true,
      () => false,
    )
    await send(
      admin,
      `✅ <code>${id}</code> admin qilindi.${reached ? "" : "\n\n⚠️ Unga xabar yetmadi: u botni ochib /start bosishi kerak, shundan keyin lidlar unga ham keladi."}`,
      adminKeyboard,
    )
    return send(admin, ...adminsScreen(admin))
  }

  /** An admin's message. Returns false when it isn't for the admin panel (then the user side handles it). */
  async function onMessage(m: Msg): Promise<boolean> {
    const from = m.from!.id
    const text = (m.text ?? "").trim()
    const state = states.get(from)

    if (text === "/cancel" || text === CANCEL) {
      if (!state && !drafts.has(from)) return false
      await cancel(from)
      return true
    }
    if (m.chat_shared) {
      const kind = m.chat_shared.request_id === PICK.closed ? "closed" : "required"
      await connect(kind, String(m.chat_shared.chat_id), from)
      return true
    }
    if (m.users_shared?.request_id === PICK.admin && m.users_shared.users[0]) {
      await addAdmin(from, m.users_shared.users[0].user_id)
      return true
    }

    if (state?.kind === "broadcast" && !text.startsWith("/")) {
      states.delete(from)
      drafts.set(from, m.message_id)
      const all = store.userIds().length
      const leads = store.userIds(true).length
      await send(from, "👆 Shu xabar yuboriladi. Kimga?", {
        inline_keyboard: [
          [{ text: `👥 Hammaga (${all})`, callback_data: "a:bc:all" }],
          [{ text: `📝 Anketa to‘ldirganlarga (${leads})`, callback_data: "a:bc:leads" }],
          [{ text: CANCEL, callback_data: "a:bc:no" }],
        ],
      })
      return true
    }
    if (state?.kind === "find" && text && !text.startsWith("/")) {
      const found = store.find(text)
      if (!found.length) {
        await send(from, "🔍 Hech kim topilmadi. Boshqacha yozib ko‘ring (ID, @username, telefon yoki ism):")
        return true
      }
      states.delete(from)
      if (found.length === 1) {
        await send(from, ...userCard(found[0]))
        return true
      }
      await send(
        from,
        `🔍 Topildi: ${found.length} ta. Tanlang:`,
        inline([
          ...found.map((id) => {
            const l = store.lead(id)
            const u = store.user(id)
            return [
              {
                text: l ? `${l.last_name} ${l.first_name} · ${prettyPhone(l.phone)}` : `${u?.name ?? ""} · ${id}`,
                callback_data: `a:u:${id}`,
              },
            ]
          }),
          [home],
        ]),
      )
      return true
    }
    if (state?.kind === "addAdmin" && /^\d{5,15}$/.test(text)) {
      await addAdmin(from, Number(text))
      return true
    }

    if (/^\/(start|admin)$/.test(text) || text === ADMIN_BUTTONS.panel) {
      states.delete(from)
      if (text === "/start") {
        await send(
          from,
          `👋 Assalomu alaykum! Siz bot administratorisiz. Yangi lidlar shu yerga keladi.`,
          adminKeyboard,
        )
      }
      await send(from, ...panel())
      return true
    }
    if (text === "/excel" || text === ADMIN_BUTTONS.excel) {
      await send(from, ...excelScreen())
      return true
    }
    if (text === "/stats" || text === ADMIN_BUTTONS.stats) {
      await send(from, ...stats())
      return true
    }
    return false
  }

  async function onCallback(c: NonNullable<Update["callback_query"]>) {
    const admin = c.from.id
    const data = c.data ?? ""
    const msg = c.message?.message_id
    let answered = false
    const done = (text?: string, alert = false) => {
      answered = true
      return api.call("answerCallbackQuery", { callback_query_id: c.id, ...(text ? { text, show_alert: alert } : {}) })
    }
    /** Shows a screen in place of the pressed message (or as a new one). */
    const show = async ([text, markup]: Screen) => {
      if (!answered) await done()
      if (msg) {
        try {
          await edit(admin, msg, text, markup)
          return
        } catch (e) {
          if (/not modified/.test((e as Error).message)) return
        }
      }
      await send(admin, text, markup)
    }
    const [, section, arg, extra] = data.split(":")

    switch (section) {
      case "home":
        states.delete(admin)
        return show(panel())
      case "stats":
        await done("Yangilandi")
        return show(stats())
      case "xl": {
        if (!arg) return show(excelScreen())
        await done("Tayyorlanmoqda…")
        const day = tashkentDay(Date.now())
        const since = { today: day, week: day - 6 * 86_400_000, month: day - 29 * 86_400_000, all: 0 }[arg] ?? 0
        const label =
          { today: "Bugungi", week: "Oxirgi 7 kundagi", month: "Oxirgi 30 kundagi", all: "Barcha" }[arg] ?? "Barcha"
        const all = store.leads(since)
        const n = all.filter(isLead).length
        return ctx.sendExcel(
          admin,
          since,
          `📥 ${label} lidlar: <b>${n}</b> ta\n🏫 Inspiring o‘quvchilari (alohida varaqda): ${all.length - n} ta`,
        )
      }
      case "cl":
        if (arg === "pick") {
          await done()
          states.set(admin, { kind: "pickClosed" })
          return send(
            admin,
            "👇 Pastdagi <b>«🔒 Yopiq kanalni tanlash»</b> tugmasini bosing va kanalni tanlang. Telegram botni o‘sha kanalga kerakli huquqlar bilan admin qiladi.",
            pickChannel("closed"),
          )
        }
        if (arg === "off") {
          if (extra !== "yes") {
            await done()
            return show([
              "🔌 Yopiq kanalni uzaymi? Yangi havolalar berilmaydi (huquq olganlar saqlanadi, qayta ulasangiz ishlaydi).",
              inline([
                [{ text: "✅ Ha, uzish", callback_data: "a:cl:off:yes" }],
                [{ text: "⬅️ Yo‘q", callback_data: "a:cl" }],
              ]),
            ])
          }
          settings.set({ closedChannel: "", closedTitle: "" })
          log(`closed channel removed by ${admin}`)
          await done("Uzildi")
        }
        return show(await closedScreen())
      case "rq":
        if (arg === "pick") {
          await done()
          states.set(admin, { kind: "pickRequired" })
          return send(
            admin,
            "👇 Pastdagi <b>«📢 Majburiy kanalni tanlash»</b> tugmasini bosing va kanalni tanlang.",
            pickChannel("required"),
          )
        }
        if (arg === "off") {
          settings.set({ channel: "", channelTitle: "", channelUrl: "" })
          log(`required channel off by ${admin}`)
          await done("O‘chirildi")
        }
        if (arg === "def") {
          settings.set({
            channel: "@inspiringuz",
            channelTitle: "@inspiringuz",
            channelUrl: "https://t.me/inspiringuz",
          })
          await done("Yoqildi")
        }
        return show(await requiredScreen())
      case "goal":
        if (arg && Number(arg) >= 1 && Number(arg) <= 100) {
          settings.set({ goal: Number(arg) })
          log(`goal ${arg} by ${admin}`)
          await done(`✅ ${arg} ta do‘st`)
        }
        return show(goalScreen())
      case "rep":
        if (arg === "off") {
          settings.set({ reportHour: null })
          await done("O‘chirildi")
        } else if (arg && Number(arg) >= 0 && Number(arg) < 24) {
          settings.set({ reportHour: Number(arg) })
          await done(`✅ Har kuni ${arg}:00`)
        }
        return show(reportScreen())
      case "bc": {
        if (!arg) {
          if (broadcasting) return done("Oldingi xabar hali yuborilmoqda, tugashini kuting.", true)
          await done()
          states.set(admin, { kind: "broadcast" })
          return send(
            admin,
            "📣 Yuboriladigan xabarni shu yerga yuboring: matn, rasm, video, fayl yoki ovozli xabar — qanday bo‘lsa, shunday yetadi.\n\nBekor qilish: /cancel",
            { keyboard: [[{ text: CANCEL }]], resize_keyboard: true },
          )
        }
        const draft = drafts.get(admin)
        drafts.delete(admin)
        if (arg === "no" || !draft) {
          await done("Bekor qilindi")
          if (msg) await edit(admin, msg, "❌ Yuborish bekor qilindi.").catch(() => {})
          return send(admin, "⚙️", adminKeyboard)
        }
        if (broadcasting) return done("Oldingi xabar hali yuborilmoqda.", true)
        await done("Boshlandi")
        if (msg) await edit(admin, msg, "⏳ Yuborilmoqda…").catch(() => {})
        await send(admin, "Yuborish fon rejimida ketyapti, tugagach xabar beraman.", adminKeyboard)
        // In the background, so the admin can keep using the bot.
        void broadcast(admin, draft, arg === "leads", msg ?? 0).catch((e) => {
          broadcasting = false
          log(`broadcast: ${(e as Error).message}`)
        })
        return
      }
      case "find":
        await done()
        states.set(admin, { kind: "find" })
        return send(admin, "🔍 Qidirish: Telegram ID, @username, telefon raqam yoki familiya/ismni yozing:")
      case "u": {
        const id = Number(extra ?? arg)
        if (arg === "open") {
          store.unlock(id)
          log(`manual unlock ${id} by ${admin}`)
          await notify(id, "🎁 <b>Sizga yopiq kurslar ochildi!</b> Kanalga kirish uchun tugmani bosing.", {
            inline_keyboard: [[{ text: "🔓 Yopiq kanalga kirish", callback_data: "cl:open" }]],
          })
          await done("✅ Ochildi, foydalanuvchiga xabar yuborildi")
        } else if (arg === "close") {
          const u = store.user(id)
          if (u?.invite_link && s().closedChannel) {
            await api
              .call("revokeChatInviteLink", { chat_id: s().closedChannel, invite_link: u.invite_link })
              .catch(() => {})
          }
          if (u?.joined_at && s().closedChannel) {
            // Remove from the channel without a lasting ban.
            await api.call("banChatMember", { chat_id: s().closedChannel, user_id: id }).catch(() => {})
            await api
              .call("unbanChatMember", { chat_id: s().closedChannel, user_id: id, only_if_banned: true })
              .catch(() => {})
          }
          store.revoke(id)
          log(`manual revoke ${id} by ${admin}`)
          await done("Huquq olib qo‘yildi")
        }
        return show(userCard(id))
      }
      case "adm": {
        const main = s().mainAdmins.includes(String(admin))
        if (arg === "add" && main) {
          await done()
          states.set(admin, { kind: "addAdmin" })
          return send(
            admin,
            "➕ Yangi adminni pastdagi tugma orqali tanlang yoki uning Telegram ID raqamini yozing.\n\n(U avval botni ochib /start bosgan bo‘lishi kerak.)",
            pickAdmin,
          )
        }
        if (arg === "del" && main && extra) {
          settings.set({ extraAdmins: s().extraAdmins.filter((a) => a !== extra) })
          log(`admin removed: ${extra} by ${admin}`)
          await done("O‘chirildi")
        }
        return show(adminsScreen(admin))
      }
      case "set": {
        // From the "bot became an admin of a channel" notice.
        const chat = extra
        if (!chat) return done()
        await done()
        return connect(arg === "cl" ? "closed" : "required", chat, admin)
      }
    }
    if (!answered) await done()
  }

  /** The bot was added to (or removed from) a channel. */
  async function onMyChatMember(u: NonNullable<Update["my_chat_member"]>) {
    const st = s()
    const chat = String(u.chat.id)
    const status = u.new_chat_member.status
    const title = esc(u.chat.title ?? chat)
    if (status === "administrator" && u.chat.type === "channel") {
      if (chat === st.closedChannel || chat === st.channel) return
      const by = st.admins.includes(String(u.from.id)) ? [String(u.from.id)] : st.mainAdmins
      for (const a of by) {
        await notify(
          a,
          `📢 Bot «<b>${title}</b>» kanaliga admin qilindi. Bu kanal nima uchun?`,
          inline([
            [{ text: "🔒 Yopiq kurslar kanali", callback_data: `a:set:cl:${chat}` }],
            [{ text: "📢 Majburiy obuna kanali", callback_data: `a:set:rq:${chat}` }],
          ]),
        )
      }
    }
    if (
      (status === "left" || status === "kicked" || status === "member") &&
      (chat === st.closedChannel || chat === st.channel)
    ) {
      const which = chat === st.closedChannel ? "yopiq kurslar" : "majburiy obuna"
      for (const a of st.admins) {
        await notify(
          a,
          `⚠️ Bot «<b>${title}</b>» (${which} kanali) da endi admin emas — bu funksiya ishlamaydi. Botni qayta admin qiling: /admin`,
        )
      }
    }
  }

  return { onMessage, onCallback, onMyChatMember }
}
