# Shoe Shop — Project Specification

Status: living document. Any intentional deviation in the implementation must be reflected here in the same change.

## 1. Overview

An online shoe store with a customer storefront and an admin back office.

| Application | Folder       | Stack                                                                 | Repository        |
|-------------|--------------|-----------------------------------------------------------------------|-------------------|
| Back-End    | `backend/`   | Node.js, Express 5, TypeScript (ESM), Prisma 7 + PostgreSQL, Zod, JWT, bcrypt, Stripe | own Git repo      |
| Front-End   | `frontend/`  | React 19, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, Zod, Stripe Elements | own Git repo      |

The two applications are independent projects (separate `package.json`, configuration, dependencies and Git repository). They communicate only over the REST API described in §5. There is no mobile app: the web front-end is responsive (mobile-first, usable from 360px wide).

This spec lives at the workspace root and is versioned in its own small Git repository.

## 2. Roles

- **Guest** — browse catalog, keep a local cart.
- **Customer** — everything a guest can do, plus persistent server cart, checkout, profile, order history, wishlist, reviews.
- **Admin** — product CRUD, per-size stock, order status updates, sales dashboard. Admins are created by the seed script (or by promoting a user in the DB); registration always creates customers.

## 3. Functional requirements

### 3.1 Catalog
- Product list with full-text-ish search (`q` matches name, description, brand name; case-insensitive).
- Filters: brand (multi), category (multi), color (multi), size (multi; product must have that size **in stock**), price range (min/max).
- Sorting: `newest` (default), `price_asc`, `price_desc`, `rating`, `name`.
- Pagination: `page` (1-based) and `pageSize` (default 12, max 48). Responses include `total` and `totalPages`.
- Product detail: images, description, brand, category, color, price, average rating, size grid with per-size stock status:
  - `in_stock` (stock ≥ 5), `low_stock` (1–4, shows "Only N left"), `out_of_stock` (0, size disabled).
- Only active products (`isActive = true`) are visible to non-admins.

### 3.2 Cart
- A size (variant) is **required** to add to cart.
- Update quantity, remove items. Quantity per line: 1–10, and may not exceed current stock (validated on add/update; stock is **not** reserved by the cart).
- Persistent cart: stored server-side for logged-in customers. Guests keep a cart in `localStorage`; on login/registration the guest cart is merged into the server cart (`POST /cart/merge`), quantities summed and capped by stock and the line limit.

### 3.3 Checkout and stock (critical)
- Checkout requires login and a shipping address.
- **Stock is decremented only at checkout confirmation** (`POST /orders`), never at add-to-cart.
- Inside a single database transaction, for each cart line the API executes one conditional statement:

  ```sql
  UPDATE "ProductVariant" SET stock = stock - $qty, "updatedAt" = now()
  WHERE id = $variantId AND stock >= $qty      -- for qty = 1 this is "stock > 0"
  ```

  If any statement affects 0 rows, the whole transaction is rolled back and no stock changes. Because the row is locked by the UPDATE and the predicate is re-evaluated after the lock is acquired, two concurrent buyers can never both get the last pair.
- The table has `CHECK (stock >= 0)` as a second line of defence.
- Out-of-stock response: HTTP 409 with code `OUT_OF_STOCK` listing each failing line with `available` quantity and `alternatives` (other sizes of the same product with stock > 0). The UI shows a clear message and offers the suggested sizes.
- Prices are re-read from the database at checkout and snapshotted on the order items.
- On success, the order is created with status `PENDING` / payment `UNPAID`, the cart is cleared, and a Stripe PaymentIntent is created.

### 3.4 Payments (Stripe, test mode)
- `POST /orders` returns a `clientSecret`; the front-end confirms the card with Stripe Elements (Payment Element).
- The Stripe webhook (`payment_intent.succeeded`) marks the order `PAID`. `payment_intent.payment_failed` keeps it `UNPAID` (customer may retry with the same intent). `GET /orders/:id` also reconciles with Stripe when the order is still unpaid, so the confirmation page works even without a webhook in local dev.
- Unpaid orders older than `ORDER_PAYMENT_TIMEOUT_MINUTES` (default 30) are cancelled and their stock restored by an idempotent sweep (conditional `UPDATE … WHERE status='PENDING' AND "paymentStatus"='UNPAID'`), safe to run from many instances. Customers may also cancel their own unpaid pending orders, which restores stock.
- `PAYMENTS_MODE=mock` (local dev / tests without Stripe keys): no Stripe call; the client calls `POST /orders/:id/pay/mock` which marks the order paid. Mock mode is refused when `NODE_ENV=production`.

### 3.5 Accounts
- Register (name, email, password ≥ 8 chars), login, logout (client discards the token).
- Profile: view/update name, change password (requires current password).
- Order history: paginated list and order detail with items, totals, status and payment status.

### 3.6 Wishlist
- Customers add/remove products (not sizes) and view the list; the product card and detail page show a heart toggle.

### 3.7 Reviews and ratings
- One review per customer per product (1–5 stars, optional title, comment up to 2000 chars). Editable and deletable by the author; deletable by admins.
- `Product.ratingAvg` and `Product.ratingCount` are recomputed in the same transaction as the review write (denormalised for sorting and listing).
- Reviews are listed newest first, paginated. Reviews from customers with a paid order containing the product are flagged `verifiedPurchase`.

### 3.8 Admin
- Product CRUD (name, slug, description, brand, category, color, price, images, active flag). Delete is a soft delete (`isActive=false`) when the product is referenced by orders, otherwise a hard delete.
- Per-size stock management: add sizes, set absolute stock per size (validated ≥ 0), remove sizes without orders.
- Orders: list/filter by status; status transitions **`PENDING → SHIPPED → DELIVERED`** (only forward, one step at a time; `PENDING → SHIPPED` requires payment `PAID`). `CANCELLED` is set only by the system/customer for unpaid orders.
- Sales dashboard: revenue and paid order count for a date range (default last 30 days), average order value, orders by status, revenue per day, top 5 products by units, low-stock variants (stock ≤ 3).
- Image upload: `POST /admin/uploads/presign` returns a presigned S3-compatible PUT URL and the public CDN URL when storage is configured; otherwise admins paste image URLs.

## 4. Data model (PostgreSQL via Prisma)

Money is stored as integer cents (`Int`). IDs are UUIDs. Sizes are EU sizes stored as `Decimal(4,1)` (e.g. `42`, `42.5`).

| Model | Key fields | Constraints / indexes |
|---|---|---|
| `User` | email, passwordHash, name, role (`CUSTOMER`/`ADMIN`) | unique email |
| `Brand` | name, slug | unique name, slug |
| `Category` | name, slug | unique name, slug |
| `Product` | slug, name, description, brandId, categoryId, color, priceCents, images[], isActive, ratingAvg, ratingCount | unique slug; indexes on brandId, categoryId, color, priceCents, createdAt, ratingAvg, isActive; trigram GIN index on name for search |
| `ProductVariant` | productId, size, stock | unique (productId, size); index (size, stock); **CHECK (stock >= 0)** |
| `CartItem` | userId, variantId, quantity | unique (userId, variantId); CHECK quantity 1–10 |
| `Order` | userId, status, paymentStatus, subtotalCents, shippingCents, totalCents, shipping address fields, stripePaymentIntentId, paidAt, shippedAt, deliveredAt, cancelledAt | index (userId, createdAt), (status, createdAt), (paymentStatus, createdAt); unique stripePaymentIntentId |
| `OrderItem` | orderId, variantId, productId, productName, size, unitPriceCents, quantity | index productId, variantId |
| `Review` | userId, productId, rating, title, comment | unique (userId, productId); CHECK rating 1–5; index (productId, createdAt) |
| `WishlistItem` | userId, productId | unique (userId, productId) |

Shipping: flat `SHIPPING_FLAT_CENTS` (default 800), free when subtotal ≥ `FREE_SHIPPING_THRESHOLD_CENTS` (default 10000).

## 5. REST API

Base path `/api/v1`. JSON in/out. Auth via `Authorization: Bearer <jwt>`. Errors use one envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {} } }
```

Common codes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `OUT_OF_STOCK` 409, `RATE_LIMITED` 429, `INTERNAL` 500.

Paginated responses: `{ "items": [...], "page": 1, "pageSize": 12, "total": 40, "totalPages": 4 }`.

### Health
- `GET /health` — liveness; `GET /health/ready` — DB check.

### Auth
- `POST /auth/register` `{ name, email, password }` → `{ token, user }`
- `POST /auth/login` `{ email, password }` → `{ token, user }`
- `GET /auth/me` → `{ user }`
- `PATCH /auth/me` `{ name }` → `{ user }`
- `POST /auth/change-password` `{ currentPassword, newPassword }` → 204

### Catalog (public)
- `GET /products` — query: `q, brand, category, color, size` (comma-separated lists), `minPrice, maxPrice` (cents), `sort, page, pageSize`.
- `GET /products/facets` → `{ brands, categories, colors, sizes, price: { min, max } }` (active products only)
- `GET /products/:slug` → product with `variants[]` (`id, size, stock, stockStatus`)
- `GET /products/:productId/reviews?page&pageSize`

### Cart (customer)
- `GET /cart` → `{ items: [{ id, quantity, variant: { id, size, stock }, product: {...} }], subtotalCents }`
- `POST /cart/items` `{ variantId, quantity }` (adds to existing line)
- `PATCH /cart/items/:itemId` `{ quantity }`
- `DELETE /cart/items/:itemId`
- `POST /cart/merge` `{ items: [{ variantId, quantity }] }`

### Orders (customer)
- `POST /orders` `{ shippingAddress: { fullName, line1, line2?, city, postalCode, country, phone? } }` → 201 `{ order, payment: { mode, clientSecret } }` | 409 `OUT_OF_STOCK` | 400 empty cart
- `GET /orders?page&pageSize`, `GET /orders/:id`
- `POST /orders/:id/cancel` (only `PENDING` + `UNPAID`)
- `POST /orders/:id/pay/mock` (mock mode only)

### Payments
- `GET /payments/config` → `{ mode: "stripe" | "mock", publishableKey }`
- `POST /payments/webhook` — Stripe webhook (raw body, signature verified)

### Reviews (customer)
- `POST /products/:productId/reviews` `{ rating, title?, comment? }`
- `PATCH /reviews/:id`, `DELETE /reviews/:id`

### Wishlist (customer)
- `GET /wishlist`, `POST /wishlist` `{ productId }`, `DELETE /wishlist/:productId`

### Admin (role `ADMIN`)
- `GET /admin/products?q&page&pageSize&includeInactive`, `GET /admin/products/:id`
- `POST /admin/products`, `PATCH /admin/products/:id`, `DELETE /admin/products/:id`
- `PUT /admin/products/:id/variants` `{ variants: [{ size, stock }] }` — upsert sizes and set absolute stock; sizes omitted are removed if never ordered (else stock set to 0)
- `PATCH /admin/variants/:id` `{ stock }`
- `GET /admin/orders?status&page&pageSize`, `PATCH /admin/orders/:id/status` `{ status }`
- `GET /admin/summary?from&to`
- `POST /admin/uploads/presign` `{ contentType, fileName }` → `{ uploadUrl, publicUrl }` (501 if storage not configured)
- `GET /admin/brands`, `GET /admin/categories` (also public via facets)

## 6. Non-functional requirements

- **Stateless API**: JWT auth, no server sessions; any instance can serve any request. Background sweep is idempotent.
- **Pagination** on every list endpoint, with enforced maximum page size.
- **Indexes** on all filtered/sorted columns (see §4).
- **Images** are absolute URLs on cloud storage/CDN (`CDN_BASE_URL`); the API never serves image bytes.
- **Rate limiting**: global limiter (default 300 req / 15 min / IP) and a strict limiter on auth endpoints (default 20 / 15 min / IP). The in-memory store is per instance; a shared store (e.g. Redis) should be configured when running multiple instances.
- **Security**: bcrypt (cost 12) password hashes, Helmet, CORS allow-list (`CORS_ORIGINS`), Zod validation on every input, request body limit 100kb, JWT secret ≥ 32 chars required.
- **Validation**: Zod on the back-end for every body/query/param; Zod on front-end forms.
- **Testing**: back-end integration tests (Vitest + Supertest) against a real PostgreSQL, including a concurrency test for the last pair; front-end type-check, unit tests and production build.

## 7. Front-End pages

| Route | Page |
|---|---|
| `/` | Product list: search, filter sidebar (drawer on mobile), sort, pagination; filters in URL query string |
| `/products/:slug` | Detail: gallery, size grid with stock status, add to cart, wishlist, reviews |
| `/cart` | Cart lines, quantity, remove, subtotal, checkout button |
| `/checkout` | Shipping form → place order (stock reservation) → payment (Stripe Payment Element or mock) |
| `/orders/:id/confirmation` | Payment result / order confirmation |
| `/login`, `/register` | Auth forms |
| `/account` | Profile and password change |
| `/account/orders`, `/account/orders/:id` | Order history and detail |
| `/wishlist` | Wishlist |
| `/admin` | Sales dashboard |
| `/admin/products`, `/admin/products/new`, `/admin/products/:id` | Product CRUD and per-size stock |
| `/admin/orders` | Order list and status updates |

## 8. Configuration

Back-End `.env` (see `backend/.env.example`): `DATABASE_URL, PORT, NODE_ENV, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGINS, PAYMENTS_MODE, STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, CDN_BASE_URL, S3_*, RATE_LIMIT_*, ORDER_PAYMENT_TIMEOUT_MINUTES, SHIPPING_FLAT_CENTS, FREE_SHIPPING_THRESHOLD_CENTS`.

Front-End `.env` (see `frontend/.env.example`): `VITE_API_URL`.

Local development uses `embedded-postgres` (real PostgreSQL binaries via npm, `npm run db:start` in `backend/`) when no PostgreSQL server is available; any PostgreSQL 14+ works via `DATABASE_URL`.

## 9. Changelog
- v1.0 — initial specification.
