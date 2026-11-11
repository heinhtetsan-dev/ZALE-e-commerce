# Stride Fashion — Back-End

REST API for the Stride men's and women's fashion shop: catalog, auth, cart, checkout with atomic stock handling, orders, reviews, wishlist, admin and Stripe (test mode) payments.

**Stack:** Node.js 20+, Express 5, TypeScript (ESM), PostgreSQL + Prisma 7, Zod, JWT + bcrypt, Stripe.
The product contract lives in `../PROJECT_SPEC.md`.

## Quick start

```bash
npm install
cp .env.example .env          # then set JWT_SECRET to a random 32+ char string
npm run db:start              # local PostgreSQL on :5433 (keep running in its own terminal)
npm run db:deploy             # apply migrations
npm run db:seed               # 56 clothing & accessory items (men's / women's / unisex), demo accounts
npm run dev                   # http://localhost:4000/api/v1
```

`db:start` runs real PostgreSQL binaries from the `embedded-postgres` package, so no system install is needed. To use your own server, point `DATABASE_URL` / `TEST_DATABASE_URL` at it (PostgreSQL 14+) and skip `db:start`.

The demo catalog (`prisma/catalog.ts`) lists real branded clothing at typical retail prices for educational use, plus generic items under the house label `Stride Essentials`. Sizes are labels (`XS`–`XXL`, waist sizes, `One Size`). Product photos are freely licensed images from Wikimedia Commons (`prisma/catalog-images.ts`). Each one keeps the photographer credit and source link its license requires, and the shop shows them under the product image. Re-running the seed refreshes catalog text and images but never changes stock, and hides products that are no longer in the catalog. `npx tsx scripts/check-catalog-images.ts` verifies every catalog photo loads from the Wikimedia thumbnail CDN.

Demo accounts (from the seed): `admin@shoeshop.test` / `Admin123!`, `customer@shoeshop.test` / `Customer123!`.

## Scripts

| Script | Purpose |
|---|---|
| `dev` | Watch mode API server |
| `build` / `start` | Compile to `dist/` and run it |
| `typecheck` | `tsc --noEmit` |
| `test` | Integration tests (Vitest + Supertest) against `TEST_DATABASE_URL` |
| `db:start` | Local embedded PostgreSQL (dev only) |
| `db:migrate` / `db:deploy` | Create a migration (dev) / apply migrations (CI, prod) |
| `db:seed` | Seed demo data (idempotent) |
| `jobs:expire-orders` | One-shot sweep of unpaid orders (for cron deployments) |

## Architecture

```
src/
  app.ts               Express app (security headers, CORS, rate limits, routers)
  server.ts            HTTP server, graceful shutdown, unpaid-order sweep
  config/env.ts        Zod-validated environment
  lib/                 prisma client, errors, JWT, pagination, logger
  middleware/          auth (JWT, roles), rate limits, error handler
  modules/<feature>/   *.routes.ts (HTTP + Zod parsing) and *.service.ts (logic)
prisma/
  schema.prisma        data model
  migrations/          SQL migrations, incl. hand-written CHECK constraints and trigram indexes
tests/                 integration tests (one file per feature)
```

### Checkout and stock

Stock is only decremented when the customer confirms checkout (`POST /orders`). Inside one transaction, each cart line runs a single conditional statement:

```sql
UPDATE "ProductVariant" SET stock = stock - $qty WHERE id = $variant AND stock >= $qty
```

If any line updates zero rows, the transaction rolls back and the API answers `409 OUT_OF_STOCK` with the available quantity and other in-stock sizes. Row locks serialise concurrent buyers, and `CHECK (stock >= 0)` backs it up at the schema level. `tests/checkout.test.ts` races 8 buyers for the last pair and 20 buyers for 5 pairs.

Unpaid orders hold their stock for `ORDER_PAYMENT_TIMEOUT_MINUTES` (default 30). They are then cancelled and restocked by an idempotent sweep that is safe to run on every instance.

### Scalability

- **Stateless:** JWT auth, no sessions; any instance can serve any request.
- **Pagination** everywhere, with a maximum page size of 48.
- **Indexes** on every filtered or sorted column, plus trigram GIN indexes for search.
- **Images** are CDN URLs or object keys under `CDN_BASE_URL`. Admins get presigned S3 upload URLs when `S3_*` is configured. The API never serves image bytes.
- **Caching:** public catalog responses send `Cache-Control` so a CDN can cache them.
- **Rate limiting:** global per-IP limit, plus a stricter limit on auth endpoints (login counts failed attempts only). The store is in memory, so use a shared store (e.g. `rate-limit-redis`) when running several instances.

## Stripe (test mode)

1. Set `PAYMENTS_MODE=stripe`, `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_PUBLISHABLE_KEY=pk_test_...`. Only test keys are accepted.
2. Forward webhooks locally with `stripe listen --forward-to localhost:4000/api/v1/payments/webhook`, then put the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
3. Pay with card `4242 4242 4242 4242`, any future date and any CVC.

Without a webhook tunnel, orders still flip to paid: `GET /orders/:id` reconciles with Stripe. A payment that lands on an already-cancelled order is refunded automatically.

`PAYMENTS_MODE=mock` (the default for local development) needs no keys. It is refused when `NODE_ENV=production`.

## Testing

```bash
npm run db:start   # if not already running
npm test
```

Tests run against the separate `shoeshop_test` database. Each file truncates the tables it uses. Stripe network calls are stubbed, but webhook signatures are verified with Stripe's real signing code.
