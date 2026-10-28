import { Reveal } from "@/components/motion/reveal"
import { cn } from "@/lib/utils"

type Props = { kicker: string; title: React.ReactNode; text?: React.ReactNode; className?: string; light?: boolean }

export function SectionHeading({ kicker, title, text, className, light }: Props) {
  return (
    <Reveal className={cn("max-w-2xl", className)}>
      <p className={cn("text-sm font-bold tracking-[0.14em] uppercase", light ? "text-[#7ee9b8]" : "text-brand-ink")}>
        {kicker}
      </p>
      <h2 className="mt-3 text-4xl leading-[1.05] font-extrabold md:text-5xl">{title}</h2>
      {text && <p className={cn("mt-4 text-lg", light ? "text-white/75" : "text-muted-foreground")}>{text}</p>}
    </Reveal>
  )
}
