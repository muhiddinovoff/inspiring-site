import { beforeEach, describe, expect, it } from "vitest"

import type { Update } from "../telegram.ts"
import { type Api, createBot } from "./bot.ts"
import { openStore, type Store } from "./db.ts"

const ADMIN = 1
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
  return { api, calls, files, members, sent }
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
    expect(notes.at(-1)).toContain("Yopiq kurslar siz uchun ochildi")

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
    expect(t.sent(ADMIN).at(-1)).toContain("Yopiq kanal: ⚠️")
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
    expect(t.sent(100).at(-1)).toContain("yopiq kurslar ochildi")

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
})
