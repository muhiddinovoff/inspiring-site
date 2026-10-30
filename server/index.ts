/**
 * The site's own server: serves the built site from dist/ and takes applications at POST /api/lead, passing each
 * one to the call centre through the Telegram bot. The bot token lives only here, in .env, never in the site.
 *
 *     npm run build && npm run server
 *
 * Settings (.env next to package.json, see .env.example):
 *   TELEGRAM_BOT_TOKEN   from @BotFather
 *   TELEGRAM_CHAT_IDS    who gets the applications, comma-separated (each must have pressed Start in the bot)
 *   PORT                 default 3000;  HOST  default 127.0.0.1 (behind nginx)
 *   TRUST_PROXY=1        behind nginx: take the visitor's IP from X-Forwarded-For (for the rate limit)
 */
import { createReadStream, existsSync, statSync } from "node:fs"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { extname, join, normalize, resolve } from "node:path"

import { leadMessage, parseLead } from "./lead.ts"
import { answerCommands, telegram } from "./telegram.ts"

const ROOT = resolve(import.meta.dirname, "..")
if (existsSync(join(ROOT, ".env"))) process.loadEnvFile(join(ROOT, ".env"))

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ""
const CHATS = (process.env.TELEGRAM_CHAT_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? "127.0.0.1"
const TRUST_PROXY = process.env.TRUST_PROXY === "1"
const DIST = resolve(ROOT, process.env.DIST ?? "dist")

const log = (m: string) => console.log(`${new Date().toISOString()} ${m}`)
const bot = TOKEN ? telegram(TOKEN) : null
if (!bot || !CHATS.length) log("⚠ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS is missing: applications will be refused")

// At most 5 applications per visitor per 10 minutes.
const WINDOW = 10 * 60_000
const LIMIT = 5
const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 10_000) hits.clear()
  return recent.length > LIMIT
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage, max = 16_384) {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > max) throw new Error("too large")
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString("utf8")
}

async function handleLead(req: IncomingMessage, res: ServerResponse) {
  const ip =
    (TRUST_PROXY &&
      String(req.headers["x-forwarded-for"] ?? "")
        .split(",")[0]
        .trim()) ||
    req.socket.remoteAddress ||
    "?"
  if (limited(ip)) return json(res, 429, { ok: false, error: "rate" })
  let body: unknown
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    return json(res, 400, { ok: false, error: "body" })
  }
  // Honeypot: a field people never see. Bots fill it; pretend all is well and drop the application.
  if ((body as { website?: unknown })?.website) return json(res, 200, { ok: true })
  const parsed = parseLead(body)
  if ("error" in parsed) return json(res, 400, { ok: false, error: parsed.error })
  if (!bot || !CHATS.length) return json(res, 503, { ok: false, error: "not configured" })

  const { text, buttons } = leadMessage(parsed.lead)
  const results = await Promise.allSettled(CHATS.map((id) => bot.send(id, text, buttons)))
  results.forEach((r, i) => r.status === "rejected" && log(`telegram → ${CHATS[i]}: ${r.reason}`))
  const delivered = results.filter((r) => r.status === "fulfilled").length
  log(`lead ${parsed.lead.phone.slice(0, 6)}… delivered to ${delivered}/${CHATS.length}`)
  return delivered ? json(res, 200, { ok: true }) : json(res, 502, { ok: false, error: "telegram" })
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
}

function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)
  let file = normalize(join(DIST, path))
  if (!file.startsWith(DIST)) return json(res, 403, { ok: false })
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html")
  // Unknown addresses get the home page (the site is one page with #anchors).
  if (!existsSync(file)) file = join(DIST, "index.html")
  const hashed = file.includes(`${join(DIST, "assets")}`)
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": hashed ? "public, max-age=31536000, immutable" : "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  })
  createReadStream(file).pipe(res)
}

createServer((req, res) => {
  const url = req.url ?? "/"
  if (url.startsWith("/api/lead")) {
    if (req.method !== "POST") return json(res, 405, { ok: false })
    handleLead(req, res).catch((e) => {
      log(`lead: ${(e as Error).message}`)
      if (!res.headersSent) json(res, 500, { ok: false })
    })
    return
  }
  if (url === "/api/health") return json(res, 200, { ok: true, bot: Boolean(bot), chats: CHATS.length })
  if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { ok: false })
  serveStatic(req, res)
}).listen(PORT, HOST, () => log(`Inspiring site on http://${HOST}:${PORT} (dist: ${DIST})`))

if (bot) void answerCommands(bot, log)
