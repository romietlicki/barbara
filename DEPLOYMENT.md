# Deploy — WhatsApp Digest SaaS

## Opção A: Railway (recomendado para produção)

Railway detecta o monorepo automaticamente via Nixpacks. Cada serviço aponta para
o root do repositório e usa comandos distintos de build e start.

### 1. Criar o projeto

```bash
railway login
railway init          # cria novo projeto
```

### 2. Adicionar plugins de infra

No dashboard Railway → seu projeto:

- **Add Plugin → PostgreSQL** — anote `DATABASE_URL`
- **Add Plugin → Redis** — anote `REDIS_URL`

### 3. Criar serviço **api** (Fastify)

1. New Service → GitHub Repo → selecione este repositório
2. Nome do serviço: `api`
3. Settings → Build & Deploy:
   - **Root Directory**: `/` (deixe vazio — usa raiz do repo)
   - **Build Command**: (sobrescrito pelo `apps/api/railway.json`)
   - **Start Command**: (sobrescrito pelo `apps/api/railway.json`)
4. Adicione as variáveis de ambiente (ver seção abaixo)
5. Settings → Networking → Generate Domain (ex: `api-prod.up.railway.app`)

### 4. Criar serviço **web** (Next.js)

1. New Service → GitHub Repo → mesmo repositório
2. Nome do serviço: `web`
3. Settings → Build & Deploy:
   - **Root Directory**: `/` (deixe vazio)
4. Adicione as variáveis de ambiente
5. Settings → Networking → Generate Domain (ex: `app.suaagencia.com.br`)

> **Nota sobre `railway.json`**: O Railway detecta `apps/api/railway.json` e
> `apps/web/railway.json` automaticamente quando o serviço tem o root directory
> apontando para a pasta correspondente. Se preferir usar o root `/`, configure
> Build Command e Start Command manualmente conforme os `railway.json` de cada serviço.

### 5. Migrations em deploy

No serviço `api`, adicione em Settings → Deploy → Pre-deploy Command:

```
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

Ou execute manualmente via Railway CLI após o primeiro deploy:

```bash
railway run --service api -- npx prisma migrate deploy \
  --schema packages/db/prisma/schema.prisma
```

---

## Variáveis de ambiente

### Serviço `api`

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | PostgreSQL (Railway plugin) | `postgresql://...` |
| `REDIS_URL` | Redis (Railway plugin) | `redis://...` |
| `AUTH_SECRET` | `openssl rand -base64 32` | `abc123...` |
| `INTERNAL_API_KEY` | `openssl rand -hex 32` | `deadbeef...` |
| `EVOLUTION_API_URL` | URL pública da Evolution API | `https://wa.suaapp.com` |
| `EVOLUTION_API_KEY` | Chave da Evolution API | `changeme-...` |
| `EVOLUTION_WEBHOOK_SECRET` | Token de validação do webhook | `secret-...` |
| `EVOLUTION_WEBHOOK_BASE_URL` | URL pública do serviço `api` | `https://api-prod.up.railway.app` |
| `ANTHROPIC_API_KEY` | Chave da API Claude | `sk-ant-...` |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe | `whsec_...` |
| `STRIPE_PRICE_ID` | ID do price do plano recorrente | `price_...` |
| `SMTP_HOST` | Host SMTP (ex: Resend) | `smtp.resend.com` |
| `SMTP_PORT` | Porta SMTP | `465` |
| `SMTP_USER` | Usuário SMTP | `resend` |
| `SMTP_PASS` | Senha/API key SMTP | `re_...` |
| `EMAIL_FROM` | Remetente padrão | `noreply@suaapp.com` |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | `abc123` |
| `R2_ACCESS_KEY_ID` | R2 Access Key | `...` |
| `R2_SECRET_ACCESS_KEY` | R2 Secret | `...` |
| `R2_BUCKET_NAME` | Nome do bucket R2 | `whatsapp-digest-prod` |
| `R2_PUBLIC_URL` | URL pública do bucket | `https://...r2.dev` |
| `CORS_ORIGIN` | URL do serviço web | `https://app.suaagencia.com.br` |
| `API_PORT` | Porta do Fastify | `3001` |
| `API_HOST` | Host do Fastify | `0.0.0.0` |
| `LOG_LEVEL` | Nível de log | `info` |
| `NODE_ENV` | Ambiente | `production` |

### Serviço `web`

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Mesmo PostgreSQL |
| `AUTH_SECRET` | Mesmo valor do `api` |
| `INTERNAL_API_KEY` | Mesmo valor do `api` |
| `INTERNAL_API_URL` | URL **interna** Railway do serviço api (ex: `http://api.railway.internal:3001`) |
| `NEXT_PUBLIC_APP_URL` | URL pública do `web` (ex: `https://app.suaagencia.com.br`) |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Domínio raiz para extração de slug (ex: `suaagencia.com.br`) |
| `STRIPE_SECRET_KEY` | Mesmo valor do `api` |
| `STRIPE_PRICE_ID` | Mesmo valor do `api` |
| `EVOLUTION_API_URL` | Mesmo valor do `api` |
| `EVOLUTION_API_KEY` | Mesmo valor do `api` |

> **`INTERNAL_API_URL`**: No Railway, use a URL de rede privada entre serviços
> (`*.railway.internal`) para evitar latência e egress. Encontre em:
> Settings → Networking → Private Networking do serviço `api`.

---

## Webhook Stripe — configuração

1. No [Stripe Dashboard](https://dashboard.stripe.com/webhooks) → Add Endpoint
2. URL: `https://api-prod.up.railway.app/webhooks/stripe`
3. Eventos a escutar:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copie o **Signing secret** para `STRIPE_WEBHOOK_SECRET`

---

## Webhook Evolution API — configuração

A Evolution API chama o endpoint `POST /webhooks/wa/:agencySlug` para cada mensagem.

Configure no painel da Evolution API (ou via `EvolutionApiClient.createInstance`):

```
URL: https://api-prod.up.railway.app/webhooks/wa/<agencySlug>
Token: <EVOLUTION_WEBHOOK_SECRET>
Eventos: MESSAGES_UPSERT, CONNECTION_UPDATE
```

---

## Opção B: VPS com Docker Compose

Para staging em um VPS (Ubuntu/Debian):

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/whatsapp-digest.git
cd whatsapp-digest

# 2. Configure variáveis
cp .env.example .env
# Edite .env com os valores reais

# 3. Suba a stack completa
docker compose -f docker-compose.staging.yml up -d

# 4. Execute migrations (primeira vez)
docker compose -f docker-compose.staging.yml run --rm migrate

# 5. Execute seed (opcional — apenas para staging)
docker compose -f docker-compose.staging.yml exec api \
  node_modules/.bin/tsx packages/db/src/seed.ts
```

### Atualizar para nova versão

```bash
git pull
docker compose -f docker-compose.staging.yml build
docker compose -f docker-compose.staging.yml run --rm migrate
docker compose -f docker-compose.staging.yml up -d
```

---

## E2E Tests em CI (GitHub Actions)

```yaml
# .github/workflows/e2e.yml
name: E2E

on: [push]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: whatsapp_digest
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 5s
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '9' }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }

      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @repo/db generate
      - run: pnpm --filter @repo/db migrate:prod
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_digest

      - run: pnpm --filter @repo/db seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_digest

      - run: pnpm --filter @repo/e2e exec playwright install --with-deps chromium

      - run: pnpm --filter @repo/web build
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_digest
          AUTH_SECRET: ci-secret-min-32-chars-placeholder00
          INTERNAL_API_KEY: ci-internal-key-placeholder
          NEXT_PUBLIC_APP_URL: http://localhost:3000
          NEXT_PUBLIC_ROOT_DOMAIN: localhost:3000
          DEV_AGENCY_SLUG: acme

      - run: pnpm test:e2e
        env:
          E2E_SKIP_SERVER_START: 'true'
          E2E_BASE_URL: http://localhost:3000
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_digest
          AUTH_SECRET: ci-secret-min-32-chars-placeholder00
          INTERNAL_API_KEY: ci-internal-key-placeholder
          NEXT_PUBLIC_APP_URL: http://localhost:3000
          NEXT_PUBLIC_ROOT_DOMAIN: localhost:3000
          DEV_AGENCY_SLUG: acme

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/e2e/playwright-report/
```

---

## Checklist de go-live

- [ ] `AUTH_SECRET` gerado com `openssl rand -base64 32`
- [ ] `INTERNAL_API_KEY` gerado com `openssl rand -hex 32`
- [ ] Domínio personalizado configurado no Railway (web + api)
- [ ] Webhook Stripe cadastrado e `STRIPE_WEBHOOK_SECRET` atualizado
- [ ] Evolution API rodando e acessível pelo serviço `api`
- [ ] Webhook Evolution API configurado por agência (via painel ou `createInstance`)
- [ ] R2 bucket criado com CORS configurado (se usando storage longo)
- [ ] SMTP configurado (Resend recomendado) e domínio de envio verificado
- [ ] Migration aplicada (`prisma migrate deploy`)
- [ ] Seed de produção NÃO executado (seed é apenas para dev/staging)
- [ ] Logs verificados no Railway após primeiro deploy
- [ ] E2E rodando verde em CI
