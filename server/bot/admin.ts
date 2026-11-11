/**
 * Admin panel: everything an admin needs without touching the server.
 *
 *  • Statistics (with the call-centre funnel) and Excel (today, 7 / 30 days, all).
 *  • New leads not yet handled by the call centre; who receives leads (call centre).
 *  • Ad links (/start src_…) for posts and pages, with how many people and leads each brought.
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
import { isLead, siteCard, sourceLabel, statsText, statusButtons, tashkentDay, when, leadCard } from "./report.ts"
import { countsText, dateLabel, daysLeft, isOpen, monitoringWorkbook } from "./monitoring.ts"
import { fileName, XLSX_TYPE } from "./report.ts"
import type { SettingsStore } from "./settings.ts"

export type AdminContext = {
  api: { call: <T>(method: string, body: Record<string, unknown>) => Promise<T> }
  store: Store
  settings: SettingsStore
  send: (chat: number | string, text: string, markup?: Markup) => Promise<{ message_id: number }>
  edit: (chat: number, message: number, text: string, markup?: Markup) => Promise<unknown>
  notify: (chat: number | string, text: string, markup?: Markup) => Promise<unknown>
  sendExcel: (chat: number | string, since?: number, caption?: string) => Promise<unknown>
  sendFile: (chat: string, file: { name: string; data: Uint8Array; type: string }, caption?: string) => Promise<unknown>
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
const PICK = { closed: 1, required: 2, admin: 3, callCenter: 4 } as const

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const inline = (rows: Btn[][]): Markup => ({ inline_keyboard: rows })
const home: Btn = { text: "⬅️ Admin panel", callback_data: "a:home" }
/** Back to the section a screen belongs to. */
const back = {
  leads: { text: "⬅️ Lidlar", callback_data: "a:g:leads" },
  mkt: { text: "⬅️ Marketing", callback_data: "a:g:mkt" },
  online: { text: "⬅️ Online dars", callback_data: "a:g:online" },
  set: { text: "⬅️ Sozlamalar", callback_data: "a:g:set" },
} satisfies Record<string, Btn>
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
          text: kind === "closed" ? "🎓 Online dars kanalini tanlash" : "📢 Majburiy kanalni tanlash",
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

const pickUser = (request_id: number): Markup =>
  ({
    keyboard: [
      [{ text: "👤 Foydalanuvchini tanlash", request_users: { request_id, user_is_bot: false, max_quantity: 1 } }],
      [{ text: CANCEL }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  }) as unknown as Markup

/** "Instagram stories, noyabr" → "instagram_stories_noyabr" */
export function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[‘’'ʻʼ`]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30)
}

type State = {
  kind:
    | "broadcast"
    | "find"
    | "addAdmin"
    | "addCallCenter"
    | "pickClosed"
    | "pickRequired"
    | "newSource"
    | "monDate"
    | "monTime"
}

export function createAdmin(ctx: AdminContext) {
  const { api, store, settings, send, edit, notify, log } = ctx
  const s = () => settings.get()
  const states = new Map<number, State>()
  /** Broadcast drafts: admin → the message they want to send. */
  const drafts = new Map<number, number>()
  /** Where the broadcast was started from (the monitoring screen suggests its participants first). */
  const broadcastTarget = new Map<number, string>()
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
          "ℹ️ Bu kanal ochiq (public). Online dars uchun <b>private</b> kanal tavsiya etiladi — aks holda har kim havolasiz kira oladi.",
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
      `✅ «${esc(c.title)}» ${kind === "closed" ? "online dars kanali" : "majburiy obuna kanali"} sifatida ulandi.`,
      adminKeyboard,
    )
    return send(admin, ...(kind === "closed" ? await closedScreen() : await requiredScreen()))
  }

  // ------------------------------------------------------------------ screens
  type Screen = [string, Markup]

  function panel(): Screen {
    const st = s()
    const c = store.counts(tashkentDay(Date.now()))
    const fresh = store.unhandledCount()
    const mon = store.monitoringIds().length
    const warn = [
      ...(st.closedChannel ? [] : ["⚠️ Online dars kanali ulanmagan"]),
      ...(st.monitoring.time || daysLeft(st.monitoring) < 0 ? [] : ["⚠️ Monitoring vaqti kiritilmagan"]),
    ]
    return [
      [
        "⚙️ <b>Admin panel</b>",
        "",
        `🆕 Ishlov berilmagan lidlar: <b>${fresh}</b>`,
        `📝 Lidlar bugun: bot +${c.leads_today} · 👥 yangi foydalanuvchilar +${c.users_today}`,
        `📝 Monitoringga yozilganlar: <b>${mon}</b>`,
        ...(warn.length ? ["", ...warn] : []),
      ].join("\n"),
      inline([
        [{ text: `📋 Lidlar${fresh ? ` (${fresh} yangi)` : ""}`, callback_data: "a:g:leads" }],
        [{ text: `📝 Monitoring (${mon})`, callback_data: "a:mon" }],
        [
          { text: "📈 Marketing", callback_data: "a:g:mkt" },
          { text: "🎓 Online dars", callback_data: "a:g:online" },
        ],
        [
          { text: "🔍 Foydalanuvchi", callback_data: "a:find" },
          { text: "⚙️ Sozlamalar", callback_data: "a:g:set" },
        ],
      ]),
    ]
  }

  /** The panel's sections: a few buttons each instead of one long list. */
  function group(name: string): Screen {
    const st = s()
    const c = store.counts(tashkentDay(Date.now()))
    switch (name) {
      case "leads": {
        const fresh = store.unhandledCount()
        return [
          [
            "📋 <b>Lidlar</b>",
            "",
            `📝 Bot: <b>${c.leads}</b> (bugun +${c.leads_today}) · sayt: <b>${store.siteLeads().length}</b>`,
            `🆕 Ishlov berilmagan: <b>${fresh}</b>`,
            `📞 Call-markaz: <b>${st.callCenter.length}</b> kishi — lidlar faqat ularga keladi`,
          ].join("\n"),
          inline([
            [{ text: `🆕 Yangi lidlar (${fresh})`, callback_data: "a:new" }],
            [
              { text: "📊 Statistika", callback_data: "a:stats" },
              { text: "📥 Excel", callback_data: "a:xl" },
            ],
            [{ text: "📞 Call-markaz", callback_data: "a:cc" }],
            [home],
          ]),
        ]
      }
      case "mkt":
        return [
          [
            "📈 <b>Marketing</b>",
            "",
            `🔗 Reklama havolalari: <b>${store.sources().length}</b> ta`,
            `👥 Foydalanuvchilar: <b>${c.users}</b> (bugun +${c.users_today})`,
          ].join("\n"),
          inline([
            [{ text: "📈 Reklama havolalari", callback_data: "a:src" }],
            [{ text: "📣 Xabar yuborish", callback_data: "a:bc" }],
            [home],
          ]),
        ]
      case "online":
        return [
          [
            "🎓 <b>Online dars</b>",
            "",
            `Kanal: ${st.closedChannel ? `<b>${esc(st.closedTitle)}</b> ✅` : "⚠️ <b>ulanmagan</b>"}`,
            `🎯 Kerakli do‘stlar: <b>${st.goal}</b> ta`,
            `🤝 Referallar: <b>${c.referrals}</b> · ochganlar: <b>${c.unlocked}</b> · kanalda: <b>${c.joined}</b>`,
          ].join("\n"),
          inline([
            [{ text: "🎓 Online dars kanali", callback_data: "a:cl" }],
            [{ text: "🎯 Referal soni", callback_data: "a:goal" }],
            [home],
          ]),
        ]
      default:
        return [
          [
            "⚙️ <b>Sozlamalar</b>",
            "",
            `📢 Majburiy obuna: ${st.channel ? `<b>${esc(st.channelTitle)}</b>` : "o‘chirilgan"}`,
            `🕗 Kunlik hisobot: ${st.reportHour === null ? "o‘chirilgan" : `<b>${String(st.reportHour).padStart(2, "0")}:00</b>`} (call-markazga)`,
            `👮 Adminlar: <b>${st.admins.length}</b>`,
          ].join("\n"),
          inline([
            [{ text: "📢 Majburiy kanal", callback_data: "a:rq" }],
            [{ text: "🕗 Hisobot vaqti", callback_data: "a:rep" }],
            [{ text: "👮 Adminlar", callback_data: "a:adm" }],
            [home],
          ]),
        ]
    }
  }

  function newLeads(): Screen {
    const list = store.unhandled()
    if (!list.length) return ["🆕 <b>Yangi lidlar</b>\n\nHammasiga ishlov berilgan 👍", inline([[back.leads]])]
    return [
      [
        "🆕 <b>Ishlov berilmagan lidlar</b> (yangi va javob bermaganlar, oxirgi 15 ta)",
        "",
        "Lidni bosing — kartochkasi holat tugmalari bilan chiqadi.",
      ].join("\n"),
      inline([
        ...list.map((l) => [
          {
            text: `${l.kind === "s" ? "🌐" : "🤖"} ${l.name} · ${prettyPhone(l.phone)} · ${when(l.created_at).slice(0, 5)}`,
            callback_data: `a:lead:${l.kind}:${l.id}`,
          },
        ]),
        [{ text: "🔄 Yangilash", callback_data: "a:new" }],
        [back.leads],
      ]),
    ]
  }

  function sourcesScreen(): Promise<Screen> {
    return ctx.me().then((bot) => {
      const list = store.sources()
      const other = Object.fromEntries(store.otherSources().map((o) => [o.code, o]))
      const lines = list.map(
        (x) =>
          `• <b>${esc(x.name)}</b> — 👥 ${x.users} · 📝 ${x.leads} · ✅ ${x.enrolled}\n   <code>https://t.me/${bot.username}?start=src_${x.code}</code>`,
      )
      return [
        [
          "📈 <b>Reklama havolalari</b>",
          "",
          "Har bir post, reklama yoki sahifa uchun alohida havola yarating — qaysi biri qancha odam va lid olib kelganini ko‘rasiz.",
          "",
          ...(lines.length ? lines : ["Hali havola yo‘q."]),
          "",
          `• ${sourceLabel(null)} — 👥 ${other[""]?.users ?? 0} · 📝 ${other[""]?.leads ?? 0}`,
          `• ${sourceLabel("referral")} — 👥 ${other.referral?.users ?? 0} · 📝 ${other.referral?.leads ?? 0}`,
          "",
          "👥 botga kirgan · 📝 lid · ✅ yozilgan",
        ].join("\n"),
        inline([
          [{ text: "➕ Yangi havola", callback_data: "a:src:add" }],
          ...list.map((x) => [{ text: `🗑 ${x.name}`, callback_data: `a:src:del:${x.code}` }]),
          [back.mkt],
        ]),
      ] as Screen
    })
  }

  function callCenterScreen(viewer: number): Screen {
    const st = s()
    const main = st.mainAdmins.includes(String(viewer))
    return [
      [
        "📞 <b>Call-markaz</b>",
        "",
        "Sayt arizalari, botdagi yangi lidlar, konsultatsiya so‘rovlari va kunlik hisobot <b>faqat shularga</b> keladi:",
        "",
        ...st.callCenter.map((id) => `• ${personLine(id)}`),
        "",
        "Kartochka ostidagi tugmalar bilan lid holatini belgilashadi: 📞 bog‘lanildi, 📵 javob bermadi, ✅ yozildi, ❌ rad etdi.",
        ...(main ? [] : ["", "O‘zgartirish faqat asosiy adminlarda."]),
      ].join("\n"),
      inline([
        ...(main
          ? [
              [{ text: "➕ Qo‘shish", callback_data: "a:cc:add" }],
              ...(st.callCenter.length > 1
                ? st.callCenter.map((id) => [{ text: `➖ ${id} ni olib tashlash`, callback_data: `a:cc:del:${id}` }])
                : []),
            ]
          : []),
        [back.leads],
      ]),
    ]
  }

  function monitoringScreen(): Screen {
    const m = s().monitoring
    const rows = store.monitoringRows()
    const n = daysLeft(m)
    return [
      [
        "📝 <b>Monitoring test</b>",
        "",
        `🗓 ${dateLabel(m)}${n >= 0 ? ` — ${n === 0 ? "bugun" : `${n} kun qoldi`}` : " — o‘tgan"}`,
        `⏰ Vaqt: ${m.time ? `<b>${m.time}</b>` : "⚠️ <b>kiritilmagan</b> (eslatmalarda «alohida e’lon qilinadi» deyiladi)"}`,
        `🎓 Sinflar: ${m.grades.join(", ")}`,
        `📋 Ro‘yxat: ${isOpen(m) ? "✅ ochiq" : "🔒 yopiq"} · 🔔 Eslatmalar: ${m.reminders ? "yoqilgan" : "o‘chirilgan"}`,
        "",
        countsText(rows),
        "",
        "Eslatmalar: har kuni 19:00 da, test arafasida batafsil, test kuni ertalab 7:00 da.",
      ].join("\n"),
      inline([
        [{ text: "📥 Excel ro‘yxat", callback_data: "a:mon:xl" }],
        [{ text: "📣 Ishtirokchilarga xabar", callback_data: "a:bc:mon" }],
        [
          { text: "🗓 Sana", callback_data: "a:mon:date" },
          { text: "⏰ Vaqt", callback_data: "a:mon:time" },
        ],
        [
          { text: m.open ? "🔒 Ro‘yxatni yopish" : "✅ Ro‘yxatni ochish", callback_data: "a:mon:open" },
          { text: m.reminders ? "🔕 Eslatmani o‘chirish" : "🔔 Eslatmani yoqish", callback_data: "a:mon:rem" },
        ],
        [{ text: "🔄 Yangilash", callback_data: "a:mon" }, home],
      ]),
    ]
  }

  function personLine(id: string) {
    const u = store.user(Number(id))
    const l = store.lead(Number(id))
    const name = l ? `${l.first_name} ${l.last_name}` : u?.name || ""
    return `${name ? `${esc(name)} ` : ""}<code>${id}</code>${u?.username ? ` @${esc(u.username)}` : ""}`
  }

  function stats(): Screen {
    const top = store.topRegions()
    const text = [
      statsText(store),
      ...(top.length
        ? ["", "<b>📍 Eng ko‘p lid kelgan hududlar:</b>", ...top.map((r, i) => `${i + 1}. ${esc(r.region)} — ${r.n}`)]
        : []),
    ].join("\n")
    return [text, inline([[{ text: "🔄 Yangilash", callback_data: "a:stats" }], [back.leads]])]
  }

  async function closedScreen(): Promise<Screen> {
    const st = s()
    const c = store.counts(0)
    if (!st.closedChannel) {
      return [
        [
          "🔒 <b>Online dars kanali</b> — ⚠️ ulanmagan",
          "",
          "Qanday ulanadi:",
          "1) Telegram’da <b>private</b> kanal oching (agar hali bo‘lmasa).",
          "2) Pastdagi «🔗 Kanalni ulash» → «🎓 Online dars kanalini tanlash» ni bosib, kanalni tanlang.",
          "3) Telegram botni o‘zi admin qiladi (havola yaratish huquqi bilan) — tayyor.",
          "",
          "Kanal ulanmaguncha, 5 ta do‘st yig‘ganlarga «tez orada» deyiladi va hisobi saqlanadi.",
        ].join("\n"),
        inline([[{ text: "🔗 Kanalni ulash", callback_data: "a:cl:pick" }], [back.online]]),
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
        "🔒 <b>Online dars kanali</b>",
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
        [back.online],
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
          [back.set],
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
        [back.set],
      ]),
    ]
  }

  function goalScreen(): Screen {
    const g = s().goal
    return [
      `🎯 <b>Online darsga qo‘shilish uchun nechta do‘st kerak?</b>\n\nHozir: <b>${g}</b>. Huquqni allaqachon olganlarniki saqlanadi.`,
      inline([
        [1, 3, 5, 7, 10, 15].map((n) => ({ text: n === g ? `• ${n} •` : String(n), callback_data: `a:goal:${n}` })),
        [back.online],
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
        [back.set],
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
        [back.leads],
      ]),
    ]
  }

  function adminsScreen(viewer: number): Screen {
    const st = s()
    const main = st.mainAdmins.includes(String(viewer))
    const line = personLine
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
        "Adminlar panelni boshqaradi. Lidlar adminlarga emas, faqat «📞 Call-markaz» ga keladi.",
        ...(main ? [] : ["", "Admin qo‘shish/o‘chirish faqat asosiy adminlarda."]),
      ].join("\n"),
      inline([
        ...(main
          ? [
              [{ text: "➕ Admin qo‘shish", callback_data: "a:adm:add" }],
              ...st.extraAdmins.map((a) => [{ text: `➖ ${a} ni o‘chirish`, callback_data: `a:adm:del:${a}` }]),
            ]
          : []),
        [back.set],
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
        `🎓 Online dars: ${closed}`,
      ].join("\n"),
      inline([
        u.unlocked_at
          ? [{ text: "🔒 Huquqni olib qo‘yish", callback_data: `a:u:close:${id}` }]
          : [{ text: "🎓 Online darsni qo‘lda ochish", callback_data: `a:u:open:${id}` }],
        [{ text: "🔍 Boshqa qidirish", callback_data: "a:find" }],
        [home],
      ]),
    ]
  }

  // ------------------------------------------------------------------ broadcast
  async function broadcast(admin: number, message: number, target: "all" | "leads" | "mon", status: number) {
    broadcasting = true
    const ids = (target === "mon" ? store.monitoringIds() : store.userIds(target === "leads")).filter(
      (id) => id !== admin,
    )
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
      `✅ <code>${id}</code> admin qilindi.${reached ? "" : "\n\n⚠️ Unga xabar yetmadi: u botni ochib /start bosishi kerak."}`,
      adminKeyboard,
    )
    return send(admin, ...adminsScreen(admin))
  }

  async function addCallCenter(admin: number, id: number) {
    const st = s()
    states.delete(admin)
    if (st.callCenter.includes(String(id))) return send(admin, "Bu odam allaqachon call-markazda.", adminKeyboard)
    settings.set({ callCenter: [...st.callCenter, String(id)] })
    log(`call centre added: ${id} by ${admin}`)
    const reached = await send(
      id,
      "📞 Siz <b>Inspiring Education</b> call-markaziga qo‘shildingiz: yangi lidlar shu yerga keladi.",
    ).then(
      () => true,
      () => false,
    )
    await send(
      admin,
      `✅ <code>${id}</code> call-markazga qo‘shildi.${reached ? "" : "\n\n⚠️ Unga xabar yetmadi: u botni ochib /start bosishi kerak, aks holda lidlar unga yetmaydi."}`,
      adminKeyboard,
    )
    return send(admin, ...callCenterScreen(admin))
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
    if (m.users_shared?.request_id === PICK.callCenter && m.users_shared.users[0]) {
      await addCallCenter(from, m.users_shared.users[0].user_id)
      return true
    }
    if (state?.kind === "addCallCenter" && /^-?\d{5,15}$/.test(text)) {
      await addCallCenter(from, Number(text))
      return true
    }
    if ((state?.kind === "monDate" || state?.kind === "monTime") && text && !text.startsWith("/")) {
      const m = s().monitoring
      if (state.kind === "monDate") {
        const d = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
        if (!d) {
          await send(from, "Sanani shunday yozing: <b>15.11.2026</b>")
          return true
        }
        settings.set({ monitoring: { ...m, date: `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` } })
      } else {
        const t = text.match(/^(\d{1,2})[:.](\d{2})$/)
        if (!t && text !== "-") {
          await send(from, "Vaqtni shunday yozing: <b>10:00</b> (olib tashlash uchun: -)")
          return true
        }
        settings.set({ monitoring: { ...m, time: t ? `${t[1].padStart(2, "0")}:${t[2]}` : "" } })
      }
      states.delete(from)
      log(`monitoring ${state.kind} set by ${from}`)
      await send(from, "✅ Saqlandi.", adminKeyboard)
      await send(from, ...monitoringScreen())
      return true
    }
    if (state?.kind === "newSource" && text && !text.startsWith("/")) {
      const name = text.replace(/\s+/g, " ").slice(0, 60)
      let code = slug(name) || `link${Date.now() % 100000}`
      for (let i = 2; store.sourceName(code); i++) code = `${slug(name).slice(0, 26)}_${i}`
      store.addSource(code, name)
      states.delete(from)
      log(`ad link ${code} by ${from}`)
      const bot = await ctx.me()
      await send(
        from,
        `✅ Havola tayyor — «${esc(name)}»:\n\n<code>https://t.me/${bot.username}?start=src_${code}</code>\n\nUni post, stories yoki reklamaga qo‘ying. Kim shu havola orqali kirsa, «📈 Reklama havolalari» da hisoblanadi.`,
        adminKeyboard,
      )
      await send(from, ...(await sourcesScreen()))
      return true
    }

    if (state?.kind === "broadcast" && !text.startsWith("/")) {
      states.delete(from)
      drafts.set(from, m.message_id)
      const all = store.userIds().length
      const leads = store.userIds(true).length
      const mon = store.monitoringIds().length
      const target = broadcastTarget.get(from)
      await send(from, "👆 Shu xabar yuboriladi. Kimga?", {
        inline_keyboard: [
          ...(target === "mon"
            ? [[{ text: `📝 Monitoring ishtirokchilariga (${mon})`, callback_data: "a:bc:mon" }]]
            : []),
          [{ text: `👥 Hammaga (${all})`, callback_data: "a:bc:all" }],
          [{ text: `📝 Anketa to‘ldirganlarga (${leads})`, callback_data: "a:bc:leads" }],
          ...(target === "mon"
            ? []
            : [[{ text: `📝 Monitoring ishtirokchilariga (${mon})`, callback_data: "a:bc:mon" }]]),
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
          `👋 Assalomu alaykum! Siz bot administratorisiz.${s().callCenter.includes(String(from)) ? " Yangi lidlar shu yerga keladi." : ""}`,
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
      case "g":
        return show(group(arg ?? ""))
      case "new":
        return show(newLeads())
      case "mon": {
        const m = s().monitoring
        if (arg === "xl") {
          const rows = store.monitoringRows()
          if (!rows.length) return done("Hali hech kim ro‘yxatdan o‘tmagan.", true)
          await done("Tayyorlanmoqda…")
          return ctx
            .sendFile(
              String(admin),
              { name: fileName("monitoring", Date.now()), data: monitoringWorkbook(rows, store), type: XLSX_TYPE },
              `📝 Monitoring (${dateLabel(m, false)}): <b>${rows.length}</b> ta o‘quvchi`,
            )
            .catch((e) => log(`monitoring excel: ${(e as Error).message}`))
        }
        if (arg === "date" || arg === "time") {
          await done()
          states.set(admin, { kind: arg === "date" ? "monDate" : "monTime" })
          return send(
            admin,
            arg === "date"
              ? `🗓 Yangi sanani yozing (hozir ${dateLabel(m, false)}): <b>15.11.2026</b>`
              : "⏰ Boshlanish vaqtini yozing: <b>10:00</b>. Olib tashlash uchun: <b>-</b>",
            { keyboard: [[{ text: CANCEL }]], resize_keyboard: true },
          )
        }
        if (arg === "open") {
          settings.set({ monitoring: { ...m, open: !m.open } })
          await done(m.open ? "Ro‘yxat yopildi" : "Ro‘yxat ochildi")
        }
        if (arg === "rem") {
          settings.set({ monitoring: { ...m, reminders: !m.reminders } })
          await done(m.reminders ? "Eslatmalar o‘chirildi" : "Eslatmalar yoqildi")
        }
        return show(monitoringScreen())
      }
      case "lead": {
        await done()
        const id = Number(extra)
        if (arg === "s") {
          const sl = store.siteLead(id)
          if (!sl) return
          const card = siteCard(sl)
          return send(admin, card.text, { inline_keyboard: card.buttons })
        }
        const row = store.leadRow(id)
        if (!row) return
        return send(admin, leadCard(row, "new", store), { inline_keyboard: statusButtons("b", id, row.status) })
      }
      case "src":
        if (arg === "add") {
          await done()
          states.set(admin, { kind: "newSource" })
          return send(
            admin,
            "📈 Havola nomini yozing — qayerga qo‘yasiz? Masalan: <i>Instagram bio</i>, <i>Stories 12-noyabr</i>, <i>Ota-onalar guruhi</i>.\n\nBekor qilish: /cancel",
            { keyboard: [[{ text: CANCEL }]], resize_keyboard: true },
          )
        }
        if (arg === "del" && extra) {
          if (extra && !data.endsWith(":yes")) {
            await done()
            return show([
              `🗑 «${esc(store.sourceName(extra) ?? extra)}» havolasini o‘chiraymi? Havola ishlashda davom etadi, lekin hisobda ko‘rinmaydi.`,
              inline([
                [{ text: "✅ Ha, o‘chirish", callback_data: `a:src:del:${extra}:yes` }],
                [{ text: "⬅️ Yo‘q", callback_data: "a:src" }],
              ]),
            ])
          }
          store.deleteSource(extra)
          await done("O‘chirildi")
        }
        return show(await sourcesScreen())
      case "cc": {
        const main = s().mainAdmins.includes(String(admin))
        if (arg === "add" && main) {
          await done()
          states.set(admin, { kind: "addCallCenter" })
          return send(
            admin,
            "➕ Call-markaz xodimini pastdagi tugma orqali tanlang yoki Telegram ID raqamini yozing (guruh bo‘lsa, guruh ID si: -100…).\n\nXodim avval botni ochib /start bosgan bo‘lishi kerak.",
            pickUser(PICK.callCenter),
          )
        }
        if (arg === "del" && main && extra && s().callCenter.length > 1) {
          settings.set({ callCenter: s().callCenter.filter((x) => x !== extra) })
          log(`call centre removed: ${extra} by ${admin}`)
          await done("Olib tashlandi")
        }
        return show(callCenterScreen(admin))
      }
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
          `📥 ${label} lidlar: bot <b>${n}</b>, sayt <b>${store.siteLeads(since).length}</b>\n🏫 Inspiring o‘quvchilari (alohida varaqda): ${all.length - n} ta`,
        )
      }
      case "cl":
        if (arg === "pick") {
          await done()
          states.set(admin, { kind: "pickClosed" })
          return send(
            admin,
            "👇 Pastdagi <b>«🎓 Online dars kanalini tanlash»</b> tugmasini bosing va kanalni tanlang. Telegram botni o‘sha kanalga kerakli huquqlar bilan admin qiladi.",
            pickChannel("closed"),
          )
        }
        if (arg === "off") {
          if (extra !== "yes") {
            await done()
            return show([
              "🔌 Online dars kanalini uzaymi? Yangi havolalar berilmaydi (huquq olganlar saqlanadi, qayta ulasangiz ishlaydi).",
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
        if (!arg || (arg === "mon" && !drafts.has(admin))) {
          if (arg === "mon") broadcastTarget.set(admin, "mon")
          else broadcastTarget.delete(admin)
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
        void broadcast(admin, draft, arg === "leads" || arg === "mon" ? arg : "all", msg ?? 0).catch((e) => {
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
          await notify(id, "🎁 <b>Sizga online dars ochildi!</b> Kanalga kirish uchun tugmani bosing.", {
            inline_keyboard: [[{ text: "🎓 Online darsga kirish", callback_data: "cl:open" }]],
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
            pickUser(PICK.admin),
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
            [{ text: "🔒 Online dars kanali", callback_data: `a:set:cl:${chat}` }],
            [{ text: "📢 Majburiy obuna kanali", callback_data: `a:set:rq:${chat}` }],
          ]),
        )
      }
    }
    if (
      (status === "left" || status === "kicked" || status === "member") &&
      (chat === st.closedChannel || chat === st.channel)
    ) {
      const which = chat === st.closedChannel ? "online dars" : "majburiy obuna"
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
