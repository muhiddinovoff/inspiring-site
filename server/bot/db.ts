/**
 * The bot's own storage: one SQLite file (Node's built-in node:sqlite, no extra packages). Default data/bot.db,
 * outside git. Back it up by copying the file.
 */
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"

export type User = {
  id: number
  username: string | null
  name: string
  started_at: number
  /** Who invited this user (from the /start ref_ link), if anyone. */
  referrer_id: number | null
  /** When this user started counting as a referral for referrer_id (registered and subscribed). */
  credited_at: number | null
  /** Registration step in progress, and the answers so far (JSON). */
  step: string | null
  draft: string | null
  /** When the user earned the closed courses. */
  unlocked_at: number | null
  invite_link: string | null
  invite_expires: number | null
  joined_at: number | null
  /** Ad link code (src_…), "referral", or null when the user came on their own. */
  source: string | null
  /** When we reminded them to finish the form. */
  reminded_at: number | null
}

/** Where the call centre is with a lead. */
export const STATUSES = {
  new: "🆕 Yangi",
  contacted: "📞 Bog‘lanildi",
  noanswer: "📵 Javob bermadi",
  enrolled: "✅ Yozildi",
  refused: "❌ Rad etdi",
} as const
export type Status = keyof typeof STATUSES
export const isStatus = (s: unknown): s is Status => typeof s === "string" && s in STATUSES

export type Lead = {
  user_id: number
  first_name: string
  last_name: string
  middle_name: string
  grade: number
  region: string
  district: string
  /** 1: already studies at Inspiring Education. */
  is_student: number
  branch: string | null
  phone: string
  created_at: number
  updated_at: number
  status: Status
  status_by: string | null
  status_at: number | null
}

/** An application from the website form. */
export type SiteLead = {
  id: number
  first_name: string
  last_name: string
  phone: string
  lang: string
  lat: number | null
  lng: number | null
  accuracy: number | null
  nearest: string | null
  nearest_km: number | null
  page: string | null
  created_at: number
  status: Status
  status_by: string | null
  status_at: number | null
}

export type Source = { code: string; name: string; created_at: number; users: number; leads: number; enrolled: number }

/** A lead with what the reports need about its user. */
export type LeadRow = Lead & {
  username: string | null
  tg_name: string
  referrer_id: number | null
  referrer_name: string | null
  referrals: number
  unlocked_at: number | null
  joined_at: number | null
  source: string | null
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  name TEXT NOT NULL DEFAULT '',
  started_at INTEGER NOT NULL,
  referrer_id INTEGER,
  credited_at INTEGER,
  step TEXT,
  draft TEXT,
  unlocked_at INTEGER,
  invite_link TEXT,
  invite_expires INTEGER,
  joined_at INTEGER
);
CREATE INDEX IF NOT EXISTS users_referrer ON users (referrer_id, credited_at);
CREATE TABLE IF NOT EXISTS leads (
  user_id INTEGER PRIMARY KEY REFERENCES users (id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  region TEXT NOT NULL,
  district TEXT NOT NULL,
  is_student INTEGER NOT NULL,
  branch TEXT,
  phone TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS leads_created ON leads (created_at);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS site_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  lang TEXT NOT NULL,
  lat REAL, lng REAL, accuracy REAL,
  nearest TEXT, nearest_km REAL,
  page TEXT,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  status_by TEXT,
  status_at INTEGER
);
CREATE TABLE IF NOT EXISTS sources (code TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL);
`

/** Columns added after the first release; created on start when an older database lacks them. */
const ADDED: [table: string, column: string, type: string][] = [
  ["users", "source", "TEXT"],
  ["users", "reminded_at", "INTEGER"],
  ["leads", "status", "TEXT NOT NULL DEFAULT 'new'"],
  ["leads", "status_by", "TEXT"],
  ["leads", "status_at", "INTEGER"],
]

const LEAD_ROWS = `
  SELECT l.*, u.username, u.name AS tg_name, u.referrer_id, u.unlocked_at, u.joined_at, u.source,
    TRIM(COALESCE(rl.last_name || ' ' || rl.first_name, r.name)) AS referrer_name,
    (SELECT COUNT(*) FROM users x WHERE x.referrer_id = u.id AND x.credited_at IS NOT NULL) AS referrals
  FROM leads l JOIN users u ON u.id = l.user_id
  LEFT JOIN users r ON r.id = u.referrer_id LEFT JOIN leads rl ON rl.user_id = u.referrer_id`

export function openStore(file: string) {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;")
  db.exec(SCHEMA)
  for (const [table, column, type] of ADDED) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }

  const q = {
    user: db.prepare("SELECT * FROM users WHERE id = ?"),
    addUser: db.prepare(
      "INSERT INTO users (id, username, name, started_at, referrer_id, source) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
    ),
    touch: db.prepare("UPDATE users SET username = ?, name = ? WHERE id = ?"),
    step: db.prepare("UPDATE users SET step = ?, draft = ? WHERE id = ?"),
    credit: db.prepare("UPDATE users SET credited_at = ? WHERE id = ? AND credited_at IS NULL"),
    credited: db.prepare("SELECT id FROM users WHERE referrer_id = ? AND credited_at IS NOT NULL ORDER BY credited_at"),
    invited: db.prepare(`
      SELECT u.id, u.name, u.credited_at, TRIM(l.last_name || ' ' || l.first_name) AS lead
      FROM users u LEFT JOIN leads l ON l.user_id = u.id WHERE u.referrer_id = ? ORDER BY u.started_at`),
    unlock: db.prepare("UPDATE users SET unlocked_at = ? WHERE id = ? AND unlocked_at IS NULL"),
    invite: db.prepare("UPDATE users SET invite_link = ?, invite_expires = ? WHERE id = ?"),
    joined: db.prepare("UPDATE users SET joined_at = ?, invite_link = NULL, invite_expires = NULL WHERE id = ?"),
    lead: db.prepare("SELECT * FROM leads WHERE user_id = ?"),
    saveLead: db.prepare(`
      INSERT INTO leads (user_id, first_name, last_name, middle_name, grade, region, district, is_student, branch, phone, created_at, updated_at)
      VALUES (:user_id, :first_name, :last_name, :middle_name, :grade, :region, :district, :is_student, :branch, :phone, :now, :now)
      ON CONFLICT (user_id) DO UPDATE SET first_name = :first_name, last_name = :last_name, middle_name = :middle_name,
        grade = :grade, region = :region, district = :district, is_student = :is_student, branch = :branch,
        phone = :phone, updated_at = :now`),
    leadRows: db.prepare(`${LEAD_ROWS} WHERE l.created_at >= ? ORDER BY l.created_at`),
    leadRow: db.prepare(`${LEAD_ROWS} WHERE l.user_id = ?`),
    counts: db.prepare(`
      SELECT (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM users WHERE started_at >= :since) AS users_today,
        (SELECT COUNT(*) FROM leads WHERE is_student = 0) AS leads,
        (SELECT COUNT(*) FROM leads WHERE is_student = 0 AND created_at >= :since) AS leads_today,
        (SELECT COUNT(*) FROM leads WHERE is_student = 1) AS students,
        (SELECT COUNT(*) FROM users WHERE credited_at IS NOT NULL) AS referrals,
        (SELECT COUNT(*) FROM users WHERE unlocked_at IS NOT NULL) AS unlocked,
        (SELECT COUNT(*) FROM users WHERE joined_at IS NOT NULL) AS joined`),
    revoke: db.prepare(
      "UPDATE users SET unlocked_at = NULL, joined_at = NULL, invite_link = NULL, invite_expires = NULL WHERE id = ?",
    ),
    allIds: db.prepare("SELECT id FROM users ORDER BY id"),
    leadIds: db.prepare("SELECT user_id AS id FROM leads ORDER BY user_id"),
    findById: db.prepare("SELECT id FROM users WHERE id = ?"),
    findByUsername: db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE"),
    findByPhone: db.prepare("SELECT user_id AS id FROM leads WHERE REPLACE(phone, '+', '') LIKE ? LIMIT 10"),
    findByName: db.prepare(`
      SELECT user_id AS id FROM leads
      WHERE (last_name || ' ' || first_name || ' ' || middle_name) LIKE ? OR (first_name || ' ' || last_name) LIKE ?
      ORDER BY updated_at DESC LIMIT 10`),
    topRegions: db.prepare(
      "SELECT region, COUNT(*) AS n FROM leads WHERE is_student = 0 GROUP BY region ORDER BY n DESC LIMIT 5",
    ),
    setStatus: db.prepare("UPDATE leads SET status = ?, status_by = ?, status_at = ? WHERE user_id = ?"),
    setSiteStatus: db.prepare("UPDATE site_leads SET status = ?, status_by = ?, status_at = ? WHERE id = ?"),
    addSite: db.prepare(`
      INSERT INTO site_leads (first_name, last_name, phone, lang, lat, lng, accuracy, nearest, nearest_km, page, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    site: db.prepare("SELECT * FROM site_leads WHERE id = ?"),
    sites: db.prepare("SELECT * FROM site_leads WHERE created_at >= ? ORDER BY created_at"),
    statusCounts: db.prepare(`
      SELECT status, COUNT(*) AS n FROM (
        SELECT status FROM leads WHERE is_student = 0 AND created_at >= :since
        UNION ALL SELECT status FROM site_leads WHERE created_at >= :since
      ) GROUP BY status`),
    unhandled: db.prepare(`
      SELECT 'b' AS kind, user_id AS id, last_name || ' ' || first_name AS name, phone, created_at FROM leads
        WHERE is_student = 0 AND status IN ('new', 'noanswer')
      UNION ALL SELECT 's', id, last_name || ' ' || first_name, phone, created_at FROM site_leads
        WHERE status IN ('new', 'noanswer')
      ORDER BY created_at DESC LIMIT 15`),
    unhandledCount: db.prepare(`
      SELECT (SELECT COUNT(*) FROM leads WHERE is_student = 0 AND status = 'new')
        + (SELECT COUNT(*) FROM site_leads WHERE status = 'new') AS n`),
    addSource: db.prepare(
      "INSERT INTO sources (code, name, created_at) VALUES (?, ?, ?) ON CONFLICT (code) DO NOTHING",
    ),
    delSource: db.prepare("DELETE FROM sources WHERE code = ?"),
    sources: db.prepare(`
      SELECT s.*, (SELECT COUNT(*) FROM users u WHERE u.source = s.code) AS users,
        (SELECT COUNT(*) FROM users u JOIN leads l ON l.user_id = u.id WHERE u.source = s.code AND l.is_student = 0) AS leads,
        (SELECT COUNT(*) FROM users u JOIN leads l ON l.user_id = u.id WHERE u.source = s.code AND l.status = 'enrolled') AS enrolled
      FROM sources s ORDER BY s.created_at DESC`),
    sourceName: db.prepare("SELECT name FROM sources WHERE code = ?"),
    otherSources: db.prepare(`
      SELECT COALESCE(u.source, '') AS code, COUNT(*) AS users,
        SUM(CASE WHEN l.is_student = 0 THEN 1 ELSE 0 END) AS leads
      FROM users u LEFT JOIN leads l ON l.user_id = u.id
      WHERE u.source IS NULL OR u.source = 'referral' GROUP BY COALESCE(u.source, '')`),
    toRemind: db.prepare(
      "SELECT * FROM users WHERE step IS NOT NULL AND reminded_at IS NULL AND started_at < ? AND started_at > ? LIMIT 50",
    ),
    reminded: db.prepare("UPDATE users SET reminded_at = ? WHERE id = ?"),
    leaders: db.prepare(`
      SELECT r.id, COALESCE(l.first_name || ' ' || SUBSTR(l.last_name, 1, 1) || '.', r.name) AS name, COUNT(*) AS n
      FROM users x JOIN users r ON r.id = x.referrer_id LEFT JOIN leads l ON l.user_id = r.id
      WHERE x.credited_at >= ? GROUP BY r.id ORDER BY n DESC, MIN(x.credited_at) LIMIT ?`),
    getMeta: db.prepare("SELECT value FROM meta WHERE key = ?"),
    setMeta: db.prepare(
      "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    ),
  }

  return {
    user: (id: number) => q.user.get(id) as User | undefined,
    /** Adds the user on their first /start; true when they are new. */
    addUser: (
      id: number,
      username: string | null,
      name: string,
      referrer: number | null,
      source: string | null = referrer ? "referral" : null,
      now = Date.now(),
    ) => Number(q.addUser.run(id, username, name, now, referrer, source).changes) > 0,
    touch: (id: number, username: string | null, name: string) => q.touch.run(username, name, id),
    setStep: (id: number, step: string | null, draft: unknown = null) =>
      q.step.run(step, draft === null ? null : JSON.stringify(draft), id),
    /** Counts the user for their referrer once; true when it happened now. */
    credit: (id: number, now = Date.now()) => Number(q.credit.run(now, id).changes) > 0,
    credited: (referrer: number) => (q.credited.all(referrer) as { id: number }[]).map((r) => r.id),
    unlock: (id: number, now = Date.now()) => q.unlock.run(now, id),
    setInvite: (id: number, link: string | null, expires: number | null) => q.invite.run(link, expires, id),
    joined: (id: number, now = Date.now()) => q.joined.run(now, id),
    lead: (id: number) => q.lead.get(id) as Lead | undefined,
    /** Saves (or replaces) the user's form; returns the one it replaced, if any. */
    saveLead: (l: Omit<Lead, "created_at" | "updated_at" | "status" | "status_by" | "status_at">, now = Date.now()) => {
      const prev = q.lead.get(l.user_id) as Lead | undefined
      q.saveLead.run({ ...l, now })
      return prev
    },
    leads: (since = 0) => q.leadRows.all(since) as LeadRow[],
    leadRow: (id: number) => q.leadRow.get(id) as LeadRow | undefined,
    /** Everyone who started the bot through this user's link, counted or not yet. */
    invited: (referrer: number) =>
      q.invited.all(referrer) as { id: number; name: string; credited_at: number | null; lead: string | null }[],
    counts: (since: number) =>
      q.counts.get({ since }) as Record<
        "users" | "users_today" | "leads" | "leads_today" | "students" | "referrals" | "unlocked" | "joined",
        number
      >,
    /** Takes the closed courses away again (the admin decided so). */
    revoke: (id: number) => q.revoke.run(id),
    /** Everyone to send a broadcast to. */
    userIds: (leadsOnly = false) => ((leadsOnly ? q.leadIds : q.allIds).all() as { id: number }[]).map((r) => r.id),
    /** By Telegram ID, @username, phone (7+ digits) or name. */
    find: (query: string) => {
      const s = query.trim()
      const ids = (rows: unknown[]) => (rows as { id: number }[]).map((r) => r.id)
      if (/^@\w{3,}$/.test(s)) return ids(q.findByUsername.all(s.slice(1)))
      const digits = s.replace(/[\s()+-]/g, "")
      if (/^\d{7,}$/.test(digits)) {
        const byId = ids(q.findById.all(Number(digits)))
        return [...new Set([...byId, ...ids(q.findByPhone.all(`%${digits.slice(-9)}`))])]
      }
      if (s.length >= 2) return ids(q.findByName.all(`%${s}%`, `%${s}%`))
      return []
    },
    topRegions: () => q.topRegions.all() as { region: string; n: number }[],
    setStatus: (kind: "b" | "s", id: number, status: Status, by: string, now = Date.now()) =>
      Number((kind === "b" ? q.setStatus : q.setSiteStatus).run(status, by, now, id).changes) > 0,
    addSiteLead: (l: Omit<SiteLead, "id" | "status" | "status_by" | "status_at">) =>
      Number(
        q.addSite.run(
          l.first_name,
          l.last_name,
          l.phone,
          l.lang,
          l.lat,
          l.lng,
          l.accuracy,
          l.nearest,
          l.nearest_km,
          l.page,
          l.created_at,
        ).lastInsertRowid,
      ),
    siteLead: (id: number) => q.site.get(id) as SiteLead | undefined,
    siteLeads: (since = 0) => q.sites.all(since) as SiteLead[],
    /** Leads (bot, not students, and site) by call-centre status. */
    statusCounts: (since = 0) =>
      Object.fromEntries(
        (q.statusCounts.all({ since }) as { status: string; n: number }[]).map((r) => [r.status, r.n]),
      ) as Partial<Record<Status, number>>,
    unhandled: () =>
      q.unhandled.all() as { kind: "b" | "s"; id: number; name: string; phone: string; created_at: number }[],
    unhandledCount: () => (q.unhandledCount.get() as { n: number }).n,
    addSource: (code: string, name: string, now = Date.now()) => Number(q.addSource.run(code, name, now).changes) > 0,
    deleteSource: (code: string) => q.delSource.run(code),
    sources: () => q.sources.all() as Source[],
    sourceName: (code: string) => (q.sourceName.get(code) as { name: string } | undefined)?.name,
    /** Users who came without an ad link: on their own ('') or through a friend ('referral'). */
    otherSources: () => q.otherSources.all() as { code: string; users: number; leads: number }[],
    /** Started the form 1–24 hours ago, haven't finished it and haven't been reminded yet. */
    toRemind: (now = Date.now()) => q.toRemind.all(now - 3_600_000, now - 24 * 3_600_000) as User[],
    reminded: (id: number, now = Date.now()) => q.reminded.run(now, id),
    /** Who brought the most friends since `since`. */
    leaders: (since: number, limit = 10) => q.leaders.all(since, limit) as { id: number; name: string; n: number }[],
    meta: (key: string) => (q.getMeta.get(key) as { value: string } | undefined)?.value,
    setMeta: (key: string, value: string) => q.setMeta.run(key, value),
    close: () => db.close(),
  }
}

export type Store = ReturnType<typeof openStore>
