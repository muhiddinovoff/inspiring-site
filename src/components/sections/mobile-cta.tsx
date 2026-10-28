import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CONTACT } from "@/data/site"
import { useI18n } from "@/i18n"

/** Phone-only bottom bar: shows after the hero, hides while the application form itself is on screen. */
export function MobileCta() {
  const { t } = useI18n()
  const [pastHero, setPastHero] = useState(false)
  const [formVisible, setFormVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    const form = document.getElementById("ariza")
    const io = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { threshold: 0.15 })
    if (form) io.observe(form)
    return () => {
      window.removeEventListener("scroll", onScroll)
      io.disconnect()
    }
  }, [])

  return (
    <AnimatePresence>
      {pastHero && !formVisible && (
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          exit={{ y: "110%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-background/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
        >
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-12 shrink-0"
            aria-label={`${t.common.call}: ${CONTACT.phone}`}
          >
            <a href={CONTACT.phoneHref}>
              <Phone />
            </a>
          </Button>
          <Button asChild variant="accent" size="lg" className="h-12 flex-1">
            <a href="#ariza">{t.common.apply}</a>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
