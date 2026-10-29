import { Suspense, lazy, useEffect, useState } from "react"
import { AnimatePresence, motion, type PanInfo } from "framer-motion"
import { Clock, LocateFixed, MapPin, Navigation, Phone } from "lucide-react"

import { CarouselControls } from "@/components/carousel-controls"
import { EASE, Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { Button } from "@/components/ui/button"
import { CENTERS, CITY_CENTERS } from "@/data/centers"
import type { City } from "@/data/site"
import { useI18n } from "@/i18n"
import { appleDirections, byDistance, formatKm, googleDirections, isAppleMobile, type LatLng } from "@/lib/geo"
import { cn } from "@/lib/utils"

const LocationMap = lazy(() => import("@/components/location-map"))

type Status = "prompt" | "locating" | "denied" | "unavailable" | "picking" | "gps" | "city"
const CITIES = Object.keys(CITY_CENTERS) as City[]
const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const

function useGeolocation() {
  const [status, setStatus] = useState<Status>("prompt")
  const [origin, setOrigin] = useState<LatLng | null>(null)
  const [city, setCity] = useState<City | null>(null)

  const locate = () => {
    if (!("geolocation" in navigator)) return setStatus("unavailable")
    setStatus("locating")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setCity(null)
        setStatus("gps")
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60_000 },
    )
  }

  const pickCity = (c: City) => {
    setCity(c)
    setOrigin(CITY_CENTERS[c])
    setStatus("city")
  }

  // Already allowed on an earlier visit: no need to ask again.
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

  return { status, origin, city, locate, pickCity, choose: () => setStatus("picking") }
}

function Prompt({ geo }: { geo: ReturnType<typeof useGeolocation> }) {
  const { t } = useI18n()
  const { status } = geo
  const failed = status === "denied" || status === "unavailable"
  const showCities = failed || status === "picking"
  return (
    <motion.div
      key="prompt"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex h-full flex-col justify-center rounded-[2rem] border bg-card p-6 shadow-[0_30px_60px_-40px_rgb(15_95_88/0.5)] md:p-8"
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-brand-ink">
        <LocateFixed className={cn("size-7", status === "locating" && "animate-pulse")} />
      </span>
      <h3 className="mt-5 text-2xl font-bold">{t.location.promptTitle}</h3>
      <p className="mt-2 text-muted-foreground" aria-live="polite">
        {status === "denied"
          ? t.location.denied
          : status === "unavailable"
            ? t.location.unavailable
            : t.location.promptText}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="accent" size="lg" onClick={geo.locate} disabled={status === "locating"}>
          <LocateFixed />
          {status === "locating" ? t.location.locating : failed ? t.location.retry : t.location.allow}
        </Button>
        {!showCities && (
          <Button variant="outline" size="lg" onClick={geo.choose}>
            {t.location.pickCity}
          </Button>
        )}
      </div>
      <AnimatePresence>
        {showCities && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="mt-6 text-sm font-semibold text-muted-foreground">{t.location.pickCity}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <Button key={c} variant="secondary" onClick={() => geo.pickCity(c)}>
                  {t.branches.cities[c]}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

type Sorted = ReturnType<typeof byDistance<(typeof CENTERS)[number]>>

function CenterCard({ c, rank, geo }: { c: Sorted[number]; rank: number; geo: ReturnType<typeof useGeolocation> }) {
  const { t } = useI18n()
  const info = t.branches.items[c.id]
  const from = geo.status === "gps" ? (geo.origin ?? undefined) : undefined
  const distance = formatKm(c.km, t.decimal)
  return (
    <div className="flex h-full flex-col rounded-[2rem] border bg-card p-6 shadow-[0_30px_60px_-40px_rgb(15_95_88/0.55)] md:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold tracking-[0.12em] text-brand-ink uppercase">
          {t.branches.cities[c.city]}
        </span>
        {rank === 0 && (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
            {t.location.nearest}
          </span>
        )}
      </div>
      <h3 className="mt-2 font-display text-2xl font-bold">{info.name}</h3>
      <p className="mt-1 font-display text-3xl font-extrabold text-brand-ink">
        {geo.status === "city" && geo.city
          ? t.location.fromCity(distance, t.branches.cities[geo.city])
          : t.location.away(distance)}
      </p>
      <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>
            {info.address}
            {info.landmark && (
              <span className="block text-foreground/70">
                {t.branches.landmark}: {info.landmark}
              </span>
            )}
          </span>
        </li>
        <li className="flex gap-2">
          <Clock className="mt-0.5 size-4 shrink-0" />
          {t.location.hours}: {t.location.days} {c.hours}
        </li>
        <li className="flex gap-2">
          <Phone className="mt-0.5 size-4 shrink-0" />
          <a href={c.phoneHref} className="hover:text-foreground" onPointerDown={(e) => e.stopPropagation()}>
            {c.phone}
          </a>
        </li>
      </ul>
      <div className="mt-auto flex flex-wrap gap-2 pt-6" onPointerDown={(e) => e.stopPropagation()}>
        <Button asChild variant="accent">
          <a href={googleDirections(c, from)} target="_blank" rel="noreferrer">
            <Navigation />
            {t.location.directions}
          </a>
        </Button>
        {isAppleMobile() && (
          <Button asChild variant="outline">
            <a href={appleDirections(c, from)} target="_blank" rel="noreferrer">
              {t.location.appleMaps}
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

export default function Location() {
  const { t } = useI18n()
  const geo = useGeolocation()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const ready = (geo.status === "gps" || geo.status === "city") && geo.origin
  const sorted = geo.origin ? byDistance(CENTERS, geo.origin) : []
  const current = ready ? sorted[index] : undefined

  // A new starting point always opens on the nearest centre.
  const [lastOrigin, setLastOrigin] = useState(geo.origin)
  if (lastOrigin !== geo.origin) {
    setLastOrigin(geo.origin)
    setIndex(0)
  }

  const go = (step: number) => {
    if (!sorted.length) return
    setDir(step)
    setIndex((i) => (i + step + sorted.length) % sorted.length)
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2
    if (Math.abs(swipe) > 70) go(swipe < 0 ? 1 : -1)
  }

  return (
    <section id="lokatsiya" className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
      <SectionHeading kicker={t.location.kicker} title={t.location.title} text={t.location.text} />

      <Reveal className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:gap-6">
        <div className="relative isolate h-80 overflow-hidden rounded-[2rem] border bg-secondary shadow-[0_30px_60px_-40px_rgb(15_95_88/0.5)] md:h-[28rem] lg:h-[34rem]">
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-secondary" />}>
            <LocationMap
              pins={CENTERS.map((c) => ({ ...c, name: t.branches.items[c.id].name }))}
              origin={geo.origin}
              selected={current?.id ?? null}
              onSelect={(id) => {
                const i = sorted.findIndex((c) => c.id === id)
                if (i >= 0) {
                  setDir(i > index ? 1 : -1)
                  setIndex(i)
                }
              }}
              you={t.location.you}
            />
          </Suspense>
        </div>

        <div className="flex min-h-[26rem] flex-col">
          <AnimatePresence mode="wait" initial={false}>
            {!current ? (
              <Prompt key="prompt" geo={geo} />
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="flex flex-1 flex-col"
              >
                <div className="relative flex-1" aria-live="polite">
                  {/* Two cards peeking from behind hint that there are more to swipe through. */}
                  <div className="absolute inset-x-6 top-6 -bottom-3 rounded-[2rem] border bg-card/60" />
                  <div className="absolute inset-x-3 top-3 -bottom-1.5 rounded-[2rem] border bg-card/80" />
                  <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                    <motion.div
                      key={current.id}
                      custom={dir}
                      variants={{
                        enter: (d: number) => ({ opacity: 0, x: d * 120, rotate: d * 4, scale: 0.96 }),
                        center: { opacity: 1, x: 0, rotate: 0, scale: 1 },
                        exit: (d: number) => ({ opacity: 0, x: d * -120, rotate: d * -4, scale: 0.96 }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={SPRING}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.55}
                      onDragEnd={onDragEnd}
                      style={{ touchAction: "pan-y" }}
                      className="relative h-full cursor-grab active:cursor-grabbing"
                    >
                      <CenterCard c={current} rank={index} geo={geo} />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {t.location.swipe} · {index + 1} / {sorted.length}
                </p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <CarouselControls count={sorted.length} current={index} onPrev={() => go(-1)} onNext={() => go(1)} />
                  <Button variant="ghost" size="sm" onClick={geo.choose}>
                    {t.location.pickCity}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Reveal>
    </section>
  )
}
