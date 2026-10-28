import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, Copy, Loader2, Phone, Send } from "lucide-react"

import { Shield } from "@/components/logo"
import { SectionHeading } from "@/components/sections/section-heading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CONTACT } from "@/data/site"
import { leadText, submitLead, type Lead } from "@/lib/leads"
import { formatLocal, isCompletePhone, localDigits } from "@/lib/phone"
import { cn } from "@/lib/utils"

const GRADES = ["1-sinf", "2-sinf", "3-sinf", "4-sinf"]

type Status = "idle" | "sending" | "sent" | "manual"

export function LeadForm() {
  const [name, setName] = useState("")
  const [digits, setDigits] = useState("")
  const [grade, setGrade] = useState<string>()
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
    const l: Lead = { name: name.trim(), phone: `+998${digits}`, grade, source: "sayt" }
    setLead(l)
    setStatus("sending")
    setStatus((await submitLead(l)) ? "sent" : "manual")
  }

  async function copy() {
    if (!lead) return
    try {
      await navigator.clipboard.writeText(leadText(lead))
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
            kicker="Qabul doimo ochiq"
            title="Birinchi qadamni bugun qo‘ying"
            text="Ism va raqamingizni qoldiring. Menejerimiz o‘zi qo‘ng‘iroq qilib, farzandingizga mos yo‘nalish, narx va jadvalni aytadi."
          />
          <ul className="mt-10 grid gap-4 text-white/85">
            {["Bir daqiqa vaqt oladi", "Hech qanday majburiyat yo‘q", "Raqamingiz faqat siz bilan bog‘lanish uchun"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {t}
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
                <h3 className="text-2xl font-bold">Bepul maslahatga yozilish</h3>

                <div className="grid gap-2">
                  <Label htmlFor="lead-name">Ismingiz</Label>
                  <Input
                    id="lead-name"
                    autoComplete="name"
                    placeholder="Masalan, Dilnoza"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={tried && !nameOk}
                    aria-describedby={tried && !nameOk ? "lead-name-err" : undefined}
                  />
                  {tried && !nameOk && <p id="lead-name-err" className="text-sm text-destructive">Ismingizni yozing</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lead-phone">Telefon raqami</Label>
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
                    <p id="lead-phone-err" className="text-sm text-destructive">Raqamni to‘liq yozing, masalan 90 123 45 67</p>
                  )}
                </div>

                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-sm font-semibold">
                    Farzandingiz sinfi <span className="font-normal text-muted-foreground">(ixtiyoriy)</span>
                  </legend>
                  <div className="grid grid-cols-4 gap-2">
                    {GRADES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        aria-pressed={grade === g}
                        onClick={() => setGrade((cur) => (cur === g ? undefined : g))}
                        className={cn(
                          "h-11 rounded-xl border text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95",
                          grade === g ? "border-transparent bg-primary text-primary-foreground" : "bg-background hover:bg-secondary"
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
                      <Loader2 className="animate-spin" /> Yuborilmoqda
                    </>
                  ) : (
                    <>
                      Ariza qoldirish
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
                <h3 className="mt-5 text-2xl font-bold">Rahmat, {lead?.name}!</h3>
                {status === "sent" ? (
                  <p className="mt-2 text-muted-foreground">
                    Arizangiz qabul qilindi. Menejerimiz tez orada {CONTACT.phone} raqamidan qo‘ng‘iroq qiladi.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-muted-foreground">
                      Arizani tugatish uchun uni Telegramda bizga yuboring yoki qo‘ng‘iroq qiling.
                    </p>
                    <p className="mt-4 rounded-xl bg-secondary p-3 text-sm font-medium select-all">{lead && leadText(lead)}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button asChild variant="accent">
                        <a href={CONTACT.telegram} target="_blank" rel="noreferrer" onClick={copy}>
                          <Send /> Telegramda yuborish
                        </a>
                      </Button>
                      <Button variant="outline" onClick={copy}>
                        {copied ? <Check /> : <Copy />} {copied ? "Nusxalandi" : "Nusxa olish"}
                      </Button>
                    </div>
                    <Button asChild variant="link" className="mt-2 h-auto whitespace-normal">
                      <a href={CONTACT.phoneHref}>yoki {CONTACT.phone} raqamiga qo‘ng‘iroq qiling</a>
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
