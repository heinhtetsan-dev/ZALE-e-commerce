# Stride Fashion — Project Specification

Status: living document. Any intentional deviation in the implementation must be reflected here in the same change.

## 1. Overview

An online men's and women's fashion store (clothing and accessories) with a customer storefront and an admin back office. (The project started as a shoe shop; repository, database and package names still say `shoeshop`.)

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
- **Men's and women's sections.** Every product has a gender: `MEN`, `WOMEN` or `UNISEX`. Shoppers browse Men, Women or All (header navigation and tabs on the listing). Unisex products appear under both. Switching audience clears the size filter.
- **Sizes are labels.** Letter sizes (XS–XXL, plus S/M, M/L, L/XL for caps), waist sizes for jeans and trousers (men 28–38, women 24–32) and `One Size` for most accessories. The API orders them by fit (letters in wearing order, then numeric sizes, then One Size), and admins' size input is normalized (`m` becomes `M`, so sizes are unique case-insensitively).
- **Colors.** Each product is one color of an item, with its name as sold in `colorway` (e.g. "Medium Stonewash") and a base `color` used by the color filter. Products sharing a `styleGroup` are colors of the same item. The detail page shows them as swatches labelled "Color" (same audience plus unisex).
- **Image attribution.** Product photos may be freely licensed (e.g. Wikimedia Commons). `imageCredit` and `imageSourceUrl` hold the attribution required by CC BY / BY-SA licenses and are shown under the product image.
- Product list with full-text-ish search (`q` matches name, colorway, description, brand name; case-insensitive).
- Filters (storefront): category (multi), color (multi), size (multi; product must have that size **in stock**), price range (min/max). The API also accepts a `brand` filter, but the storefront no longer shows it (v1.6). Changing a filter keeps the scroll position; paging scrolls back to the top.
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
- When an unpaid order is cancelled or expires, its PaymentIntent is cancelled. A payment that still succeeds for a cancelled order is refunded automatically and the order's payment status becomes `REFUNDED`.
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

Money is stored as integer cents (`Int`). IDs are UUIDs. All timestamps are `timestamptz`, and the API's database sessions run with `TimeZone=UTC` (required by the Prisma pg driver adapter, which sends dates without an offset). Sizes are text labels (1–20 chars, `CHECK` enforced), e.g. `M`, `32`, `One Size`.

| Model | Key fields | Constraints / indexes |
|---|---|---|
| `User` | email, passwordHash, name, role (`CUSTOMER`/`ADMIN`) | unique email |
| `Brand` | name, slug | unique name, slug |
| `Category` | name, slug | unique name, slug |
| `Product` | slug, name, description, brandId, categoryId, color, colorway?, gender (`MEN`/`WOMEN`/`UNISEX`), styleGroup?, priceCents, images[], imageCredit?, imageSourceUrl?, isActive, ratingAvg, ratingCount | unique slug; indexes on brandId, categoryId, color, gender, styleGroup, priceCents, createdAt, ratingAvg, isActive; trigram GIN index on name for search |
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
- `GET /products` — query: `gender` (`men` | `women`, each including unisex), `q, brand, category, color, size` (comma-separated lists), `minPrice, maxPrice` (cents), `sort, page, pageSize`. Items include `gender`, `colorway`, `styleGroup`.
- `GET /products/facets?gender` → `{ brands, categories, colors, sizes, price: { min, max } }` (active products only, scoped to the audience when given)
- `GET /products/:slug` → product with `variants[]` (`id, size, stock, stockStatus`), `colorways[]` (`slug, colorway, color, image, inStock`), `imageCredit`, `imageSourceUrl`
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
- `POST /orders/:id/payment` → `{ mode, clientSecret }` — (re)obtain the payment session for a `PENDING` + `UNPAID` order (e.g. if the provider call failed during checkout or the customer left the payment page)
- `POST /orders/:id/cancel` (only `PENDING` + `UNPAID`)
- `POST /orders/:id/pay/mock` (mock mode only)

### Payments
- `GET /payments/config` → `{ mode: "stripe" | "mock", publishableKey }`
- `POST /payments/webhook` — Stripe webhook (raw body, signature verified)

### Reviews (customer)
- `GET /products/:productId/reviews?page&pageSize` (public; default page size 5) → page of `{ id, rating, title, comment, createdAt, verifiedPurchase, author: { id, name } }` plus `distribution: { "1": n, …, "5": n }`. Author names are shortened ("Ada L.").
- `GET /products/:productId/reviews/mine` → `{ review | null }`
- `POST /products/:productId/reviews` `{ rating, title?, comment? }` → 201 | 409 if already reviewed
- `PATCH /reviews/:id` (author), `DELETE /reviews/:id` (author or admin)

### Wishlist (customer)
- `GET /wishlist?page&pageSize` → page of `{ addedAt, product }` (product card shape)
- `GET /wishlist/ids` → `{ productIds }` (for heart toggles)
- `POST /wishlist` `{ productId }` (idempotent, 201), `DELETE /wishlist/:productId` (204)

### Admin (role `ADMIN`)
- `GET /admin/products?q&page&pageSize&includeInactive` (items include `totalStock`), `GET /admin/products/:id` (includes `imageRefs` — the stored keys/URLs — plus `brandId`, `categoryId`)
- `POST /admin/products`, `PATCH /admin/products/:id`, `DELETE /admin/products/:id`
- `PUT /admin/products/:id/variants` `{ variants: [{ size, stock }] }` — upsert sizes and set absolute stock; sizes omitted are removed if never ordered (else stock set to 0)
- `PATCH /admin/variants/:id` `{ stock }`
- `GET /admin/orders?status&q&page&pageSize` (`q` matches customer name/email or recipient; items include `customer`), `PATCH /admin/orders/:id/status` `{ status: "SHIPPED" | "DELIVERED" }`
- `GET /admin/summary?from&to` (ISO dates; default last 30 days; max 1 year) → `{ revenueCents, paidOrders, averageOrderCents, awaitingShipment, ordersByStatus, revenueByDay[], topProducts[5], lowStock[10] }`
- `POST /admin/uploads/presign` `{ contentType, fileName }` → `{ uploadUrl, key, publicUrl }` (PUT URL valid 5 minutes; 501 if storage not configured). The returned `key` is stored in `images`.
- `GET /admin/brands`, `GET /admin/categories` (also public via facets)

## 6. Non-functional requirements

- **Stateless API**: JWT auth, no server sessions; any instance can serve any request. Background sweep is idempotent.
- **Pagination** on every list endpoint, with enforced maximum page size.
- **Indexes** on all filtered/sorted columns (see §4).
- **Front-end bundle**: admin pages and the Stripe payment form are lazy-loaded route chunks; Stripe.js loads only on the payment page in Stripe mode.
- **Images** are absolute URLs on cloud storage/CDN (`CDN_BASE_URL`); the API never serves image bytes.
- **Rate limiting**: global limiter (default 1000 req / 15 min / IP, sized for shoppers sharing a carrier/office NAT; health checks and the Stripe webhook exempt) and a strict limiter on auth endpoints (default 20 / 15 min / IP). For login only **failed** attempts count (brute-force protection without locking out legitimate users); registration and password change count every request. The in-memory store is per instance; a shared store (e.g. Redis) should be configured when running multiple instances.
- **Security**: bcrypt (cost 12) password hashes, Helmet, CORS allow-list (`CORS_ORIGINS`), Zod validation on every input, request body limit 100kb, JWT secret ≥ 32 chars required.
- **Validation**: Zod on the back-end for every body/query/param; Zod on front-end forms.
- **Testing**: back-end integration tests (Vitest + Supertest) against a real PostgreSQL, including a concurrency test for the last item in a size; front-end type-check, lint, unit tests (Vitest + Testing Library), production build, and Playwright end-to-end tests against the real API on desktop and mobile viewports.

## 7. Front-End pages

| Route | Page |
|---|---|
| `/`, `/?gender=men`, `/?gender=women` | Product list: All / Men / Women tabs, search, filter sidebar (drawer on mobile), sort, pagination; filters in URL query string |
| `/products/:slug` | Detail: gallery with photo credit, gender and category, color name and sibling colors, size picker with stock status, add to cart, wishlist, reviews |
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

Front-End `.env` (see `frontend/.env.example`): `VITE_API_URL`. In development it is the relative path `/api/v1` and the Vite dev/preview server proxies `/api` to the API (`API_PROXY_TARGET`, default `http://localhost:4000`), so the browser makes same-origin calls whether the site is opened via `localhost`, `127.0.0.1` or a LAN IP. Production builds set the API's public URL, which must be listed in the API's `CORS_ORIGINS`.

Databases must use UTF-8 encoding so names in any script (Burmese, Chinese, accented Latin…) can be stored. Local development uses `embedded-postgres` (real PostgreSQL binaries via npm, `npm run db:start` in `backend/`) when no PostgreSQL server is available; any PostgreSQL 14+ works via `DATABASE_URL`.

## 9. Changelog
- v1.0 — initial specification.
- v1.1 — added `POST /orders/:id/payment`; checkout `payment` may be `null` if the provider is unreachable (stock stays reserved until paid, cancelled or expired). Cart/order endpoints are available to any authenticated role; `/admin/*` requires `ADMIN`.
- v1.2 — timestamps are `timestamptz` with UTC sessions; login limiter counts failed attempts only; admin endpoint response details (`imageRefs`, `totalStock`, `customer`, order search `q`, summary shape, presign `key`). Front-end e2e tests (Playwright, desktop + mobile) added to §6 testing.
- v1.3 — reviews list/`mine`/distribution and wishlist `ids` + pagination specified; payment intents are voided when an unpaid order is cancelled or expires, and payments arriving for cancelled orders are refunded (`paymentStatus=REFUNDED`); global rate limit default raised to 1000/15 min; route-level code splitting.
- v1.4 — men's/women's/unisex catalog with gender filter and Men/Women navigation; real colorway names and colorway groups; image attribution fields; demo catalog of 40 real models from 12 brands with freely licensed Wikimedia Commons photos; UTF-8 database requirement.
- v1.5 — catalog switched from shoes to men's and women's clothing and accessories: size labels instead of EU numeric sizes (migration converts existing values), clothing categories, 56-item demo catalog from 16 real brands plus the house label "Stride Essentials" for generic items; product photos must come from the Wikimedia thumbnail CDN (originals on upload.wikimedia.org are rate-limited); friendly route error page (e.g. stale bundles after a deploy) instead of the router's developer screen.
- v1.6 — brand filter removed from the storefront (API still supports it); filter changes no longer reset the scroll position.
