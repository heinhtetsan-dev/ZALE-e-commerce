# ZALE Fashion Shop

An online men's and women's fashion shop: clothing, shoes and accessories, with a customer storefront and an admin back office.

- **Storefront:** catalog with filters and search, product variants and sizes, wishlist, reviews, cart, Stripe checkout (test mode), order history, and cancelling a paid order before it ships for a full refund.
- **Admin:** dashboard, products and stock, orders, customers and reviews.

## Stack

| Part | Tech |
|---|---|
| [frontend/](frontend/) | React 19, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS 4, Stripe Elements |
| [backend/](backend/) | Node.js 20+, Express 5, TypeScript, PostgreSQL + Prisma 7, Zod, JWT, Stripe |

The product specification is in [PROJECT_SPEC.md](PROJECT_SPEC.md).

## Quick start

Run each step in its own terminal.

**1. Database and API**

```bash
cd backend
npm install
cp .env.example .env     # then set JWT_SECRET to a random 32+ character string
npm run db:start         # local PostgreSQL on :5433, keep it running
npm run db:deploy        # apply migrations
npm run db:seed          # demo catalog and accounts
npm run dev              # http://localhost:4000/api/v1
```

**2. Storefront**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@zaleshop.test` | `Admin123!` |
| Customer | `customer@fashionshop.test` | `Customer123!` |

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for scripts, tests and configuration.
