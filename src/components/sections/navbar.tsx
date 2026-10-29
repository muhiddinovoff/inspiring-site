import { useEffect, useState } from "react"
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion"
import { Menu, Phone, X } from "lucide-react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { Logo } from "@/components/logo"
import { ThemeCycleButton, ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { CONTACT, NAV_IDS } from "@/data/site"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

/**
 * The section crossing a line 40% down the screen. Watched with an IntersectionObserver rather than measured on
 * every scroll event: those measurements forced a layout per frame and made the whole page stutter on phones.
 */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const inBand = new Set<string>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target.id)
          else inBand.delete(e.target.id)
        }
        setActive(ids.find((id) => inBand.has(id)) ?? null)
      },
      { rootMargin: "-40% 0px -59% 0px" },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [ids])
  return active
}

export function Navbar() {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const active = useActiveSection(NAV_IDS)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : ""
  }, [open])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow,backdrop-filter] duration-300",
        // Phones get a near-solid bar: a backdrop blur over moving content is repainted every scroll frame.
        scrolled || open
          ? "bg-background/95 shadow-[0_1px_0_var(--color-border)] md:bg-background/85 md:backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 md:h-[72px] md:px-6">
        <Logo compact />

        <nav aria-label={t.nav.main} className="hidden items-center gap-0.5 xl:flex">
          {NAV_IDS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className={cn(
                "relative rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                active === id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active === id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-secondary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {t.nav.items[id]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeSwitcher id="theme-top" className="hidden md:inline-flex" />
          <ThemeCycleButton className="md:hidden" />
          <LanguageSwitcher id="lang-top" />
          <a
            href={CONTACT.phoneHref}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-bold whitespace-nowrap tabular-nums transition-colors hover:bg-secondary 2xl:flex"
          >
            <Phone className="size-4 text-brand-ink" />
            {CONTACT.phone}
          </a>
          <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
            <a href="#ariza">{t.common.apply}</a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 xl:hidden"
            aria-label={open ? t.nav.close : t.nav.open}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "x" : "m"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>

      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent"
        style={{ scaleX: progress }}
      />

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label={t.nav.mobile}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "100dvh", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden xl:hidden"
          >
            <motion.ul
              className="flex flex-col gap-1 px-4 pt-4 pb-8"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
            >
              {NAV_IDS.map((id) => (
                <motion.li key={id} variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}>
                  <a
                    href={`#${id}`}
                    onClick={() => setOpen(false)}
                    className="block border-b py-4 font-display text-2xl font-semibold"
                  >
                    {t.nav.items[id]}
                  </a>
                </motion.li>
              ))}
              <motion.li
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                className="mt-6 grid gap-3"
              >
                <ThemeSwitcher id="theme-menu" withLabels className="mb-3 flex w-full" />
                <Button asChild variant="accent" size="lg">
                  <a href="#ariza" onClick={() => setOpen(false)}>
                    {t.common.apply}
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href={CONTACT.phoneHref}>
                    <Phone /> {CONTACT.phone}
                  </a>
                </Button>
              </motion.li>
            </motion.ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
