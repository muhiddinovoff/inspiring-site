/** Keeps only the 9 local digits after the +998 country code. */
export function localDigits(value: string) {
  let d = value.replace(/\D/g, "")
  if (d.startsWith("998") && d.length > 9) d = d.slice(3)
  return d.slice(0, 9)
}

/** Formats local digits as "90 123 45 67" while the user types. */
export function formatLocal(digits: string) {
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
  return parts.filter(Boolean).join(" ")
}

export function isCompletePhone(digits: string) {
  return digits.length === 9
}
