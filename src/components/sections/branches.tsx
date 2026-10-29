import { lazy, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Clock, LocateFixed, MapPin, Navigation, Phone, School } from "lucide-react"

import { LazySection } from "@/components/lazy-section"
import { EASE, Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { Button } from "@/components/ui/button"
import { CENTERS, CITY_CENTERS, type Center } from "@/data/centers"
import { SCHOOL_MAP, mapLink, type City } from "@/data/site"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useI18n } from "@/i18n"
import { appleDirections, distanceKm, formatKm, googleDirections, isAppleMobile } from "@/lib/geo"
import { cn } from "@/lib/utils"

// Leaflet (≈150 kB) is fetched only when the map is about to scroll into view.
const LocationMap = lazy(() => import("@/components/location-map"))

const FILTERS: ("all" | City)[] = ["all", "tashkent", "samarkand", "termez", "navoi"]
const CITIES = Object.keys(CITY_CENTERS) as City[]
/** Phones list this many until "show all". */
const PHONE_LIMIT = 4

type Geo = ReturnType<typeof useGeolocation>

/** Top of the list: an offer to find the nearest branch, then the result, with a city fallback. */
function LocateBar({ geo, nearest }: { geo: Geo; nearest: (Center & { km: number }) | undefined }) {
  const { t } = useI18n()
  const { status } = geo
  const failed = status === "denied" || status === "unavailable"
  const picking = failed || status === "picking"

  if (nearest && !picking) {
    const name = t.branches.items[nearest.id].name
    const d = formatKm(nearest.km, t.decimal)
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <LocateFixed className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-snug">
          <span className="block font-bold">
            {t.location.nearest}: {name}
          </span>
          <span className="text-muted-foreground">
            {status === "city" && geo.city ? t.location.fromCity(d, t.branches.cities[geo.city]) : t.location.away(d)}
          </span>
        </p>
        <button
          type="button"
          onClick={geo.choose}
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-brand-ink hover:bg-background/70"
        >
          {t.location.pickCity}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-secondary p-4">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-brand-ink">
          <LocateFixed className={cn("size-5", status === "locating" && "animate-pulse")} />
        </span>
        <div className="min-w-0">
          <p className="font-bold">{t.location.promptTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {status === "denied"
              ? t.location.denied
              : status === "unavailable"
                ? t.location.unavailable
                : t.location.promptText}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="accent" size="sm" onClick={geo.locate} disabled={status === "locating"}>
          <LocateFixed />
          {status === "locating" ? t.location.locating : failed ? t.location.retry : t.location.allow}
        </Button>
        {picking ? (
          CITIES.map((c) => (
            <Button key={c} variant="outline" size="sm" onClick={() => geo.pickCity(c)}>
              {t.branches.cities[c]}
            </Button>
          ))
        ) : (
          <Button variant="outline" size="sm" onClick={geo.choose}>
            {t.location.pickCity}
          </Button>
        )}
      </div>
    </div>
  )
}

type ItemProps = {
  c: Center
  km: number | undefined
  nearest: boolean
  selected: boolean
  onSelect: () => void
  geo: Geo
  hiddenOnPhone: boolean
}

/** One branch in the list; the selected one opens to show its details and directions. */
function BranchItem({ c, km, nearest, selected, onSelect, geo, hiddenOnPhone }: ItemProps) {
  const { t } = useI18n()
  const info = t.branches.items[c.id]
  const from = geo.status === "gps" ? (geo.origin ?? undefined) : undefined
  return (
    <li className={cn("min-w-0", hiddenOnPhone && "max-sm:hidden")}>
      <div
        className={cn(
          "rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300",
          selected
            ? "border-brand-green/50 bg-background shadow-[0_18px_40px_-28px_rgb(15_95_88/0.55)]"
            : "border-transparent hover:bg-secondary/70",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={selected}
          className="flex w-full items-start gap-3 rounded-2xl p-3.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
        >
          <span
            className={cn(
              "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-300",
              selected ? "bg-accent text-accent-foreground" : "bg-secondary text-brand-ink",
            )}
          >
            <MapPin className="size-[1.05rem]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-display text-base font-bold">{info.name}</span>
              {nearest && (
                <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                  {t.location.nearest}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">
              {t.branches.cities[c.city]} · {info.address}
            </span>
          </span>
          {km !== undefined && (
            <span className="mt-1 shrink-0 text-sm font-bold text-brand-ink tabular-nums">
              {formatKm(km, t.decimal)}
            </span>
          )}
        </button>

        <AnimatePresence initial={false}>
          {selected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="grid gap-2 px-3.5 pb-4 pl-[3.75rem] text-sm text-muted-foreground">
                {info.landmark && (
                  <p>
                    {t.branches.landmark}: {info.landmark}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0" />
                  {t.location.days} {c.hours}
                </p>
                <a href={c.phoneHref} className="flex w-fit items-center gap-2 hover:text-foreground">
                  <Phone className="size-4 shrink-0" />
                  {c.phone}
                </a>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild variant="accent" size="sm">
                    <a href={googleDirections(c, from)} target="_blank" rel="noreferrer">
                      <Navigation />
                      {t.location.directions}
                    </a>
                  </Button>
                  {isAppleMobile() && (
                    <Button asChild variant="outline" size="sm">
                      <a href={appleDirections(c, from)} target="_blank" rel="noreferrer">
                        {t.location.appleMaps}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  )
}

export function Branches() {
  const { t } = useI18n()
  const geo = useGeolocation()
  const [city, setCity] = useState<(typeof FILTERS)[number]>("all")
  const [selected, setSelected] = useState<number | null>(null)
  const [all, setAll] = useState(false)

  const ready = (geo.status === "gps" || geo.status === "city") && geo.origin
  const withKm = CENTERS.map((c) => ({ ...c, km: ready ? distanceKm(geo.origin!, c) : undefined }))
  const sorted = ready ? [...withKm].sort((a, b) => a.km! - b.km!) : withKm
  const nearest = ready ? (sorted[0] as Center & { km: number }) : undefined
  const list = sorted.filter((c) => city === "all" || c.city === city)

  // A new starting point opens the nearest branch.
  const [lastOrigin, setLastOrigin] = useState(geo.origin)
  if (lastOrigin !== geo.origin) {
    setLastOrigin(geo.origin)
    if (nearest) {
      setSelected(nearest.id)
      setCity("all")
    }
  }

  return (
    <section id="filiallar" className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
      <SectionHeading kicker={t.branches.kicker} title={t.branches.title} text={t.branches.text} />

      <Reveal className="mt-10 overflow-hidden rounded-[2rem] border bg-card shadow-[0_40px_80px_-50px_rgb(15_95_88/0.5)] lg:grid lg:grid-cols-[minmax(0,26rem)_1fr]">
        {/* Map: on top on phones, on the right on large screens. */}
        <div className="relative isolate h-72 bg-secondary sm:h-96 lg:order-2 lg:h-auto lg:min-h-[40rem]">
          <LazySection minHeight="100%">
            <LocationMap
              pins={CENTERS.map((c) => ({ ...c, name: t.branches.items[c.id].name }))}
              frame={list.map((c) => c.id)}
              origin={ready ? geo.origin : null}
              selected={selected}
              onSelect={(id) => {
                setSelected(id)
                setAll(true)
              }}
              labels={t.location}
            />
          </LazySection>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-4 p-4 md:p-5 lg:h-[40rem]">
          <div className="shrink-0">
            <LocateBar geo={geo} nearest={nearest} />
          </div>

          <div
            role="tablist"
            aria-label={t.branches.filter}
            className="-mx-1 flex shrink-0 [scrollbar-width:none] gap-1 overflow-x-auto px-1 py-0.5"
          >
            {FILTERS.map((c) => {
              const count = c === "all" ? CENTERS.length : CENTERS.filter((b) => b.city === c).length
              const on = c === city
              return (
                <button
                  key={c}
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setCity(c)
                    setSelected(null)
                  }}
                  className={cn(
                    "relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
                    on ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
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
                    {c === "all" ? t.branches.all : t.branches.cities[c]} <span className="opacity-60">{count}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <ul className="-mx-1 grid min-h-0 [scrollbar-width:thin] gap-1 overflow-y-auto overscroll-contain px-1">
            {list.map((c, i) => (
              <BranchItem
                key={c.id}
                c={c}
                km={c.km}
                nearest={nearest?.id === c.id}
                selected={selected === c.id}
                onSelect={() => setSelected(selected === c.id ? null : c.id)}
                geo={geo}
                hiddenOnPhone={!all && i >= PHONE_LIMIT && selected !== c.id}
              />
            ))}
          </ul>
          {!all && list.length > PHONE_LIMIT && (
            <Button variant="outline" className="w-full sm:hidden" onClick={() => setAll(true)}>
              {t.branches.showAll(list.length)}
              <ChevronDown />
            </Button>
          )}
        </div>
      </Reveal>

      <Reveal className="mt-6">
        <a
          href={mapLink(SCHOOL_MAP)}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-4 rounded-3xl bg-brand p-6 text-white transition-transform duration-300 hover:-translate-y-1 md:flex-row md:items-center md:p-8"
        >
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10">
            <School className="size-7 text-[#7ee9b8]" />
          </span>
          <span className="flex-1">
            <span className="text-xs font-bold tracking-[0.12em] text-[#7ee9b8] uppercase">
              {t.branches.school.kicker}
            </span>
            <span className="mt-1 block font-display text-2xl font-bold">{t.branches.school.name}</span>
            <span className="mt-1 block text-white/75">
              {t.branches.school.address}. {t.branches.landmark}: {t.branches.school.landmark}.
            </span>
          </span>
          <Navigation className="size-5 text-white/60 transition-colors group-hover:text-white" />
        </a>
      </Reveal>
    </section>
  )
}
