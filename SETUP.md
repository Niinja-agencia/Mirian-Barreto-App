# Setup & Deploy — App Mirian Barreto

Guia para colocar o app no ar (Supabase + Vercel + Mercado Pago).
Projeto Supabase dedicado: **`fzpmypayekcpwvhapgsk`**.

> ⚠️ **Segurança:** a `service_role` key foi compartilhada no chat durante o
> desenvolvimento — **rotacione-a** em Supabase Dashboard › Settings › API.
> Ela só deve existir como *secret* das Edge Functions, nunca no front-end.

---

## 0. Estado atual (verificado em 21/08/2026)

### Já feito e valendo em produção

- Banco migrado até `0009_scheduled_jobs.sql`. A `0008` fechou a escalação de
  privilégio (aluna não vira admin) e tirou o `youtube_id` do alcance do
  cliente; a `0009` criou o status `expired` e a função de expiração.
- As cinco Edge Functions foram republicadas a partir deste repositório. A
  `mp-webhook` agora **recusa notificação sem assinatura válida** (`401`).
- Site URL e Redirect URLs apontando para o domínio próprio.
- Front-end: fonte Roboto em todo o app; telas de assinatura coerentes com o
  banco ("Vencida"/"Venceu em"); cancelamento confere a resposta do Mercado
  Pago; player renova a sessão antes de acusar erro; landing lê os planos da
  tabela `plans` (o painel virou a única fonte de preço); rotas com
  `React.lazy` — o primeiro carregamento caiu de 785 kB para 478 kB.
- **Cobrança anual implementada**: seletor mensal/anual na landing, na tela de
  assinatura e no checkout; `create-checkout` cobra `price_annual` e abre o
  preapproval com `frequency: 12`; o webhook estende a renovação por 12 meses
  quando a assinatura é anual. Os seletores só aparecem quando o preço anual
  for menor que 12× o mensal — configure os valores em Admin › Planos.
- **Confirmação de e-mail desligada** (`mailer_autoconfirm = true`), por decisão
  do dono, para o cadastro funcionar enquanto não houver SMTP. Religar assim que
  o SMTP existir: aí a conta volta a exigir e-mail verificado.

### Falta você fazer

| # | O que | Como |
|---|-------|------|
| 1 | Segredos do Mercado Pago | `supabase secrets set MP_ACCESS_TOKEN=… MP_WEBHOOK_SECRET=…` |
| 2 | SMTP próprio + Resend | Authentication › Emails, e `supabase secrets set RESEND_API_KEY=… EMAIL_FROM=…`. Sem isso "esqueci minha senha" continua sem funcionar |
| 3 | Deploy do front | `npm run build` + deploy na Vercel (o projeto está em outra conta Vercel, não dá para publicar daqui) |
| 4 | Ligar o pg_cron | Database › Extensions › ativar `pg_cron` e `pg_net`, depois o SQL do item 7 |
| 5 | Remover a função morta | `supabase functions delete video-url` |
| 6 | Rotacionar a `service_role` | Settings › API. Atualizar depois no worker da VPS (`SUPABASE_SERVICE_ROLE`) |

### Decisões de produto já tomadas

- **VIP** — fica como está: o diferencial (consultoria, videochamada) é entregue
  fora do app. Nenhum treino exige `required_tier = 4` de propósito.
- **Cobrança anual** — implementada. Falta só definir os preços anuais em
  Admin › Planos; enquanto anual = mensal, os seletores ficam escondidos.

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

As migrações estão em `supabase/migrations/`, de `0001` a `0009`. As três
primeiras montam a base:
- `0001_init.sql` — schema + RLS + buckets de Storage
- `0002_seed.sql` — planos (Básico/Premium/VIP) + categorias
- `0003_webhook_events.sql` — auditoria/idempotência de webhooks

As duas últimas foram aplicadas em 21/08/2026:
- `0008_security_hardening.sql` — trava a troca de `role` e move o `youtube_id`
  para `workout_media` (RLS por plano)
- `0009_scheduled_jobs.sql` — status `expired`, `expire_subscriptions()` e os
  helpers dos jobs de e-mail. **Antes dela**, rode sozinho:
  `alter type public.subscription_status add value if not exists 'expired';`

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

- **URL Configuration › Site URL:** `https://www.mirianbarreto.com.br`
- **Redirect URLs:** já configuradas (www + apex + Vercel + localhost, com
  `/login` e `/redefinir-senha` em cada uma). O app usa `window.location.origin`
  no `redirectTo`, então todo domínio que servir o app precisa estar na lista.
- E-mail: mantenha "Confirm email" ligado (o cadastro envia confirmação).

> ⚠️ **SMTP próprio é obrigatório antes de abrir para o público.** Sem um SMTP
> (Resend, Brevo, SES…) em Authentication › Emails, o Supabase usa o servidor de
> teste: no máximo **2 e-mails por hora**, e só entrega para membros da
> organização. Na prática, aluna nova não recebe a confirmação e ninguém
> consegue redefinir a senha.

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
  MP_WEBHOOK_SECRET="<assinatura secreta do webhook, no painel do MP>" \
  APP_URL="https://www.mirianbarreto.com.br" \
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
4. **Importante (produção):** a verificação HMAC do header `x-signature` **já está
   implementada** em `supabase/functions/mp-webhook/index.ts`, mas a versão
   **publicada** ainda é antiga e não valida nada. Republique antes de ir ao ar:
   ```bash
   supabase functions deploy mp-webhook
   ```
   A função é *fail-closed*: sem `MP_WEBHOOK_SECRET` ela recusa toda notificação.
   Configure o segredo no mesmo momento em que ligar o `MP_ACCESS_TOKEN`.

---

## 7. Agendamentos

A migração `0009_scheduled_jobs.sql` já criou tudo. Falta só ligar as extensões
(Database › Extensions: `pg_cron` e `pg_net`) e rodar, no SQL Editor:

```sql
-- expiração diária das assinaturas vencidas (não depende de e-mail)
select cron.schedule(
  'expirar-assinaturas', '10 3 * * *',
  $$select public.expire_subscriptions()$$
);

-- roda uma vez agora, para arrumar quem já venceu
select public.expire_subscriptions();
```

Depois de configurar o Resend (item 2 da tabela acima), ligue os dois jobs de
e-mail com o mesmo valor que estiver no secret `CRON_SECRET`:

```sql
select public.ativar_jobs_de_email('<mesmo valor de CRON_SECRET>');
```

Isso guarda o segredo no Vault e agenda `send-emails` (a cada 5 min) e
`renewal-reminders` (1x/dia). Para desligar: `select public.desativar_jobs_de_email();`

## 8. Rodar localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

Rotas: `/` (landing), `/login`, `/cadastro`, `/app` (aluna), `/admin` (admin),
`/checkout/:slug`.

---

## Pendências conhecidas / próximos passos
- Proteção de vídeo é client-side (URL assinada + marca d'água); para DRM real,
  migrar para Bunny/Cloudflare Stream (o `video_path` já está abstraído).
- `supabase/functions/video-url` é código morto e continua publicado
  respondendo 500 — o player usa o worker da VPS (`POST /sign`) há tempos.
  Remover com `supabase functions delete video-url`.
- Definir os preços anuais em Admin › Planos. Hoje `price_annual` está igual ao
  `price_monthly` nos quatro planos, então a opção anual não aparece nas telas.
- Religar a confirmação de e-mail (`mailer_autoconfirm = false`) assim que o
  SMTP próprio estiver no ar.
- O primeiro carregamento ainda é de 478 kB (React + router + supabase-js).
  Dá para reduzir mais, mas exige trabalho maior do que dividir por rota.
