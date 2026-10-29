import { MotionConfig } from "framer-motion"

import { Branches } from "@/components/sections/branches"
import { Faq } from "@/components/sections/faq"
import { Footer } from "@/components/sections/footer"
import { Hero } from "@/components/sections/hero"
import { LeadForm } from "@/components/sections/lead-form"
import { MobileCta } from "@/components/sections/mobile-cta"
import { Navbar } from "@/components/sections/navbar"
import { Programs } from "@/components/sections/programs"
import { Reasons } from "@/components/sections/reasons"
import { Results } from "@/components/sections/results"
import { Stats } from "@/components/sections/stats"
import { Steps } from "@/components/sections/steps"
import { Teachers } from "@/components/sections/teachers"
import { SkipLink } from "@/components/skip-link"
import { useSmoothScroll } from "@/hooks/use-smooth-scroll"
import { ThemeProvider } from "@/hooks/use-theme"
import { I18nProvider } from "@/i18n"

export default function App() {
  useSmoothScroll()
  return (
    <ThemeProvider>
      <I18nProvider>
        <MotionConfig reducedMotion="user">
          <SkipLink />
          <Navbar />
          <main id="main" tabIndex={-1} className="outline-none">
            <Hero />
            <Stats />
            <Results />
            <Reasons />
            <Teachers />
            <Programs />
            <Steps />
            <Faq />
            <Branches />
            <LeadForm />
          </main>
          <Footer />
          <MobileCta />
        </MotionConfig>
      </I18nProvider>
    </ThemeProvider>
  )
}
