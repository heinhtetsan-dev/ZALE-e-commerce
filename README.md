# Shoe Shop — Front-End

Responsive web storefront and admin back office for the Stride shoe shop. It is built mobile-first, so it works in phone browsers as well as on desktop.

**Stack:** React 19, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS 4, Zod, Stripe Elements.
It talks to the back-end REST API (separate repository) described in `../PROJECT_SPEC.md`.

## Quick start

```bash
npm install
cp .env.example .env     # VITE_API_URL=/api/v1, proxied by Vite to http://localhost:4000
npm run dev              # http://localhost:5173
```

In development the browser only talks to the Vite server, which forwards `/api` to the back-end. So the site works whether you open it at `localhost`, `127.0.0.1` or your LAN IP (`npm run dev -- --host` to try it from a phone on the same Wi-Fi). For a production build, set `VITE_API_URL` to the API's public URL.

The back-end must be running and seeded (see its README). Demo accounts: `customer@shoeshop.test` / `Customer123!` and `admin@shoeshop.test` / `Admin123!`.

## Scripts

| Script | Purpose |
|---|---|
| `dev` / `build` / `preview` | Vite dev server, production build, preview the build |
| `typecheck` | `tsc -b` |
| `lint` | oxlint |
| `test` | Unit and component tests (Vitest + Testing Library, mocked API) |
| `test:e2e` | Playwright end-to-end tests on desktop and Pixel 7 viewports, against the real API (needs the back-end running and seeded) |

Run `npx playwright install chromium` once before the first `test:e2e`.

## Structure

```
src/
  main.tsx, router.tsx    providers and routes (admin and payment pages are lazy-loaded)
  lib/                    API client, types, formatting, form helpers
  auth/                   auth context (JWT in localStorage), Zod form schemas
  cart/                   unified cart: guest cart in localStorage, server cart when logged in
  catalog/                URL-driven filters and the filter panel
  checkout/               address schema, Stripe Payment Element
  wishlist/               optimistic wishlist hook
  components/             shared UI (layout, cards, pagination, reviews, notices)
  pages/                  customer pages
  admin/                  dashboard, product editor with per-size stock, orders
e2e/                      Playwright specs
```

## Behaviour notes

- **Filters, sorting and pagination** live in the URL, so results are shareable and survive refresh and the back button.
- **Size is required** to add to cart. Sold-out sizes are disabled, and low stock shows "Only N left".
- **The cart does not reserve stock.** Stock is reserved when the order is placed. If a size sells out first, checkout shows which item ran out and offers the other in-stock sizes as one-tap swaps.
- **Guest carts** are merged into the account cart on login or registration.
- **Payments:** in Stripe test mode the payment page renders the Stripe Payment Element (card `4242 4242 4242 4242`). In mock mode it shows a test "Pay" button.
