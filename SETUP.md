# Setup & Deploy — App Mirian Barreto

Guia para colocar o app no ar (Supabase + Vercel + Mercado Pago).
Projeto Supabase dedicado: **`fzpmypayekcpwvhapgsk`**.

> ⚠️ **Segurança:** a `service_role` key foi compartilhada no chat durante o
> desenvolvimento — **rotacione-a** em Supabase Dashboard › Settings › API.
> Ela só deve existir como *secret* das Edge Functions, nunca no front-end.

---

## 1. Variáveis de ambiente do front-end

Crie/edite `.env.local` (já existe um template):

```
VITE_SUPABASE_URL=https://fzpmypayekcpwvhapgsk.supabase.co
VITE_SUPABASE_ANON_KEY=<chave anon/publishable — Dashboard › Settings › API>
VITE_WHATSAPP_NUMBER=5531984793790
```

Na Vercel, defina as mesmas `VITE_*` em Project › Settings › Environment Variables.

---

## 2. Banco de dados (migrações)

As migrações estão em `supabase/migrations/`:
- `0001_init.sql` — schema + RLS + buckets de Storage
- `0002_seed.sql` — planos (Básico/Premium/VIP) + categorias
- `0003_webhook_events.sql` — auditoria/idempotência de webhooks

**Opção A — Supabase CLI (recomendado):**
```bash
# autentique a conta DONA do projeto fzpmypayekcpwvhapgsk
supabase login
supabase link --project-ref fzpmypayekcpwvhapgsk
supabase db push        # aplica as migrações
```

**Opção B — SQL Editor (mais rápido, sem CLI):**
Cole o conteúdo de cada arquivo de `supabase/migrations/` (na ordem 0001 → 0002 →
0003) no Dashboard › SQL Editor e execute.

---

## 3. Autenticação (Supabase Dashboard › Authentication)

- **URL Configuration › Site URL:** `https://mirian-barreto-app.vercel.app`
- **Redirect URLs:** adicione
  - `https://mirian-barreto-app.vercel.app/login`
  - `https://mirian-barreto-app.vercel.app/redefinir-senha`
  - `http://localhost:3000/login` e `http://localhost:3000/redefinir-senha` (dev)
- E-mail: mantenha "Confirm email" ligado (o cadastro envia confirmação).

### Criar a primeira administradora (Mirian)
Após a Mirian se cadastrar normalmente pelo app, promova-a a admin:
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'EMAIL_DA_MIRIAN');
```

---

## 4. Storage

As migrações já criam os buckets:
- `workout-videos` (privado) — vídeos; acesso só por URL assinada via Edge Function
- `thumbnails` (público) — capas dos treinos
- `avatars` (público)

Nenhuma ação manual necessária além de rodar as migrações.

---

## 5. Edge Functions

Deploy (precisa do CLI autenticado e `link` feito):
```bash
supabase functions deploy video-url
supabase functions deploy create-checkout
supabase functions deploy cancel-subscription
supabase functions deploy mp-webhook
supabase functions deploy send-emails
supabase functions deploy renewal-reminders
```

### Secrets das funções
```bash
supabase secrets set \
  MP_ACCESS_TOKEN="<access token de produção do Mercado Pago>" \
  APP_URL="https://mirian-barreto-app.vercel.app" \
  RESEND_API_KEY="<chave do Resend>" \
  EMAIL_FROM="Mirian Barreto <contato@SEU_DOMINIO>" \
  CRON_SECRET="<string aleatória forte>"
```
(`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas
automaticamente pelo runtime das funções.)

---

## 6. Mercado Pago

1. Crie a aplicação no painel do Mercado Pago e pegue o **Access Token** (produção).
2. Configure o **Webhook/IPN** apontando para:
   `https://fzpmypayekcpwvhapgsk.supabase.co/functions/v1/mp-webhook`
   Eventos: **Pagamentos** e **Planos e assinaturas**.
3. Cartão = assinatura recorrente (preapproval). Pix = cobrança avulsa (renovação
   manual; o lembrete é enviado por e-mail).
4. **Importante (produção):** implemente a verificação HMAC do header `x-signature`
   em `mp-webhook` antes de ir ao ar com dinheiro real (hoje há um TODO marcado).

---

## 7. Agendamentos (Fase 4)

Configure execuções periódicas (Supabase Dashboard › Schedules, ou pg_cron, ou um
cron externo) chamando, com o header `x-cron-secret: <CRON_SECRET>`:
- `POST .../functions/v1/send-emails` — a cada 5 min (drena a fila de e-mails)
- `POST .../functions/v1/renewal-reminders` — 1x/dia (lembretes de renovação)

---

## 8. Rodar localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

Rotas: `/` (landing), `/login`, `/cadastro`, `/app` (aluna), `/admin` (admin),
`/checkout/:slug`.

---

## Pendências conhecidas / próximos passos
- Verificação HMAC do webhook do Mercado Pago (segurança de produção).
- Proteção de vídeo é client-side (URL assinada + marca d'água); para DRM real,
  migrar `workout-videos` para Bunny/Cloudflare Stream (o `video_path` já está
  abstraído para facilitar a troca).
- Code-splitting (bundle > 500 kB) — opcional, via `React.lazy` nas rotas.
