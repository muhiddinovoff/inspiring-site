import { beforeEach, describe, expect, it } from "vitest"

import type { Update } from "../telegram.ts"
import { type Api, createBot } from "./bot.ts"
import { openStore, type Store } from "./db.ts"
import { slug } from "./admin.ts"

const ADMIN = 1
const OTHER_ADMIN = 2
const CALL = 3
const CLOSED = "-1001"
const BOT = 999

/** A stand-in Bot API: records every call, knows who is in which channel. */
function fakeApi() {
  const calls: { method: string; body: Record<string, unknown> }[] = []
  const files: { chat: string; name: string; caption: string; size: number }[] = []
  const members: Record<string, Set<number>> = { "@inspiringuz": new Set(), [CLOSED]: new Set() }
  let msg = 0
  const api: Api = {
    call: (async (method: string, body: Record<string, unknown>) => {
      calls.push({ method, body })
      switch (method) {
        case "getMe":
          return { id: BOT, username: "inspiring_test_bot" }
        case "getChat":
          return { id: Number(body.chat_id), title: `Kanal ${body.chat_id}` }
        case "getChatMemberCount":
          return 42
        case "sendMessage":
          return { message_id: ++msg }
        case "getChatMember":
          if (body.user_id === BOT) return { status: "administrator", can_invite_users: true }
          return { status: members[String(body.chat_id)]?.has(Number(body.user_id)) ? "member" : "left" }
        case "createChatInviteLink":
          return { invite_link: "https://t.me/+personal" }
        default:
          return true
      }
    }) as Api["call"],
    sendFile: (async (chat: string, file: { name: string; data: Uint8Array }, caption = "") => {
      files.push({ chat, name: file.name, caption, size: file.data.length })
      return true
    }) as Api["sendFile"],
  }
  const sent = (to: number) =>
    calls
      .filter((c) => c.method === "sendMessage" && String(c.body.chat_id) === String(to))
      .map((c) => String(c.body.text))
  /** What the user sees last: a new message or an edited one. */
  const shown = (to: number) =>
    String(
      calls
        .filter((c) => ["sendMessage", "editMessageText"].includes(c.method) && String(c.body.chat_id) === String(to))
        .at(-1)?.body.text,
    )
  return { api, calls, files, members, sent, shown }
}

let id = 0
const msg = (from: number, text: string): Update => ({
  update_id: ++id,
  message: { message_id: id, chat: { id: from, type: "private" }, from: { id: from, first_name: `U${from}` }, text },
})
const contact = (from: number, phone: string): Update => ({
  update_id: ++id,
  message: {
    message_id: id,
    chat: { id: from, type: "private" },
    from: { id: from, first_name: `U${from}` },
    contact: { phone_number: phone, user_id: from },
  },
})
const cb = (from: number, data: string): Update => ({
  update_id: ++id,
  callback_query: {
    id: String(++id),
    from: { id: from },
    message: { message_id: 1, chat: { id: from, type: "private" } },
    data,
  },
})

describe("bot", () => {
  let store: Store
  let t: ReturnType<typeof fakeApi>
  let bot: ReturnType<typeof createBot>

  beforeEach(() => {
    store = openStore(":memory:")
    t = fakeApi()
    bot = createBot(
      t.api,
      store,
      {
        admins: [String(ADMIN)],
        channel: "@inspiringuz",
        closedChannel: CLOSED,
        goal: 5,
        reportHour: 20,
        site: "https://x",
      },
      () => {},
    )
  })

  async function register(user: number, start = "/start", student = false) {
    for (const u of [
      msg(user, start),
      msg(user, "Ali"),
      msg(user, "Valiyev"),
      msg(user, "Rustamovich"),
      cb(user, "f:grade:6"),
      cb(user, "f:region:5"),
      cb(user, "f:district:0"),
      ...(student ? [cb(user, "f:isStudent:1"), cb(user, "f:branch:0")] : [cb(user, "f:isStudent:0")]),
      contact(user, "+998901234567"),
      cb(user, "f:ok"),
    ]) {
      await bot.handle(u)
    }
  }

  it("collects a lead, sends it to the admins and asks to subscribe", async () => {
    await register(100)
    const lead = store.lead(100)
    expect(lead).toMatchObject({ first_name: "Ali", last_name: "Valiyev", grade: 6, region: "Samarqand viloyati" })
    expect(lead?.district).toBe("Samarqand shahri")
    expect(t.sent(ADMIN).at(-1)).toContain("Yangi lid")
    expect(t.sent(ADMIN).at(-1)).toContain("+998 90 123 45 67")
    expect(t.sent(100).at(-1)).toContain("obuna bo‘ling")

    t.members["@inspiringuz"].add(100)
    await bot.handle(cb(100, "sub:check"))
    expect(t.sent(100).at(-1)).toContain("Asosiy menyu")
  })

  it("counts five subscribed friends, then lets only the inviter into the closed channel", async () => {
    t.members["@inspiringuz"].add(100)
    await register(100)
    // Not new to the bot: does not count.
    await bot.handle(msg(100, "/start ref_100"))
    expect(store.user(100)?.referrer_id).toBeNull()

    for (const f of [201, 202, 203, 204, 205]) {
      t.members["@inspiringuz"].add(f)
      await register(f, "/start ref_100")
    }
    // One more starts but never subscribes.
    await register(206, "/start ref_100")
    expect(store.credited(100)).toEqual([201, 202, 203, 204, 205])
    const notes = t.sent(100).filter((s) => s.includes("Do‘stingiz"))
    expect(notes).toHaveLength(5)
    expect(notes.at(-1)).toContain("Online darsga qo‘shilish huquqini oldingiz")

    await bot.handle(cb(100, "cl:open"))
    const link = t.calls.find((c) => c.method === "createChatInviteLink")
    expect(link?.body).toMatchObject({ chat_id: CLOSED, creates_join_request: true, name: "u100" })
    expect(store.user(100)?.unlocked_at).toBeTruthy()

    const join = (from: number): Update => ({
      update_id: ++id,
      chat_join_request: { chat: { id: Number(CLOSED) }, from: { id: from }, user_chat_id: from },
    })
    await bot.handle(join(100))
    await bot.handle(join(201))
    expect(t.calls.filter((c) => c.method === "approveChatJoinRequest").map((c) => c.body.user_id)).toEqual([100])
    expect(t.calls.filter((c) => c.method === "declineChatJoinRequest").map((c) => c.body.user_id)).toEqual([201])
    expect(store.user(100)?.joined_at).toBeTruthy()
  })

  it("does not open the channel if counted friends have left @inspiringuz since", async () => {
    t.members["@inspiringuz"].add(100)
    await register(100)
    for (const f of [301, 302, 303, 304, 305]) {
      t.members["@inspiringuz"].add(f)
      await register(f, "/start ref_100")
    }
    t.members["@inspiringuz"].delete(303)
    await bot.handle(cb(100, "cl:open"))
    expect(t.calls.some((c) => c.method === "createChatInviteLink")).toBe(false)
    expect(t.sent(100).at(-1)).toContain("4/5")
  })

  it("gives admins Excel and the daily report once", async () => {
    t.members["@inspiringuz"].add(100)
    await register(100)
    await bot.handle(msg(ADMIN, "/excel"))
    await bot.handle(cb(ADMIN, "a:xl:all"))
    expect(t.files[0]).toMatchObject({ chat: String(ADMIN) })
    expect(t.files[0].name).toMatch(/^lidlar_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.xlsx$/)

    const eight = Date.UTC(2026, 10, 10, 15, 0) // 20:00 in Tashkent
    store.setMeta("daily_report", "")
    await bot.tick(eight)
    await bot.tick(eight + 60_000)
    expect(t.sent(ADMIN).filter((s) => s.includes("Kunlik hisobot"))).toHaveLength(1)
  })

  it("admin panel: connects the closed channel with the picker and changes the goal", async () => {
    bot.settings.set({ closedChannel: "", closedTitle: "" })
    await bot.handle(msg(ADMIN, "/admin"))
    expect(t.sent(ADMIN).at(-1)).toContain("⚠️ Online dars kanali ulanmagan")
    await bot.handle(cb(ADMIN, "a:cl:pick"))
    const picker = t.calls.at(-1)?.body.reply_markup as { keyboard: { request_chat?: object }[][] }
    expect(picker.keyboard[0][0].request_chat).toMatchObject({ request_id: 1, chat_is_channel: true })
    await bot.handle({
      update_id: ++id,
      message: {
        message_id: ++id,
        chat: { id: ADMIN, type: "private" },
        from: { id: ADMIN },
        chat_shared: { request_id: 1, chat_id: -100777 },
      },
    })
    expect(bot.settings.get()).toMatchObject({ closedChannel: "-100777", closedTitle: "Kanal -100777" })

    // Sections keep the panel short; deeper screens lead back to their section.
    const panel = t.calls.find((c) => String(c.body.text).startsWith("⚙️ <b>Admin panel"))?.body.reply_markup as {
      inline_keyboard: unknown[][]
    }
    expect(panel.inline_keyboard.length).toBeLessThanOrEqual(5)
    await bot.handle(cb(ADMIN, "a:g:online"))
    expect(t.shown(ADMIN)).toContain("Kerakli do‘stlar")
    await bot.handle(cb(ADMIN, "a:goal"))
    const goalKb = t.calls.at(-1)?.body.reply_markup as { inline_keyboard: { callback_data?: string }[][] }
    expect(goalKb.inline_keyboard.at(-1)?.[0].callback_data).toBe("a:g:online")
    await bot.handle(cb(ADMIN, "a:goal:3"))
    expect(bot.settings.get().goal).toBe(3)
    // Not an admin: the panel's buttons do nothing.
    await bot.handle(cb(100, "a:goal:1"))
    expect(bot.settings.get().goal).toBe(3)
  })

  it("admin panel: finds a user, opens the closed courses by hand, broadcasts, adds an admin", async () => {
    t.members["@inspiringuz"].add(100)
    await register(100)
    await bot.handle(cb(ADMIN, "a:find"))
    await bot.handle(msg(ADMIN, "90 123 45 67"))
    expect(t.sent(ADMIN).at(-1)).toContain("Valiyev Ali Rustamovich")
    await bot.handle(cb(ADMIN, "a:u:open:100"))
    expect(store.user(100)?.unlocked_at).toBeTruthy()
    expect(t.sent(100).at(-1)).toContain("online dars ochildi")

    await bot.handle(cb(ADMIN, "a:bc"))
    await bot.handle(msg(ADMIN, "Ertaga ochiq dars!"))
    await bot.handle(cb(ADMIN, "a:bc:leads"))
    await new Promise((r) => setTimeout(r, 100))
    const copies = t.calls.filter((c) => c.method === "copyMessage")
    expect(copies.map((c) => c.body.chat_id)).toEqual([100])

    await bot.handle(cb(ADMIN, "a:adm:add"))
    await bot.handle(msg(ADMIN, "555666777"))
    expect(bot.settings.get().admins).toContain("555666777")
    await bot.handle(cb(ADMIN, "a:adm:del:555666777"))
    expect(bot.settings.get().admins).not.toContain("555666777")
  })

  it("keeps the admin panel button when an admin tries the user side", async () => {
    t.members["@inspiringuz"].add(ADMIN)
    await register(ADMIN, "/anketa")
    const menu = t.calls.filter((c) => String(c.body.text).includes("Asosiy menyu")).at(-1)?.body.reply_markup as {
      keyboard: { text: string }[][]
    }
    expect(menu.keyboard.at(-1)?.[0].text).toBe("⚙️ Admin panel")
    await bot.handle(msg(ADMIN, "⚙️ Admin panel"))
    expect(t.sent(ADMIN).at(-1)).toContain("Admin panel")
    // Ordinary users don't get it.
    t.members["@inspiringuz"].add(100)
    await register(100)
    const userMenu = t.calls
      .filter((c) => c.body.chat_id === 100 && String(c.body.text).includes("Asosiy menyu"))
      .at(-1)?.body.reply_markup as { keyboard: { text: string }[][] }
    expect(userMenu.keyboard.flat().some((b) => b.text.includes("Admin"))).toBe(false)
  })

  it("offers a channel the bot was just made admin of", async () => {
    await bot.handle({
      update_id: ++id,
      my_chat_member: {
        chat: { id: -100888, type: "channel", title: "Maxsus darslar" },
        from: { id: ADMIN },
        new_chat_member: { status: "administrator" },
      },
    })
    const note = t.calls.at(-1)
    expect(String(note?.body.text)).toContain("Maxsus darslar")
    await bot.handle(cb(ADMIN, "a:set:cl:-100888"))
    expect(bot.settings.get().closedChannel).toBe("-100888")
  })

  it("sends only people who don't study at Inspiring as leads", async () => {
    t.members["@inspiringuz"].add(400)
    await register(400, "/start", true)
    expect(store.lead(400)).toMatchObject({ is_student: 1, branch: "Chilonzor" })
    expect(t.sent(ADMIN).some((m) => m.includes("Yangi lid"))).toBe(false)
    expect(store.counts(0)).toMatchObject({ leads: 0, students: 1 })

    // Fills the form again, now as someone who doesn't study with us: that is a new lead.
    await register(400, "/anketa")
    expect(t.sent(ADMIN).filter((m) => m.includes("Yangi lid"))).toHaveLength(1)
    expect(store.counts(0)).toMatchObject({ leads: 1, students: 0 })
  })

  describe("call centre and marketing", () => {
    beforeEach(() => {
      bot = createBot(
        t.api,
        store,
        {
          admins: [String(ADMIN), String(OTHER_ADMIN)],
          callCenter: [String(CALL)],
          channel: "@inspiringuz",
          closedChannel: CLOSED,
          goal: 5,
          reportHour: 20,
          site: "https://x",
        },
        () => {},
      )
    })

    it("sends bot leads and site applications only to the call centre, with status buttons", async () => {
      t.members["@inspiringuz"].add(100)
      await register(100)
      expect(t.sent(CALL).at(-1)).toContain("Yangi lid")
      expect(t.sent(ADMIN).some((m) => m.includes("Yangi lid"))).toBe(false)
      expect(t.sent(OTHER_ADMIN)).toEqual([])

      const delivered = await bot.siteLead({
        firstName: "Dilnoza",
        lastName: "Karimova",
        phone: "+998901112233",
        lang: "uz",
      })
      expect(delivered).toBe(1)
      expect(t.sent(CALL).at(-1)).toContain("Yangi ariza")
      const site = store.siteLeads()[0]
      expect(site).toMatchObject({ first_name: "Dilnoza", status: "new" })

      // The operator marks both leads.
      const press = (data: string) => bot.handle({ ...cb(CALL, data) })
      await press("ld:b:100:contacted")
      await press(`ld:s:${site.id}:enrolled`)
      expect(store.lead(100)?.status).toBe("contacted")
      expect(store.siteLead(site.id)).toMatchObject({ status: "enrolled" })
      const edited = t.calls.filter((c) => c.method === "editMessageText").at(-1)
      expect(String(edited?.body.text)).toContain("✅ Yozildi")
      // Someone else can't change it.
      await bot.handle(cb(555, "ld:b:100:refused"))
      expect(store.lead(100)?.status).toBe("contacted")
      expect(store.statusCounts()).toMatchObject({ contacted: 1, enrolled: 1 })
    })

    it("sends a consultation request to the call centre once", async () => {
      t.members["@inspiringuz"].add(100)
      await register(100)
      await bot.handle(msg(100, "📞 Konsultatsiya olish"))
      await bot.handle(cb(100, "u:consult"))
      await bot.handle(cb(100, "u:consult"))
      expect(t.sent(CALL).filter((m) => m.includes("Konsultatsiya so‘radi"))).toHaveLength(1)
    })

    it("counts people from an ad link and shows it on the card", async () => {
      expect(slug("Instagram Stories, 12-noyabr")).toBe("instagram_stories_12_noyabr")
      store.addSource("insta_bio", "Instagram bio")
      t.members["@inspiringuz"].add(700)
      await register(700, "/start src_insta_bio")
      expect(store.user(700)?.source).toBe("insta_bio")
      expect(t.sent(CALL).at(-1)).toContain("Manba:</b> Instagram bio")
      expect(store.sources()[0]).toMatchObject({ code: "insta_bio", users: 1, leads: 1 })
      // Unknown codes are ignored.
      await register(701, "/start src_nope")
      expect(store.user(701)?.source).toBeNull()
    })

    it("shows the new menu screens and the weekly rating", async () => {
      t.members["@inspiringuz"].add(100)
      await register(100)
      for (const f of [801, 802]) {
        t.members["@inspiringuz"].add(f)
        await register(f, "/start ref_100")
      }
      await bot.handle(cb(100, "o:rating"))
      expect(t.shown(100)).toMatch(/🥇 Ali V\. — <b>2<\/b> ← siz/)
      await bot.handle(msg(100, "🏆 Natijalarimiz"))
      expect(t.sent(100).at(-1)).toContain("Prezident maktablari")
      await bot.handle(msg(100, "📍 Filiallar"))
      expect(t.sent(100).at(-1)).toContain("yandex.uz/maps")
      await bot.handle(msg(100, "🎓 Online dars"))
      expect(t.sent(100).at(-1)).toContain("2/5")
    })

    it("reminds once about an unfinished form", async () => {
      await bot.handle(msg(900, "/start"))
      await bot.handle(msg(900, "Ali"))
      const later = Date.now() + 2 * 3_600_000
      await bot.tick(later)
      await bot.tick(later + 60_000)
      expect(t.sent(900).filter((m) => m.includes("Anketani oxiriga yetkazmadingiz"))).toHaveLength(1)
    })
  })

  describe("monitoring test", () => {
    const NOV12 = Date.UTC(2026, 10, 12, 14, 0) // 19:00 Tashkent, 3 days before
    const NOV14 = Date.UTC(2026, 10, 14, 14, 0) // 19:00, the eve
    const NOV15 = Date.UTC(2026, 10, 15, 2, 0) // 07:00 on the day

    async function signUp(user: number, grade = 6, branch = 0) {
      await bot.handle(cb(user, "m:reg"))
      await bot.handle(cb(user, `m:g:${grade}`))
      await bot.handle(cb(user, `m:b:${branch}`))
    }

    it("registers for the test with a grade and a Tashkent branch", async () => {
      t.members["@inspiringuz"].add(100)
      await register(100)
      await bot.handle(msg(100, "📝 Monitoring testi"))
      expect(t.sent(100).at(-1)).toContain("Yutuqli monitoring test")
      expect(t.sent(100).at(-1)).toContain("15-noyabr, yakshanba")
      await signUp(100, 7, 1)
      expect(store.monitoring(100)).toMatchObject({ grade: 7, branch: "Sergeli" })
      expect(t.shown(100)).not.toBe("")
      const congrats = t.calls.filter((c) => String(c.body.text).includes("Tabriklaymiz! Siz monitoring"))
      expect(congrats).toHaveLength(1)
      // Grades outside 5–8 are not offered.
      await bot.handle(cb(100, "m:g:9"))
      expect(store.monitoring(100)?.grade).toBe(7)
    })

    it("gives +1 point for each friend who registers through the link, counted apart", async () => {
      for (const u of [100, 201, 202]) t.members["@inspiringuz"].add(u)
      await register(100)
      await signUp(100)
      await register(201, "/start mon_100")
      expect(t.sent(201).at(-1)).toContain("Yutuqli monitoring test") // lands on the test
      await signUp(201)
      await register(202, "/start mon_100") // starts but doesn't register for the test
      expect(store.monitoringPoints(100)).toBe(1)
      expect(t.sent(100).some((m) => m.includes("+1 ball"))).toBe(true)
      await bot.handle(cb(100, "m:pts"))
      expect(t.shown(100)).toContain("Sizning ballaringiz: <b>1</b>")
      expect(t.shown(100)).toContain("hali ro‘yxatdan o‘tmagan")
    })

    it("reminds every evening, in detail on the eve and on the morning", async () => {
      t.members["@inspiringuz"].add(100)
      await register(100)
      await signUp(100, 5, 0)
      await bot.tick(NOV12)
      await bot.tick(NOV12 + 60_000)
      await bot.tick(NOV14)
      await bot.tick(NOV15)
      const notes = t.sent(100).filter((m) => /monitoring test/i.test(m) && /qoldi|Ertaga|Bugun/.test(m))
      expect(notes).toHaveLength(3)
      expect(notes[0]).toContain("3 kun</b> qoldi")
      expect(notes[1]).toContain("Ertaga — monitoring test!")
      expect(notes[1]).toContain("Novza metro")
      expect(notes[2]).toContain("Bugun — monitoring test!")
    })

    it("lets admins download the list and close registration", async () => {
      t.members["@inspiringuz"].add(100)
      await register(100)
      await signUp(100)
      await bot.handle(cb(ADMIN, "a:mon"))
      expect(t.shown(ADMIN)).toContain("Ro‘yxatdan o‘tganlar: <b>1</b>")
      await bot.handle(cb(ADMIN, "a:mon:xl"))
      expect(t.files.at(-1)?.name).toMatch(/^monitoring_/)
      await bot.handle(cb(ADMIN, "a:mon:open"))
      expect(bot.settings.get().monitoring.open).toBe(false)
      await bot.handle(cb(100, "m:reg"))
      expect(t.calls.at(-1)?.body.text).toContain("yopilgan")
    })
  })
})
