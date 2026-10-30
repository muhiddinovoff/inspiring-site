#!/usr/bin/env bash
# Inspiring Education: install or update the site + Telegram bot on a VPS that may already run other sites.
#
#   curl -fsSL https://raw.githubusercontent.com/muhiddinovoff/inspiring-site/main/scripts/deploy.sh -o deploy.sh
#   sudo bash deploy.sh
#
# Everything lives under /opt/inspiring (its own Node.js, its own user, its own systemd service and port).
# Existing sites keep their Node, ports and nginx config: this only ADDS one nginx block for the new domain.
# Run it again any time to update to the latest version from GitHub.
set -euo pipefail

REPO="https://github.com/muhiddinovoff/inspiring-site.git"
BASE="/opt/inspiring"
APP="$BASE/site"
NODE_DIR="$BASE/node"
SVC="inspiring"
RUN_USER="inspiring"

say() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
ask() { local v; read -r -p "$1" v </dev/tty; printf '%s' "$v"; }
ask_secret() { local v; read -r -s -p "$1" v </dev/tty; echo >/dev/tty; printf '%s' "$v"; }

[ "$(id -u)" -eq 0 ] || die "Run with sudo: sudo bash deploy.sh"
command -v apt-get >/dev/null || die "This script expects Ubuntu/Debian (apt)."

FIRST_RUN=1
[ -f "$APP/.env" ] && FIRST_RUN=0

# ---------------------------------------------------------------- questions (first run only)
if [ "$FIRST_RUN" -eq 1 ]; then
  say "Inspiring Education — o‘rnatish"
  DOMAIN=$(ask "Domen (masalan inspiring.uz, www siz): ")
  DOMAIN=${DOMAIN,,}; DOMAIN=${DOMAIN#http://}; DOMAIN=${DOMAIN#https://}; DOMAIN=${DOMAIN#.}; DOMAIN=${DOMAIN#www.}; DOMAIN=${DOMAIN%/}
  [[ "$DOMAIN" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$ ]] || die "Domen noto‘g‘ri: $DOMAIN"
  EMAIL=$(ask "SSL sertifikat uchun email: ")
  TOKEN=$(ask_secret "Telegram bot tokeni (ekranda ko‘rinmaydi): ")
  [[ "$TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]{30,}$ ]] || die "Token formati noto‘g‘ri."
  CHATS=$(ask "Call-markaz chat ID lari, vergul bilan (masalan 111,222): ")
  CHATS=${CHATS// /}
  [[ "$CHATS" =~ ^-?[0-9]+(,-?[0-9]+)*$ ]] || die "Chat ID lar faqat raqam va vergul bo‘lishi kerak."
else
  say "Mavjud o‘rnatish topildi — yangilanmoqda"
  DOMAIN=$(grep -E '^SITE_DOMAIN=' "$APP/.env" | cut -d= -f2-)
  EMAIL=$(grep -E '^SITE_EMAIL=' "$APP/.env" | cut -d= -f2-)
fi

# ---------------------------------------------------------------- system packages
say "Kerakli paketlar"
apt-get update -qq
apt-get install -y -qq git curl ca-certificates xz-utils >/dev/null

# ---------------------------------------------------------------- private Node.js 22 (doesn't touch the system node)
say "Node.js 22 ($NODE_DIR)"
case "$(uname -m)" in
  x86_64) ARCH=x64 ;;
  aarch64 | arm64) ARCH=arm64 ;;
  *) die "Noma'lum protsessor: $(uname -m)" ;;
esac
TARBALL=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | awk -v a="linux-$ARCH.tar.xz" '$2 ~ a"$" {print $2}')
[ -n "$TARBALL" ] || die "Node.js yuklab olinmadi."
if [ ! -x "$NODE_DIR/bin/node" ] || [ "$("$NODE_DIR/bin/node" -v)" != "$(echo "$TARBALL" | cut -d- -f2)" ]; then
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$TARBALL" | tar -xJ -C "$NODE_DIR" --strip-components=1
fi
export PATH="$NODE_DIR/bin:$PATH"
node -v

# ---------------------------------------------------------------- app user and code
id "$RUN_USER" >/dev/null 2>&1 || useradd --system --home "$BASE" --shell /usr/sbin/nologin "$RUN_USER"
mkdir -p "$BASE"
chown -R "$RUN_USER:$RUN_USER" "$BASE"
# Everything the app owns runs as its own user (git also refuses repos owned by someone else).
as_app() { runuser -u "$RUN_USER" -- env PATH="$PATH" HOME="$BASE" bash -c "$1"; }
say "Sayt kodi ($APP)"
if [ -d "$APP/.git" ]; then
  as_app "git -C '$APP' fetch -q origin main && git -C '$APP' reset -q --hard origin/main"
else
  as_app "git clone -q '$REPO' '$APP'"
fi

# ---------------------------------------------------------------- settings (.env, readable only by the app)
if [ "$FIRST_RUN" -eq 1 ]; then
  PORT=3010
  while ss -ltn "( sport = :$PORT )" | grep -q LISTEN; do PORT=$((PORT + 1)); done
  umask 077
  install -m 600 -o "$RUN_USER" -g "$RUN_USER" /dev/null "$APP/.env"
  cat >"$APP/.env" <<EOF
TELEGRAM_BOT_TOKEN=$TOKEN
TELEGRAM_CHAT_IDS=$CHATS
PORT=$PORT
HOST=127.0.0.1
TRUST_PROXY=1
SITE_DOMAIN=$DOMAIN
SITE_EMAIL=$EMAIL
EOF
  umask 022
  unset TOKEN
fi
PORT=$(grep -E '^PORT=' "$APP/.env" | cut -d= -f2-)

say "Yig‘ish (npm ci && npm run build)"
as_app "cd '$APP' && npm ci --no-audit --no-fund --loglevel=error && npm run build >/dev/null"

# ---------------------------------------------------------------- systemd service
say "Xizmat: $SVC (port $PORT)"
cat >/etc/systemd/system/$SVC.service <<EOF
[Unit]
Description=Inspiring Education site and Telegram bot
After=network-online.target

[Service]
WorkingDirectory=$APP
# Node gives each address only 250 ms by default, so slow links to Telegram fail with ETIMEDOUT now and then.
Environment=NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000
ExecStart=$NODE_DIR/bin/node server/index.ts
Restart=always
RestartSec=3
User=$RUN_USER
NoNewPrivileges=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable -q $SVC
systemctl restart $SVC
sleep 2
curl -fsS "http://127.0.0.1:$PORT/api/health" && echo || die "Server ishga tushmadi: journalctl -u $SVC -n 50"

# ---------------------------------------------------------------- bot profile
if [ "$FIRST_RUN" -eq 1 ]; then
  say "Bot nomi va tavsifi"
  as_app "cd '$APP' && node server/bot-setup.ts" || warn "Bot sozlanmadi (tokenni tekshiring)."
fi

# ---------------------------------------------------------------- nginx: one new server block, nothing else touched
if [ "$FIRST_RUN" -eq 1 ] || { [ ! -e "/etc/nginx/sites-enabled/$SVC" ] && [ ! -e "/etc/nginx/conf.d/$SVC.conf" ]; }; then
  if ! command -v nginx >/dev/null; then
    if ss -ltn '( sport = :80 )' | grep -q LISTEN; then
      warn "80-portni nginx emas, boshqa dastur egallagan (Apache yoki panel?)."
      warn "Shu dasturda $DOMAIN uchun http://127.0.0.1:$PORT ga proxy sozlang. Sayt va bot ishlayapti."
      exit 0
    fi
    apt-get install -y -qq nginx >/dev/null
  fi
  say "nginx: $DOMAIN → 127.0.0.1:$PORT"
  CONF="server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    client_max_body_size 64k;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}"
  if [ -d /etc/nginx/sites-available ]; then
    echo "$CONF" >/etc/nginx/sites-available/$SVC
    ln -sf /etc/nginx/sites-available/$SVC /etc/nginx/sites-enabled/$SVC
  else
    echo "$CONF" >/etc/nginx/conf.d/$SVC.conf
  fi
  # Long domains can overflow nginx's default name table; raise it only when that is the actual error.
  if nginx -t 2>&1 | grep -q server_names_hash_bucket_size; then
    echo 'server_names_hash_bucket_size 64;' >/etc/nginx/conf.d/$SVC-names.conf
  fi
  # A broken config must not stay enabled: the next reload of nginx would fail for every site on this server.
  if ! nginx -t 2>/dev/null; then
    nginx -t || true
    rm -f /etc/nginx/sites-enabled/$SVC /etc/nginx/conf.d/$SVC.conf /etc/nginx/conf.d/$SVC-names.conf
    die "nginx sozlamasida xato — o‘zgarish bekor qilindi, hech narsa qayta yuklanmadi."
  fi
  systemctl reload nginx
fi

# ---------------------------------------------------------------- HTTPS (only once the domain points here)
if [ "$FIRST_RUN" -eq 1 ] || [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  MY_IP=$(curl -fsS https://api.ipify.org || true)
  DNS_IP=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)
  if [ -n "$MY_IP" ] && [ "$MY_IP" = "$DNS_IP" ]; then
    say "HTTPS sertifikati (Let's Encrypt)"
    apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
    DOMS=(-d "$DOMAIN")
    [ "$(getent ahostsv4 "www.$DOMAIN" | awk 'NR==1{print $1}')" = "$MY_IP" ] && DOMS+=(-d "www.$DOMAIN")
    certbot --nginx "${DOMS[@]}" --non-interactive --agree-tos -m "$EMAIL" --redirect || warn "Sertifikat olinmadi — keyinroq skriptni qayta ishga tushiring."
  else
    warn "$DOMAIN hali bu serverga ($MY_IP) ulanmagan (DNS: ${DNS_IP:-yo‘q})."
    warn "Domen panelida A yozuv qo‘shing, 5–30 daqiqa kuting va skriptni qayta ishga tushiring — HTTPS o‘zi ulanadi."
  fi
fi

say "Tayyor!"
echo "  Sayt:     http://$DOMAIN  (HTTPS ulangach https://$DOMAIN)"
echo "  Jurnal:   journalctl -u $SVC -f"
echo "  Yangilash: sudo bash deploy.sh"
echo "  Eslatma:  har bir call-markaz xodimi botni ochib Start bosishi kerak."
