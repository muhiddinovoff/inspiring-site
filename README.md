# Inspiring Education sayti

Inspiring Education o‘quv markazining veb-sayti. Vite, React, TypeScript, Tailwind CSS v4 va shadcn/ui tuzilmasida yozilgan, animatsiyalar Framer Motion va Lenis bilan qilingan.

## Ishga tushirish
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tayyor sayt dist/ papkasida
npm run preview  # build natijasini ko‘rish
```

## Tuzilma
```
src/
  components/
    ui/          shadcn komponentlari (button, input, label, accordion, dialog, container-scroll-animation)
    sections/    sahifa bo‘limlari (hero, results, teachers, branches, lead-form ...)
    motion/      Reveal va CountUp animatsiya yordamchilari
  data/
    site.ts      barcha matnlar, raqamlar, filiallar, savollar
    teachers.ts  ustozlar ma’lumoti
  lib/           utils (cn), telefon formati, arizani yuborish
  hooks/         silliq skroll (Lenis)
public/teachers/ ustozlar rasmlari
```
`components.json` shadcn CLI uchun sozlangan, shuning uchun yangi komponentlar `npx shadcn@latest add <nom>` bilan `src/components/ui` ga tushadi.

## Ma’lumotni o‘zgartirish
- Matnlar, natijalar, filiallar, savol-javoblar: `src/data/site.ts`
- Ustozlar: `src/data/teachers.ts`. Har biriga `name`, `subject`, `exp`, `about`, `wins` yozing. Rasmlar `public/teachers/ustoz-N.jpg`.

## Ariza formasi
`.env.example` faylini `.env.local` deb nusxalang va `VITE_LEAD_ENDPOINT` ga JSON POST qabul qiladigan URL yozing (Google Apps Script, Telegram bot, CRM). Forma `{ name, phone, grade, source, createdAt }` yuboradi.
Manzil berilmasa, forma ota-onaga arizani Telegram orqali yuborish yoki qo‘ng‘iroq qilishni taklif qiladi.

## Joylash
`npm run build` dan keyin `dist/` papkasini istalgan statik hostingga qo‘ying (Netlify, Cloudflare Pages, GitHub Pages). `base: './'` sababli sayt pastki papkada ham ishlaydi.

## Aloqa
+998 77 256 11 77 · Instagram, Telegram: @inspiringuz

## Avtomatik deploy
Har bir push'da `.github/workflows/deploy.yml` saytni build qiladi va `gh-pages` branchiga joylaydi.
Bir martalik sozlash: GitHub → Settings → Pages → Source: **Deploy from a branch**, Branch: **gh-pages / (root)**.
Ariza manzili uchun: Settings → Secrets and variables → Actions → Variables → `VITE_LEAD_ENDPOINT`.
