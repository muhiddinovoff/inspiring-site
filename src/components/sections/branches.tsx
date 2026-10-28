import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { MapPin, Navigation, School } from "lucide-react"

import { Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { BRANCHES, SCHOOL, mapLink, type City } from "@/data/site"
import { cn } from "@/lib/utils"

const CITIES: ("Hammasi" | City)[] = ["Hammasi", "Toshkent", "Samarqand", "Termiz", "Navoiy"]

export function Branches() {
  const [city, setCity] = useState<(typeof CITIES)[number]>("Hammasi")
  const list = city === "Hammasi" ? BRANCHES : BRANCHES.filter((b) => b.city === city)

  return (
    <section id="filiallar" className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
      <SectionHeading
        kicker="Filiallar"
        title="Uyingizga yaqin filialni tanlang"
        text="10 ta filial: Toshkentda 7 ta, Samarqand, Termiz va Navoiyda bittadan. Manzilni bossangiz, xarita ochiladi."
      />

      <Reveal delay={0.05} className="mt-10 -mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div role="tablist" aria-label="Shahar" className="inline-flex gap-1 rounded-full border bg-card p-1">
          {CITIES.map((c) => {
            const count = c === "Hammasi" ? BRANCHES.length : BRANCHES.filter((b) => b.city === c).length
            const on = c === city
            return (
              <button
                key={c}
                role="tab"
                aria-selected={on}
                onClick={() => setCity(c)}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
                  on ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {on && (
                  <motion.span
                    layoutId="city-pill"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative">
                  {c} <span className="opacity-60">{count}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Reveal>

      <motion.ul layout className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((b) => (
            <motion.li
              key={b.city + b.name}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <a
                href={mapLink(b.city, b.address)}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col rounded-2xl border bg-card p-5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand-green/60 hover:shadow-[0_20px_40px_-28px_rgb(15_95_88/0.6)]"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold tracking-[0.12em] text-brand-ink uppercase">{b.city}</span>
                  <Navigation className="size-4 text-muted-foreground transition-colors group-hover:text-brand-ink" />
                </span>
                <span className="mt-3 font-display text-xl font-bold">{b.name}</span>
                <span className="mt-2 flex gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {b.address}
                    {b.landmark && <span className="block text-foreground/70">Mo‘ljal: {b.landmark}</span>}
                  </span>
                </span>
              </a>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <Reveal className="mt-6">
        <a
          href={mapLink("Toshkent", SCHOOL.address)}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-4 rounded-3xl bg-brand p-6 text-white transition-transform duration-300 hover:-translate-y-1 md:flex-row md:items-center md:p-8"
        >
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10">
            <School className="size-7 text-[#7ee9b8]" />
          </span>
          <span className="flex-1">
            <span className="text-xs font-bold tracking-[0.12em] text-[#7ee9b8] uppercase">Xususiy maktab</span>
            <span className="mt-1 block font-display text-2xl font-bold">{SCHOOL.name}</span>
            <span className="mt-1 block text-white/75">
              {SCHOOL.address}. Mo‘ljal: {SCHOOL.landmark}.
            </span>
          </span>
          <Navigation className="size-5 text-white/60 transition-colors group-hover:text-white" />
        </a>
      </Reveal>
    </section>
  )
}
