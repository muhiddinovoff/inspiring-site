import { motion, type HTMLMotionProps } from "framer-motion"

export const EASE = [0.22, 1, 0.36, 1] as const

type RevealProps = HTMLMotionProps<"div"> & { delay?: number; y?: number }

/** Fades and lifts its content once, the first time it scrolls into view. */
export function Reveal({ delay = 0, y = 28, children, ...props }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/** Parent for staggered children; pair with `staggerItem`. */
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}
