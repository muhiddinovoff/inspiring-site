import { Phone } from "lucide-react"

import { Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "@/components/sections/section-heading"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { CONTACT } from "@/data/site"
import { useI18n } from "@/i18n"

export function Faq() {
  const { t } = useI18n()
  return (
    <section id="savollar" className="bg-secondary/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:px-6 md:py-32 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <SectionHeading kicker={t.faq.kicker} title={t.faq.title} text={t.faq.text} />
          <Reveal delay={0.1} className="mt-8">
            <Button asChild variant="outline" size="lg">
              <a href={CONTACT.phoneHref}>
                <Phone /> {CONTACT.phone}
              </a>
            </Button>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <Accordion type="single" collapsible defaultValue="q0" className="rounded-3xl border bg-card px-5 md:px-8">
            {t.faq.items.map((f, i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
