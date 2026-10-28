/**
 * After `vite build`, writes dist/ru/index.html and dist/en/index.html: the same app, but with the
 * language, title, description and share tags already in that language. Search engines, Telegram link
 * previews and visitors without JavaScript then see the right language at /ru/ and /en/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"

import en from "../src/i18n/en.ts"
import ru from "../src/i18n/ru.ts"
import uz from "../src/i18n/uz.ts"

const SITE = "https://muhiddinovoff.github.io/inspiring-site/"
const OG_LOCALE = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" } as const

const source = readFileSync("dist/index.html", "utf8")

function setMeta(html: string, attr: "name" | "property", key: string, value: string) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`)
  if (!re.test(html)) throw new Error(`meta ${key} not found in dist/index.html`)
  return html.replace(re, `$1${value.replaceAll('"', "&quot;")}$2`)
}

for (const t of [ru, en]) {
  const url = `${SITE}${t.code}/`
  let html = source
    .replace(/<html lang="[^"]*"/, `<html lang="${t.code}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${t.meta.title}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    // Assets are referenced relative to the page; this page sits one folder deeper.
    .replace(/(\s(?:src|href)=")\.\//g, "$1../")
  html = setMeta(html, "name", "description", t.meta.description)
  html = setMeta(html, "property", "og:title", t.meta.title)
  html = setMeta(html, "property", "og:description", t.meta.description)
  html = setMeta(html, "property", "og:url", url)
  html = setMeta(html, "property", "og:locale", OG_LOCALE[t.code as keyof typeof OG_LOCALE])

  mkdirSync(`dist/${t.code}`, { recursive: true })
  writeFileSync(`dist/${t.code}/index.html`, html)
  console.log(`dist/${t.code}/index.html`)
}

// Keep the Uzbek page's description in sync with the dictionary too.
writeFileSync(
  "dist/index.html",
  setMeta(setMeta(source, "name", "description", uz.meta.description), "property", "og:title", uz.meta.title),
)
