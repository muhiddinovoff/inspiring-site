# Sayt matnlarini to‘ldirish

Saytda hozircha **vaqtinchalik (placeholder)** ma’lumotlar bor. Ularni quyidagi fayllarda haqiqiysiga almashtiring.
Har bir o‘zgarishdan keyin `npm run check`, keyin odatdagidek commit → PR → merge (README’dagi tartib).

Matnlar uch tilda turadi: `src/i18n/uz.ts`, `src/i18n/ru.ts`, `src/i18n/en.ts`. Bitta matnni o‘zgartirsangiz, uchalasida ham o‘zgartiring.

## 1. Ustozlar — `src/data/teachers.ts`

Har bir ustoz alohida yozuv. To‘ldiring:

| Maydon | Nima yoziladi | Bo‘sh qolsa saytda |
|---|---|---|
| `name` | Ism-familiya | "Inspiring ustozi" |
| `subject` | Fan, uch tilda | "Imtihonga tayyorlov" |
| `exp` | Tajriba, masalan `{ uz: "8 yil", ru: "8 лет", en: "8 years" }` | "Lorem ipsum" |
| `about` | 1–2 gapdan iborat qisqa bio | Lorem ipsum |
| `wins` | 1–3 ta yutuq, har biri uch tilda | 3 ta lorem qator |
| `img` | Rasm: `public/teachers/` ichida, tik (4:5), yuz yuqori qismda | — |

## 2. Ota-onalar xabarlari — `src/i18n/*.ts` → `reasons.chat.messages`

12 ta `{ name, text }` yozuv: ota-onaning ismi (masalan "Dilnoza M.") va qisqa fikri.
**Faqat haqiqiy fikrlarni, ota-onaning roziligi bilan qo‘ying.** Uzunligi 1–2 gap bo‘lsa, devorda chiroyli turadi.
Ro‘yxat uzunligi uch tilda bir xil bo‘lishi shart emas, lekin bir xil bo‘lgani yaxshi.

## 3. Filiallar — `src/data/centers.ts`

- `COORDS`: har bir filialning aniq koordinatasi. Google Maps’da filialni topib, nuqta ustiga o‘ng tugmani bosing:
  birinchi qatorda `41.29240, 69.22360` ko‘rinishidagi son chiqadi — shuni `{ lat: 41.2924, lng: 69.2236 }` qilib yozing.
  Tartib `src/data/site.ts` dagi `BRANCHES` bilan bir xil (Chilonzor, Sergeli, Yunusobod, …).
- `hours`: ish vaqti (hozir hammasida "09:00–19:00"). Ish kunlari `src/i18n/*.ts` → `location.days`.
- `phone`: filialning o‘z raqami bo‘lsa, `CONTACT.phone` o‘rniga yozing.

Filial nomi va manzili `src/i18n/*.ts` → `branches.items` da.

## 4. Raqamlar — `src/data/site.ts`

Statistika (`STATS`), natijalar (`RESULTS`, `OVERALL_RESULTS`) shu yerda. Ularning yozuvlari `src/i18n/*.ts` da (`stats.items`, `results.items`).

## 5. Bosh ekran rasmi

Boshqa guruh rasmi qo‘yilsa: uni `public/hero/students-2000.webp` qilib saqlang, so‘ng

```
pip install "rembg[cpu]" pillow numpy
npm run cutout
```

Skript fonni olib tashlaydi va har bir bolani alohida qatlamga ajratadi. Bolalar soni yoki joyi o‘zgarsa,
`scripts/cutout.py` dagi `HEADS` ro‘yxatiga har bir boshning gorizontal markazini (2000 px kenglikdagi rasmda) yozing.
