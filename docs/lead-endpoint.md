# Arizalarni Google Sheets'ga yig‘ish

Sayt formasi har bir arizani JSON ko‘rinishida `VITE_LEAD_ENDPOINT` manziliga yuboradi:

```json
{ "name": "Dilnoza", "phone": "+998901234567", "lang": "uz", "source": "sayt", "createdAt": "2026-10-28T11:00:00.000Z" }
```

Eng oddiy va bepul yo‘l: Google Apps Script. Arizalar jadvalga tushadi va xohlasangiz Telegram guruhga ham xabar ketadi.

## 1. Jadval va skript
1. Yangi Google Sheets oching, birinchi qatorga yozing: `Sana | Ism | Telefon | Sinf | Til | Manba`
2. **Extensions → Apps Script** ni oching va kodni almashtiring:

```js
// Ixtiyoriy: Telegram xabari uchun bot tokeni va guruh chat ID si. Kerak bo‘lmasa bo‘sh qoldiring.
const TELEGRAM_TOKEN = ""
const TELEGRAM_CHAT_ID = ""

function doPost(e) {
  const lead = JSON.parse(e.postData.contents)
  SpreadsheetApp.getActiveSheet().appendRow([
    new Date(lead.createdAt), lead.name, lead.phone, lead.lang, lead.source,
  ])
  if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
    const text = `Yangi ariza\n${lead.name}\n${lead.phone}\nTil: ${lead.lang}`
    UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "post",
      payload: { chat_id: TELEGRAM_CHAT_ID, text },
    })
  }
  return ContentService.createTextOutput("ok")
}
```

3. **Deploy → New deployment → Web app**: *Execute as* — **Me**, *Who has access* — **Anyone**. Chiqqan `https://script.google.com/macros/s/.../exec` manzilini nusxalang.

## 2. Saytga ulash
- **GitHub'da (production):** repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**, nomi `VITE_LEAD_ENDPOINT`, qiymati yuqoridagi manzil. Keyingi deploy'da forma shu manzilga yuboradi.
- **Kompyuterda:** `.env.example` ni `.env.local` deb nusxalang va manzilni yozing.

Manzil berilmagan yoki ishlamay qolgan bo‘lsa, forma ariza matnini ko‘rsatib, uni Telegram orqali yuborishni yoki qo‘ng‘iroq qilishni taklif qiladi, ya’ni ariza yo‘qolmaydi.
