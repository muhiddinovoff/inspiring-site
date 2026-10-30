# Saytni o‘z serveringizga joylash (domen + Telegram bot)

Server (`server/index.ts`) saytni o‘zi tarqatadi va formadagi arizalarni bot orqali call-markazga yuboradi.
Bot tokeni **faqat serverdagi `.env` faylida** turadi — saytning kodida ham, GitHub'da ham bo‘lmaydi.

Kerak: Ubuntu 22.04/24.04 server (VPS), domen (masalan `inspiring.uz`) va unga SSH orqali kirish.

## Tez yo‘l: bitta skript (boshqa saytlar bor serverda ham)
Domen panelida `@` va `www` uchun **A** yozuvni server IP siga yo‘naltiring, so‘ng serverda:

```bash
curl -fsSL https://raw.githubusercontent.com/muhiddinovoff/inspiring-site/main/scripts/deploy.sh -o deploy.sh && sudo bash deploy.sh
```

Skript domen, email, bot tokeni va call-markaz chat ID larini so‘raydi, keyin hammasini o‘zi qiladi:
alohida Node.js 22 (`/opt/inspiring/node`, tizimdagi Node ga tegmaydi), alohida foydalanuvchi va bo‘sh port,
`inspiring` systemd xizmati, yangi domen uchun **bitta** nginx bloki (mavjud saytlarning sozlamalari o‘zgarmaydi),
DNS tayyor bo‘lsa — bepul HTTPS, va botning nomi/tavsifi. Yangilash uchun shu `sudo bash deploy.sh` ni qayta ishga tushiring.

Quyida xuddi shu qadamlar qo‘lda.

## 1. Domenni serverga ulash
Domen panelida (DNS) ikkita **A** yozuv qo‘shing, qiymati — serveringiz IP manzili:

| Turi | Nomi | Qiymati |
|---|---|---|
| A | `@` | `SERVER_IP` |
| A | `www` | `SERVER_IP` |

## 2. Serverga Node.js 22, nginx va git o‘rnatish
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx git
```

## 3. Saytni yuklab olish va yig‘ish
```bash
sudo mkdir -p /var/www && sudo chown $USER /var/www && cd /var/www
git clone https://github.com/muhiddinovoff/inspiring-site.git && cd inspiring-site
npm ci && npm run build
```

## 4. Bot sozlamalari (`.env`)
```bash
cp .env.example .env && nano .env
```
- `TELEGRAM_BOT_TOKEN` — @BotFather bergan token.
- `TELEGRAM_CHAT_IDS` — arizani oladiganlar, vergul bilan: `1111111111,2222222222`.
  **Har biri avval botni ochib Start bosishi shart**, aks holda Telegram ularga xabar yubormaydi.
  Botga `/id` yozilsa, u chat ID ni o‘zi aytadi.

Botning nomi, tavsifi va menyusini o‘rnatish (bir marta):
```bash
npm run bot:setup
```
Rasm: @BotFather → `/setuserpic` → botni tanlang → `docs/assets/bot-avatar.png` ni yuboring.

> Token chatda yoki biror joyda ochiq yozilgan bo‘lsa, @BotFather → `/revoke` bilan yangilang va yangisini `.env` ga qo‘ying.

## 5. Serverni doimiy ishlatish (systemd)
```bash
sudo tee /etc/systemd/system/inspiring.service >/dev/null <<EOF
[Unit]
Description=Inspiring Education site
After=network.target

[Service]
WorkingDirectory=/var/www/inspiring-site
ExecStart=/usr/bin/node server/index.ts
Restart=always
User=$USER

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now inspiring
curl -s localhost:3000/api/health   # {"ok":true,"bot":true,"chats":2}
```

## 6. nginx va bepul HTTPS
```bash
sudo tee /etc/nginx/sites-available/inspiring >/dev/null <<'EOF'
server {
  server_name inspiring.uz www.inspiring.uz;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
EOF
sudo ln -s /etc/nginx/sites-available/inspiring /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d inspiring.uz -d www.inspiring.uz
```
`inspiring.uz` o‘rniga o‘z domeningizni yozing. Shundan keyin sayt `https://` da ochiladi.

## 7. Yangilash
`main` ga yangi o‘zgarish tushganda:
```bash
cd /var/www/inspiring-site && git pull && npm ci && npm run build && sudo systemctl restart inspiring
```

## Tekshirish va muammolar
- Jurnal: `journalctl -u inspiring -f` — har bir ariza va Telegram xatolari shu yerda.
- `telegram → 123…: Forbidden: bot can't initiate conversation` — o‘sha odam botda Start bosmagan.
- Spamga qarshi: bitta IP dan 10 daqiqada 5 tadan ortiq ariza qabul qilinmaydi; robotlar uchun yashirin maydon bor.
- GitHub Pages'dagi nusxada server yo‘q: u yerda forma arizani Telegram orqali qo‘lda yuborishni taklif qiladi.
