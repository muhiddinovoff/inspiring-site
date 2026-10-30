/** Minimal Telegram Bot API client: just the calls this site needs, over plain fetch. */

type Button = { text: string; url: string }

/** `base` can point at a stand-in Bot API for testing (TELEGRAM_API in .env); normally Telegram's own. */
export function telegram(token: string, base = process.env.TELEGRAM_API || "https://api.telegram.org") {
  const call = async <T>(method: string, body: Record<string, unknown>): Promise<T> => {
    const res = await fetch(`${base}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(method === "getUpdates" ? 40_000 : 10_000),
    })
    const data = (await res.json()) as { ok: boolean; result: T; description?: string }
    if (!data.ok) throw new Error(`${method}: ${data.description ?? res.status}`)
    return data.result
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
  }
}

export type Telegram = ReturnType<typeof telegram>

type Update = { update_id: number; message?: { chat: { id: number }; text?: string; from?: { first_name?: string } } }

/**
 * Answers /start and /id with a short welcome and the chat's own ID, so a new call-centre operator can see what
 * to put in TELEGRAM_CHAT_IDS. Long polling: no webhook or public URL needed. Runs until the process exits.
 */
export async function answerCommands(bot: Telegram, log: (m: string) => void) {
  let offset = 0
  for (;;) {
    try {
      const updates = await bot.call<Update[]>("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] })
      for (const u of updates) {
        offset = u.update_id + 1
        const m = u.message
        if (!m?.text || !/^\/(start|id)\b/.test(m.text)) continue
        const name = m.from?.first_name ? `, ${m.from.first_name.replace(/[<>&]/g, "")}` : ""
        await bot.send(
          String(m.chat.id),
          [
            `<b>Assalomu alaykum${name}!</b> 👋`,
            "",
            "Bu <b>Inspiring Education</b> boti: saytdagi har bir yangi ariza shu yerga keladi — ism, familiya, telefon va (ruxsat berilsa) joylashuv bilan.",
            "",
            `🆔 Sizning chat ID: <code>${m.chat.id}</code>`,
            "Arizalar sizga ham kelishi uchun shu raqamni administratorga yuboring.",
          ].join("\n"),
        )
      }
    } catch (e) {
      log(`bot polling: ${(e as Error).message}`)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}
