<div align="center">

<img src="public/favicon.svg" width="64" height="76" alt="Inspiring Education logotipi" />

# Inspiring Education

**Prezident va ixtisoslashtirilgan maktablarga tayyorlov markazining rasmiy sayti**

[![Deploy](https://github.com/muhiddinovoff/inspiring-site/actions/workflows/deploy.yml/badge.svg)](https://github.com/muhiddinovoff/inspiring-site/actions/workflows/deploy.yml)
[![CI](https://github.com/muhiddinovoff/inspiring-site/actions/workflows/ci.yml/badge.svg)](https://github.com/muhiddinovoff/inspiring-site/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)

[**Saytni ochish →**](https://muhiddinovoff.github.io/inspiring-site/)

<img src="docs/assets/hero.png" alt="Bosh ekran" width="100%" />

</div>

## Imkoniyatlar

- **Uch tilda** — o‘zbek, rus, ingliz, har biri o‘z manzilida: [`/`](https://muhiddinovoff.github.io/inspiring-site/), [`/ru/`](https://muhiddinovoff.github.io/inspiring-site/ru/), [`/en/`](https://muhiddinovoff.github.io/inspiring-site/en/). Til tepadagi UZ / RU / EN tugmasi bilan almashadi va eslab qolinadi; har bir til sahifasining sarlavhasi, tavsifi va Telegram preview'i o‘sha tilda.
- **Silliq animatsiyalar** — Lenis inersion skroll, bosh ekrandagi 3D “ekran” (scroll animatsiya), sanab ko‘tariladigan raqamlar, skroll bilan to‘ladigan yo‘l xaritasi, parallax.
- **Matnlarni to‘ldirish** — ustozlar, ota-onalar fikrlari, filial koordinatalari qayerda turishi: [qo‘llanma](docs/content.md).
- **Ariza formasi** — ism, familiya, `+998` telefon maskasi va ixtiyoriy joylashuv (eng yaqin filial bilan); o‘z serverimiz orqali Telegram botga, call-markazga boradi ([qo‘llanma](docs/server.md)).
- **3 xil ko‘rinish** — Yorug‘, Tun va Aralash (qurilma sozlamasiga qarab o‘zi almashadi). Tugma tepada, tanlov eslab qolinadi, almashganda sahifa silliq o‘tadi.
- **Qulaylik** — bosiladigan telefon va xarita havolalari, shahar bo‘yicha filial filtri, mobil pastki panel.
- **Sifat** — klaviatura bilan boshqarish, “harakatni kamaytirish” sozlamasini hurmat qilish, SEO va ulashish teglari, sitemap.

<table>
  <tr>
    <td width="68%"><img src="docs/assets/results.png" alt="Natijalar bo‘limi" /></td>
    <td><img src="docs/assets/mobile.png" alt="Telefondagi ko‘rinish" /></td>
  </tr>
</table>

## Texnologiyalar

| | |
|---|---|
| Asos | [Vite](https://vite.dev), [React 19](https://react.dev), TypeScript |
| Dizayn | [Tailwind CSS 4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) (Radix), [lucide](https://lucide.dev) ikonkalari |
| Animatsiya | [Framer Motion](https://motion.dev), [Lenis](https://lenis.darkroom.engineering) |
| Shriftlar | Bricolage Grotesque, Manrope, Onest (kirill) — loyiha ichida, Google'ga so‘rov yo‘q |
| Sifat | oxlint, Prettier, Vitest, GitHub Actions |

## Ishga tushirish

Node.js 22 kerak.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | ishlab chiqish serveri |
| `npm run build` | tayyor sayt `dist/` ga |
| `npm run preview` | build natijasini ko‘rish |
| `npm run check` | lint + format + test + build (push'dan oldin) |
| `npm run format` | kodni formatlash |
| `npm run server` | saytni va ariza serverini ishga tushiradi (avval `npm run build`; [qo‘llanma](docs/server.md)) |
| `npm run bot:setup` | Telegram botning nomi, tavsifi va menyusini o‘rnatadi |
| `npm run cutout` | bosh ekrandagi o‘quvchilar rasmidan fonni olib tashlaydi (`scripts/cutout.py`; avval `pip install "rembg[cpu]" pillow numpy`) |

## Tuzilma

```
src/
├── components/
│   ├── ui/            shadcn komponentlari (button, dialog, accordion …)
│   ├── sections/      sahifa bo‘limlari (hero, results, teachers, branches, lead-form …)
│   └── motion/        Reveal, CountUp animatsiya yordamchilari
├── i18n/              uz.ts · ru.ts · en.ts tarjimalar va til konteksti
├── data/              raqamlar, havolalar, filiallar, ustozlar (tildan mustaqil)
├── hooks/             silliq skroll
└── lib/               telefon formati, arizani yuborish, cn()
public/                rasmlar, ikonkalar, robots.txt, sitemap.xml
docs/                  qo‘llanmalar va README rasmlari
```

## Ma’lumotni o‘zgartirish

| Nima | Qayerda |
|---|---|
| Barcha matnlar | `src/i18n/uz.ts`, `ru.ts`, `en.ts` (tuzilmasi bir xil; biror tilda kalit tushib qolsa, build xato beradi) |
| Natija raqamlari, filiallar, telefon, havolalar | `src/data/site.ts` |
| Ustozlar | `src/data/teachers.ts` (fan, tajriba, yutuqlar uch tilda) + rasmlar `public/teachers/` |
| Ranglar va shriftlar | `src/index.css` |

## Deploy

`main` ga har bir push'da [`deploy.yml`](.github/workflows/deploy.yml) tekshiradi, build qiladi va GitHub Pages'ga chiqaradi: **https://muhiddinovoff.github.io/inspiring-site/**
Boshqa branch va PR'larda [`ci.yml`](.github/workflows/ci.yml) faqat tekshiradi.

Bir martalik sozlash: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Repo **Netlify**'ga ham ulangan: u [`netlify.toml`](netlify.toml) bo‘yicha `main` ni o‘zi build qiladi va har bir PR uchun preview havola beradi. Ariza manzilini Netlify'da **Site configuration → Environment variables → `VITE_LEAD_ENDPOINT`** ga yozing.
Ariza manzili: **Settings → Secrets and variables → Actions → Variables → `VITE_LEAD_ENDPOINT`** ([batafsil](docs/lead-endpoint.md)).

## Aloqa

📞 +998 77 256 11 77 · Telegram va Instagram: [@inspiringuz](https://t.me/inspiringuz)

---

<sub>© 2026 Inspiring Education. Barcha huquqlar himoyalangan — [LICENSE](LICENSE).</sub>
