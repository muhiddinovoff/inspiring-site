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
}

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
}

/** A lead with what the reports need about its user. */
export type LeadRow = Lead & {
  username: string | null
  tg_name: string
  referrer_id: number | null
  referrer_name: string | null
  referrals: number
  unlocked_at: number | null
  joined_at: number | null
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
`

const LEAD_ROWS = `
  SELECT l.*, u.username, u.name AS tg_name, u.referrer_id, u.unlocked_at, u.joined_at,
    TRIM(COALESCE(rl.last_name || ' ' || rl.first_name, r.name)) AS referrer_name,
    (SELECT COUNT(*) FROM users x WHERE x.referrer_id = u.id AND x.credited_at IS NOT NULL) AS referrals
  FROM leads l JOIN users u ON u.id = l.user_id
  LEFT JOIN users r ON r.id = u.referrer_id LEFT JOIN leads rl ON rl.user_id = u.referrer_id`

export function openStore(file: string) {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;")
  db.exec(SCHEMA)

  const q = {
    user: db.prepare("SELECT * FROM users WHERE id = ?"),
    addUser: db.prepare(
      "INSERT INTO users (id, username, name, started_at, referrer_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
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
    getMeta: db.prepare("SELECT value FROM meta WHERE key = ?"),
    setMeta: db.prepare(
      "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    ),
  }

  return {
    user: (id: number) => q.user.get(id) as User | undefined,
    /** Adds the user on their first /start; true when they are new. */
    addUser: (id: number, username: string | null, name: string, referrer: number | null, now = Date.now()) =>
      Number(q.addUser.run(id, username, name, now, referrer).changes) > 0,
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
    saveLead: (l: Omit<Lead, "created_at" | "updated_at">, now = Date.now()) => {
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
    meta: (key: string) => (q.getMeta.get(key) as { value: string } | undefined)?.value,
    setMeta: (key: string, value: string) => q.setMeta.run(key, value),
    close: () => db.close(),
  }
}

export type Store = ReturnType<typeof openStore>
