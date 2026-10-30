import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, Copy, Loader2, MapPin, Phone, Send, X } from "lucide-react"

import { Shield } from "@/components/logo"
import { SectionHeading } from "@/components/sections/section-heading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CENTERS } from "@/data/centers"
import { CONTACT } from "@/data/site"
import { useI18n } from "@/i18n"
import { byDistance, formatKm } from "@/lib/geo"
import { submitLead, type Lead } from "@/lib/leads"
import { formatLocal, isCompletePhone, localDigits } from "@/lib/phone"

type Status = "idle" | "sending" | "sent" | "manual"
type Geo = { state: "off" | "locating" | "denied" } | { state: "on"; location: NonNullable<Lead["location"]> }

/**
 * The visitor's location for the application, only with their permission: asked when they press the button, or
 * taken straight away if they already allowed this site (they can still remove it).
 */
function useLeadLocation() {
  const [geo, setGeo] = useState<Geo>({ state: "off" })
  const locate = () => {
    if (!("geolocation" in navigator)) return setGeo({ state: "denied" })
    setGeo({ state: "locating" })
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setGeo({
          state: "on",
          location: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) },
        }),
      () => setGeo({ state: "denied" }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60_000 },
    )
  }
  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => !cancelled && p.state === "granted" && locate())
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return { geo, locate, clear: () => setGeo({ state: "off" }) }
}

export function LeadForm() {
  const { t, lang } = useI18n()
  const L = t.lead
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [website, setWebsite] = useState("")
  const { geo, locate, clear } = useLeadLocation()
  const [digits, setDigits] = useState("")
  const [tried, setTried] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [lead, setLead] = useState<Lead | null>(null)
  const [copied, setCopied] = useState(false)

  const firstOk = firstName.trim().length >= 2
  const lastOk = lastName.trim().length >= 2
  const nearest =
    geo.state === "on"
      ? byDistance(CENTERS, geo.location).map((c) => ({ ...c, name: t.branches.items[c.id].name }))[0]
      : undefined
  const phoneOk = isCompletePhone(digits)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (!firstOk || !lastOk || !phoneOk) return
    const l: Lead = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: `+998${digits}`,
      lang,
      source: "sayt",
      page: window.location.href,
      website,
      ...(geo.state === "on" ? { location: geo.location } : {}),
      ...(nearest ? { nearest: { name: nearest.name, km: Math.round(nearest.km * 100) / 100 } } : {}),
    }
    setLead(l)
    setStatus("sending")
    setStatus((await submitLead(l)) ? "sent" : "manual")
  }

  const mapLink = lead?.location
    ? `https://www.google.com/maps/search/?api=1&query=${lead.location.lat.toFixed(6)},${lead.location.lng.toFixed(6)}`
    : undefined
  const text = lead ? L.leadText(lead.firstName, lead.lastName, lead.phone, mapLink) : ""

  async function copy() {
    if (!lead) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked: the text is still visible and selectable */
    }
  }

  return (
    <section id="ariza" className="relative overflow-hidden bg-brand-deep text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(10_214_126/0.22),transparent)]"
      />
      <Shield
        className="pointer-events-none absolute -right-16 -bottom-24 hidden h-[30rem] w-auto opacity-[0.06] lg:block"
        gap="#0a3f3a"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-24 md:px-6 md:py-32 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <SectionHeading light className="min-w-0" kicker={L.kicker} title={L.title} text={L.text} />
          <ul className="mt-10 grid gap-4 text-white/85">
            {L.perks.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <a
            href={CONTACT.phoneHref}
            className="mt-10 inline-flex items-center gap-3 font-display text-2xl font-bold text-[#7ee9b8] md:text-3xl"
          >
            <Phone className="size-6" /> {CONTACT.phone}
          </a>
        </div>

        <div className="min-w-0 rounded-3xl bg-card p-6 text-card-foreground shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7)] md:p-8">
          <AnimatePresence mode="wait" initial={false}>
            {status === "idle" || status === "sending" ? (
              <motion.form
                key="form"
                noValidate
                onSubmit={onSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="grid gap-5"
              >
                <h3 className="text-2xl font-bold">{L.formTitle}</h3>

                <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
                  <div className="grid content-start gap-2">
                    <Label htmlFor="lead-first">{L.firstName}</Label>
                    <Input
                      id="lead-first"
                      autoComplete="given-name"
                      placeholder={L.firstNamePlaceholder}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      aria-invalid={tried && !firstOk}
                      aria-describedby={tried && !firstOk ? "lead-first-err" : undefined}
                    />
                    {tried && !firstOk && (
                      <p id="lead-first-err" className="text-sm text-destructive">
                        {L.firstNameError}
                      </p>
                    )}
                  </div>
                  <div className="grid content-start gap-2">
                    <Label htmlFor="lead-last">{L.lastName}</Label>
                    <Input
                      id="lead-last"
                      autoComplete="family-name"
                      placeholder={L.lastNamePlaceholder}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      aria-invalid={tried && !lastOk}
                      aria-describedby={tried && !lastOk ? "lead-last-err" : undefined}
                    />
                    {tried && !lastOk && (
                      <p id="lead-last-err" className="text-sm text-destructive">
                        {L.lastNameError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lead-phone">{L.phone}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-semibold text-muted-foreground">
                      +998
                    </span>
                    <Input
                      id="lead-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="90 123 45 67"
                      className="pl-[4.25rem] tabular-nums"
                      value={formatLocal(digits)}
                      onChange={(e) => setDigits(localDigits(e.target.value))}
                      aria-invalid={tried && !phoneOk}
                      aria-describedby={tried && !phoneOk ? "lead-phone-err" : undefined}
                    />
                  </div>
                  {tried && !phoneOk && (
                    <p id="lead-phone-err" className="text-sm text-destructive">
                      {L.phoneError}
                    </p>
                  )}
                </div>

                {/* Location: optional, only with permission. */}
                <div className="grid gap-1.5" aria-live="polite">
                  {geo.state === "on" ? (
                    <div className="flex items-center gap-3 rounded-xl bg-secondary px-3.5 py-2.5 text-sm">
                      <MapPin className="size-4 shrink-0 text-brand-ink" />
                      <span className="min-w-0 flex-1 font-medium">
                        {nearest ? L.location.added(nearest.name, formatKm(nearest.km, t.decimal)) : L.location.add}
                      </span>
                      <button
                        type="button"
                        onClick={clear}
                        aria-label={L.location.remove}
                        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={locate}
                      disabled={geo.state === "locating"}
                      className="flex w-fit items-center gap-2 rounded-xl border border-dashed px-3.5 py-2.5 text-sm font-semibold text-brand-ink transition-colors outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-70"
                    >
                      {geo.state === "locating" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MapPin className="size-4" />
                      )}
                      {geo.state === "locating" ? L.location.adding : L.location.add}
                      <span className="font-normal text-muted-foreground">{L.location.optional}</span>
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {geo.state === "denied" ? L.location.denied : L.location.hint}
                  </p>
                </div>

                {/* Honeypot: hidden from people and screen readers; bots that fill every field give themselves away. */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="absolute -left-[9999px] h-px w-px opacity-0"
                />

                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="group mt-1 w-full"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 className="animate-spin" /> {L.sending}
                    </>
                  ) : (
                    <>
                      {L.submit}
                      <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="done"
                role="status"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="py-6 text-center"
              >
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                  className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground"
                >
                  <Check className="size-8" strokeWidth={3} />
                </motion.span>
                <h3 className="mt-5 text-2xl font-bold">{L.thanks(lead?.firstName ?? "")}</h3>
                {status === "sent" ? (
                  <p className="mt-2 text-muted-foreground">{L.sent(CONTACT.phone)}</p>
                ) : (
                  <>
                    <p className="mt-2 text-muted-foreground">{L.manual}</p>
                    <p className="mt-4 rounded-xl bg-secondary p-3 text-sm font-medium select-all">{text}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button asChild variant="accent">
                        <a href={CONTACT.telegram} target="_blank" rel="noreferrer" onClick={copy}>
                          <Send /> {L.sendTelegram}
                        </a>
                      </Button>
                      <Button variant="outline" onClick={copy}>
                        {copied ? <Check /> : <Copy />} {copied ? L.copied : L.copy}
                      </Button>
                    </div>
                    <Button asChild variant="link" className="mt-2 h-auto whitespace-normal">
                      <a href={CONTACT.phoneHref}>{L.orCall(CONTACT.phone)}</a>
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
