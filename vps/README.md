# Worker de vídeo (VPS)

Serviço que recebe o upload do vídeo bruto pelo painel admin, **converte
automaticamente com FFmpeg** e entrega o arquivo com **URL assinada que expira**.

Existe porque o Supabase Free tem limite fixo de **50 MB por arquivo** — os vídeos
convertidos passam disso. A VPS hospeda e serve os vídeos; o Supabase segue com
banco, auth e o resto.

## Onde roda
| Item | Valor |
|---|---|
| Host | `video.mirianbarreto.com.br` (VPS Contabo `217.76.63.127`) |
| Serviço | `mirian-transcoder.service` (systemd), usuário **`mirian`** |
| App | `/opt/mirian-transcoder/app` |
| Vídeos | `/var/lib/mirian-videos` |
| Porta interna | `127.0.0.1:8791` (só nginx acessa) |
| Proxy/TLS | nginx + certbot (`/etc/nginx/sites-available/video.mirianbarreto.com.br.conf`) |

## Endpoints
| Rota | Auth | O que faz |
|---|---|---|
| `POST /upload` | JWT **admin** | Recebe o vídeo bruto, responde `202 {job_id}` e converte em background |
| `GET /status/:jobId` | JWT **admin** | `processing` / `done` / `error` |
| `POST /sign` | JWT **aluna** | Valida o plano ativo e devolve URL assinada (3h) |
| `GET /v/:file` | assinatura | Valida HMAC + expiração → `X-Accel-Redirect` (nginx serve) |
| `GET /health` | — | Status e nº de vídeos |

## Conversão aplicada
```
ffmpeg -i <bruto> -vf scale=-2:1280:force_original_aspect_ratio=decrease \
  -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart <saida>.mp4
```
Vertical até 1280px de altura, `faststart` (começa a tocar antes de baixar tudo).

## Isolamento
Usuário próprio sem shell, diretórios próprios, porta própria e limites no systemd
(`CPUQuota=250%`, `Nice=10`, `IOSchedulingClass=idle`) para **não competir** com os
outros serviços da VPS. `ProtectSystem=full` + `NoNewPrivileges`.

## Operação
```bash
systemctl status mirian-transcoder
journalctl -u mirian-transcoder -f
systemctl restart mirian-transcoder
curl -s https://video.mirianbarreto.com.br/health
```

## Variáveis (`/opt/mirian-transcoder/app/.env`, chmod 600)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `SIGNING_SECRET`, `VIDEO_DIR`,
`TMP_DIR`, `PORT`, `PUBLIC_HOST`.

> O front usa `VITE_VIDEO_HOST=https://video.mirianbarreto.com.br`.

## Reinstalar do zero
Copiar `server.js` e `package.json` para `/opt/mirian-transcoder/app`, rodar
`deploy.sh` (cria .env, systemd, instala deps) e aplicar o `nginx.conf` + certbot.
