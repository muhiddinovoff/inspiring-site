import { SITE_ROOT } from "@/lib/site-root"

/** One application, as the form sends it. The server (server/lead.ts) checks it again before passing it on. */
export type Lead = {
  firstName: string
  lastName: string
  phone: string
  lang: string
  source: string
  /** Only when the visitor allowed it. */
  location?: { lat: number; lng: number; accuracy?: number }
  nearest?: { name: string; km: number }
  page?: string
  /** Honeypot: a field hidden from people. Only bots fill it, and the server drops what they send. */
  website?: string
}

/**
 * Where applications go. By default the site's own server (server/index.ts), which passes them to the call centre
 * through the Telegram bot. VITE_LEAD_ENDPOINT can point elsewhere (e.g. a Google Apps Script, see docs/).
 */
const ENDPOINT = (import.meta.env.VITE_LEAD_ENDPOINT as string | undefined) || `${SITE_ROOT}api/lead`

export async function submitLead(lead: Lead): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      // text/plain keeps a cross-site endpoint free of a CORS preflight; the server parses JSON either way.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ website: "", ...lead, createdAt: new Date().toISOString() }),
    })
    return res.ok || res.type === "opaque"
  } catch {
    return false
  }
}
