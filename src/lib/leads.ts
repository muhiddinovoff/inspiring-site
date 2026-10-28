export type Lead = {
  name: string
  phone: string
  grade?: string
  lang: string
  source: string
}

/**
 * Where applications are sent. Set VITE_LEAD_ENDPOINT in `.env.local` (or the host's env settings)
 * to any URL that accepts a JSON POST: a Google Apps Script web app, a Telegram bot relay, a CRM webhook.
 */
const ENDPOINT = import.meta.env.VITE_LEAD_ENDPOINT as string | undefined

export async function submitLead(lead: Lead): Promise<boolean> {
  if (!ENDPOINT) return false
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...lead, createdAt: new Date().toISOString() }),
    })
    return res.ok || res.type === "opaque"
  } catch {
    return false
  }
}
