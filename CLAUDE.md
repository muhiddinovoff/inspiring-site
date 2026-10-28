# Loyiha qoidalari

## Ish tartibi
- Har bir o‘zgarishdan keyin `npm run check` (lint, format, test, build) o‘tishi shart.
- So‘ng commit → ishchi branchga push → `main` ga PR → CI yashil bo‘lsa merge. `main` ga merge bo‘lganda `deploy.yml` saytni GitHub Pages'ga chiqaradi.
- Foydalanuvchiga javoblar o‘zbek tilida.

## Kod
- Sayt 3 tilda: har bir yangi matnni `src/i18n/uz.ts`, `ru.ts`, `en.ts` uchalasiga qo‘shing. Raqam va havolalar `src/data/` da.
- UI komponentlar `src/components/ui` (shadcn), sahifa bo‘limlari `src/components/sections`.
- Formatlash Prettier bilan (`npm run format`), Tailwind klasslari avtomatik tartiblanadi.
