/** Minimal Telegram Bot API client: just the calls this site needs, over plain fetch. */

type Button = { text: string; url: string }

/** `base` can point at a stand-in Bot API for testing (TELEGRAM_API in .env); normally Telegram's own. */
export function telegram(token: string, base = process.env.TELEGRAM_API || "https://api.telegram.org") {
  const parse = async <T>(method: string, res: Response): Promise<T> => {
    const data = (await res.json()) as { ok: boolean; result: T; description?: string }
    if (!data.ok) throw new Error(`${method}: ${data.description ?? res.status}`)
    return data.result
  }
  const call = async <T>(method: string, body: Record<string, unknown>): Promise<T> => {
    const res = await fetch(`${base}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(method === "getUpdates" ? 40_000 : 10_000),
    })
    return parse<T>(method, res)
  }

  return {
    call,
    send: (chatId: string, text: string, buttons: Button[][] = []) =>
      call("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        ...(buttons.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
      }),
    /** sendDocument with a file made in memory (multipart upload). */
    sendFile: async (chatId: string, file: { name: string; data: Uint8Array; type: string }, caption = "") => {
      const form = new FormData()
      form.set("chat_id", chatId)
      if (caption) form.set("caption", caption)
      form.set("parse_mode", "HTML")
      form.set("document", new Blob([new Uint8Array(file.data)], { type: file.type }), file.name)
      const res = await fetch(`${base}/bot${token}/sendDocument`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(60_000),
      })
      return parse("sendDocument", res)
    },
  }
}

export type Telegram = ReturnType<typeof telegram>

/** The parts of an update the bot reads. */
export type Update = {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number; type: string }
    from?: { id: number; first_name?: string; last_name?: string; username?: string }
    text?: string
    contact?: { phone_number: string; user_id?: number }
    /** Answer to a "choose a channel" button. */
    chat_shared?: { request_id: number; chat_id: number; title?: string; username?: string }
    /** Answer to a "choose a user" button. */
    users_shared?: { request_id: number; users: { user_id: number; first_name?: string }[] }
  }
  callback_query?: {
    id: string
    from: { id: number; first_name?: string; last_name?: string; username?: string }
    message?: { message_id: number; chat: { id: number; type: string }; text?: string }
    data?: string
  }
  chat_join_request?: {
    chat: { id: number; username?: string }
    from: { id: number; first_name?: string; username?: string }
    user_chat_id?: number
    invite_link?: { invite_link: string; name?: string }
  }
  /** The bot's own status changed in a chat (e.g. it was made a channel admin). */
  my_chat_member?: {
    chat: { id: number; type: string; title?: string; username?: string }
    from: { id: number }
    new_chat_member: { status: string; can_invite_users?: boolean }
  }
}

/**
 * Long polling: no webhook or public URL needed. Runs until the process exits. Updates from different people are
 * handled side by side; one person's updates stay in order.
 */
export async function poll(bot: Telegram, handle: (u: Update) => Promise<void>, log: (m: string) => void) {
  let offset = 0
  const queues = new Map<number, Promise<void>>()
  for (;;) {
    try {
      const updates = await bot.call<Update[]>("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message", "callback_query", "chat_join_request", "my_chat_member"],
      })
      for (const u of updates) {
        offset = u.update_id + 1
        const who =
          u.message?.chat.id ??
          u.callback_query?.from.id ??
          u.chat_join_request?.from.id ??
          u.my_chat_member?.from.id ??
          0
        const run = (queues.get(who) ?? Promise.resolve())
          .then(() => handle(u))
          .catch((e) => log(`update ${u.update_id}: ${(e as Error).message}`))
        queues.set(who, run)
        void run.then(() => queues.get(who) === run && queues.delete(who))
      }
    } catch (e) {
      log(`bot polling: ${(e as Error).message}`)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}
