set -e
APP=/opt/mirian-transcoder/app
VIDEOS=/var/lib/mirian-videos

echo "== 1. Diretorio dos videos =="
mkdir -p "$VIDEOS"
chown mirian:mirian "$VIDEOS"
chmod 750 "$VIDEOS"

echo "== 2. Dependencias npm =="
cd "$APP"
npm install --omit=dev --no-audit --no-fund 2>&1 | tail -2

echo "== 3. .env (segredos) =="
if [ ! -f "$APP/.env" ]; then
  SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 40)
  cat > "$APP/.env" <<EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE=${SUPABASE_SERVICE_ROLE}
SIGNING_SECRET=${SECRET}
VIDEO_DIR=${VIDEOS}
TMP_DIR=/var/lib/mirian-transcoder/tmp
PORT=8791
PUBLIC_HOST=https://video.mirianbarreto.com.br
EOF
  echo ".env criado"
else
  echo ".env ja existia (mantido)"
fi
chown mirian:mirian "$APP/.env"
chmod 600 "$APP/.env"
chown -R mirian:mirian /opt/mirian-transcoder

echo "== 4. Servico systemd =="
cat > /etc/systemd/system/mirian-transcoder.service <<'EOF'
[Unit]
Description=Mirian Barreto - worker de video (upload/conversao/entrega)
After=network.target

[Service]
Type=simple
User=mirian
Group=mirian
WorkingDirectory=/opt/mirian-transcoder/app
EnvironmentFile=/opt/mirian-transcoder/app/.env
ExecStart=/usr/bin/node /opt/mirian-transcoder/app/server.js
Restart=always
RestartSec=5
# Limites de recurso: nao deixa a conversao sufocar os outros servicos da VPS
CPUQuota=250%
Nice=10
IOSchedulingClass=idle
# Endurecimento
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/var/lib/mirian-videos /var/lib/mirian-transcoder

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now mirian-transcoder >/dev/null 2>&1
sleep 2
systemctl is-active mirian-transcoder
echo "== 5. Health check local =="
curl -s http://127.0.0.1:8791/health || echo "sem resposta"
echo
