import { Camera, Phone, Send } from "lucide-react"

import { Logo } from "@/components/logo"
import { CONTACT, NAV_IDS } from "@/data/site"
import { useI18n } from "@/i18n"

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="bg-[#061d1a] pb-28 text-white/70 md:pb-10">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 md:grid-cols-[1.2fr_1fr_1fr] md:px-6">
        <div>
          <Logo light gap="#061d1a" />
          <p className="mt-4 max-w-xs text-sm">{t.footer.about}</p>
        </div>
        <nav aria-label={t.nav.footer} className="grid content-start gap-2 text-sm">
          {NAV_IDS.map((id) => (
            <a key={id} href={`#${id}`} className="w-fit transition-colors hover:text-white">
              {t.nav.items[id]}
            </a>
          ))}
        </nav>
        <div className="grid content-start gap-3 text-sm">
          <a
            href={CONTACT.phoneHref}
            className="flex w-fit items-center gap-2 font-semibold text-white transition-colors hover:text-[#7ee9b8]"
          >
            <Phone className="size-4" /> {CONTACT.phone}
          </a>
          <a
            href={CONTACT.telegram}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-2 transition-colors hover:text-white"
          >
            <Send className="size-4" /> Telegram {CONTACT.handle} · {t.footer.subscribers}
          </a>
          <a
            href={CONTACT.instagram}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-2 transition-colors hover:text-white"
          >
            <Camera className="size-4" /> Instagram {CONTACT.handle}
          </a>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-white/10 px-4 pt-6 text-xs md:px-6">
        © {new Date().getFullYear()} Inspiring Education
      </div>
    </footer>
  )
}
