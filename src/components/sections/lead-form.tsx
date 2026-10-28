import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, Copy, Loader2, Phone, Send } from "lucide-react"

import { Shield } from "@/components/logo"
import { SectionHeading } from "@/components/sections/section-heading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CONTACT } from "@/data/site"
import { useI18n } from "@/i18n"
import { submitLead, type Lead } from "@/lib/leads"
import { formatLocal, isCompletePhone, localDigits } from "@/lib/phone"
import { cn } from "@/lib/utils"

type Status = "idle" | "sending" | "sent" | "manual"

export function LeadForm() {
  const { t, lang } = useI18n()
  const L = t.lead
  const [name, setName] = useState("")
  const [digits, setDigits] = useState("")
  const [grade, setGrade] = useState<number>()
  const [tried, setTried] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [lead, setLead] = useState<Lead | null>(null)
  const [copied, setCopied] = useState(false)

  const nameOk = name.trim().length >= 2
  const phoneOk = isCompletePhone(digits)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (!nameOk || !phoneOk) return
    const l: Lead = { name: name.trim(), phone: `+998${digits}`, grade: grade === undefined ? undefined : `${grade + 1}`, lang, source: "sayt" }
    setLead(l)
    setStatus("sending")
    setStatus((await submitLead(l)) ? "sent" : "manual")
  }

  const text = lead ? L.leadText(lead.name, lead.phone, grade === undefined ? undefined : L.grades[grade]) : ""

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
      <Shield className="pointer-events-none absolute -right-16 -bottom-24 hidden h-[30rem] w-auto opacity-[0.06] lg:block" gap="#0a3f3a" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-24 md:px-6 md:py-32 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <SectionHeading
            light
            className="min-w-0"
            kicker={L.kicker}
            title={L.title}
            text={L.text}
          />
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
          <a href={CONTACT.phoneHref} className="mt-10 inline-flex items-center gap-3 font-display text-2xl font-bold text-[#7ee9b8] md:text-3xl">
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

                <div className="grid gap-2">
                  <Label htmlFor="lead-name">{L.name}</Label>
                  <Input
                    id="lead-name"
                    autoComplete="name"
                    placeholder={L.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={tried && !nameOk}
                    aria-describedby={tried && !nameOk ? "lead-name-err" : undefined}
                  />
                  {tried && !nameOk && <p id="lead-name-err" className="text-sm text-destructive">{L.nameError}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lead-phone">{L.phone}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-semibold text-muted-foreground">+998</span>
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
                    <p id="lead-phone-err" className="text-sm text-destructive">{L.phoneError}</p>
                  )}
                </div>

                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-sm font-semibold">
                    {L.grade} <span className="font-normal text-muted-foreground">{L.optional}</span>
                  </legend>
                  <div className="grid grid-cols-4 gap-2">
                    {L.grades.map((g, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={grade === i}
                        onClick={() => setGrade((cur) => (cur === i ? undefined : i))}
                        className={cn(
                          "h-11 rounded-xl border px-1 text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95",
                          grade === i ? "border-transparent bg-primary text-primary-foreground" : "bg-background hover:bg-secondary"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <Button type="submit" variant="accent" size="lg" className="group mt-1 w-full" disabled={status === "sending"}>
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
                <h3 className="mt-5 text-2xl font-bold">{L.thanks(lead?.name ?? "")}</h3>
                {status === "sent" ? (
                  <p className="mt-2 text-muted-foreground">
                    {L.sent(CONTACT.phone)}
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-muted-foreground">
                      {L.manual}
                    </p>
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
