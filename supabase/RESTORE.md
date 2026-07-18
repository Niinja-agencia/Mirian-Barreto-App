# Restaurar o backend do zero (novo projeto Supabase)

Procedimento completo para reconstruir o ambiente caso o projeto Supabase
seja perdido/recriado. Tudo abaixo é versionado — não depende de arquivos temporários.

## 0. Criar o projeto
Supabase → New project → região **South America (São Paulo)**.
Anote: **Project URL**, **anon key**, **service_role key** e crie um **Access Token**
(Account → Access Tokens).

## 1. Aplicar as migrações (schema, RLS, buckets, planos, conteúdo demo)
```bash
supabase login
supabase link --project-ref <NOVO_REF>
supabase db push
```
> Alternativa sem CLI: colar cada arquivo de `supabase/migrations/` (na ordem
> 0001 → 0007) no SQL Editor do painel.

## 2. Deploy das Edge Functions
```bash
supabase functions deploy --project-ref <NOVO_REF>
supabase secrets set \
  APP_URL="https://mirianbarreto.com.br" \
  CRON_SECRET="<string aleatória>" \
  MP_ACCESS_TOKEN="<token Mercado Pago>" \
  RESEND_API_KEY="<chave Resend>" \
  EMAIL_FROM="Mirian Barreto <contato@mirianbarreto.com.br>" \
  --project-ref <NOVO_REF>
```

## 3. Recriar contas demo + assinaturas/pagamentos/progresso
```bash
cd app
SUPABASE_URL=https://<REF>.supabase.co SUPABASE_SERVICE_ROLE=<service_role> \
  node supabase/seed/demo-users.mjs
```

## 4. Gerar capas dos treinos e avatares
```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... node supabase/seed/media.mjs
```

## 5. Configurar Auth (painel)
- **Site URL:** `https://mirianbarreto.com.br`
- **Redirect URLs:** `/login`, `/redefinir-senha` (produção e `http://localhost:3000`)

## 6. Limite de upload do Storage
Settings → Storage → **Upload file size limit = 1 GB**
(necessário para os vídeos convertidos, que passam de 50 MB).

## 7. Atualizar o front-end
- `app/.env.local`: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- **Vercel** → Project → Settings → Environment Variables (as mesmas duas) → **Redeploy**

## 8. Vídeos
Os vídeos ficam no Storage (bucket privado `workout-videos`) e são convertidos
pelo worker da VPS. Reenviar pelo painel admin ou reprocessar os originais.

---

### Contas demo criadas pelo passo 3
| Papel | E-mail | Senha |
|---|---|---|
| Admin | `admin.demo@mirianbarreto.app` | `Admin#Demo2026` |
| Aluna | `aluna.demo@mirianbarreto.app` | `Aluna#Demo2026` |
| 8 alunas fictícias | `*@alunasdemo.mirian.app` | `AlunaDemo#2026` |
