/**
 * Bot settings the admins change from the admin panel. They are kept in the database and win over .env, which only
 * gives the starting values (and the main admins, who can't be removed from the bot).
 */
import type { Store } from "./db.ts"

export type BotConfig = {
  /** Main admins from .env (TELEGRAM_CHAT_IDS): admin panel, manage other admins. */
  admins: string[]
  /** Who receives leads (site and bot) and the daily report: CALL_CENTER_IDS, else the main admins. */
  callCenter?: string[]
  /** Required channel: "@inspiringuz" or a numeric ID; empty turns the subscription gate off. */
  channel: string
  /** Private channel with the closed courses ("-100…"); empty: not set up yet. */
  closedChannel: string
  goal: number
  /** Hour in Tashkent for the daily Excel report; null: off. */
  reportHour: number | null
  site: string
}

type Saved = {
  channel: string
  channelTitle: string
  channelUrl: string
  closedChannel: string
  closedTitle: string
  goal: number
  reportHour: number | null
  /** Admins added in the bot. */
  extraAdmins: string[]
  /** Chats that get leads and the daily report. */
  callCenter: string[]
}

export type Settings = Saved & { mainAdmins: string[]; admins: string[]; site: string }

const urlOf = (channel: string) => (channel.startsWith("@") ? `https://t.me/${channel.slice(1)}` : "")

export function settingsStore(store: Store, env: BotConfig) {
  let cache: Settings | undefined
  const saved = (): Partial<Saved> => {
    try {
      return JSON.parse(store.meta("settings") ?? "{}") as Partial<Saved>
    } catch {
      return {}
    }
  }
  return {
    get(): Settings {
      if (cache) return cache
      const s = saved()
      const channel = s.channel ?? env.channel
      const extraAdmins = (s.extraAdmins ?? []).filter((a) => !env.admins.includes(a))
      cache = {
        channel,
        channelTitle: s.channelTitle ?? channel,
        channelUrl: s.channelUrl ?? urlOf(channel),
        closedChannel: s.closedChannel ?? env.closedChannel,
        closedTitle: s.closedTitle ?? env.closedChannel,
        goal: s.goal ?? env.goal,
        reportHour: s.reportHour === undefined ? env.reportHour : s.reportHour,
        extraAdmins,
        callCenter: s.callCenter ?? (env.callCenter?.length ? env.callCenter : env.admins),
        mainAdmins: env.admins,
        admins: [...env.admins, ...extraAdmins],
        site: env.site,
      }
      return cache
    },
    set(patch: Partial<Saved>) {
      store.setMeta("settings", JSON.stringify({ ...saved(), ...patch }))
      cache = undefined
    },
  }
}

export type SettingsStore = ReturnType<typeof settingsStore>
