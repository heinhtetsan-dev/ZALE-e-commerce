/**
 * Removes test data from the local database, keeping the catalog and the demo accounts.
 *
 *   npm run db:clean-test-data           → preview only (nothing is deleted)
 *   npm run db:clean-test-data -- --yes  → delete
 *
 * Deletes: every order (stock of orders that were not cancelled is put back),
 * every customer account except the demo customer (admins are kept),
 * products created by end-to-end tests ("E2E Tee …"), and test newsletter
 * sign-ups (@example.com). Refuses to run when NODE_ENV=production.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const DEMO_CUSTOMER = "customer@shoeshop.test";
const apply = process.argv.includes("--yes");

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to delete data: NODE_ENV is production.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, options: "-c TimeZone=UTC" }) });

const testUsers = { role: "CUSTOMER" as const, email: { not: DEMO_CUSTOMER } };
const testProducts = { name: { startsWith: "E2E Tee" } };
const testSubscribers = { email: { endsWith: "@example.com" } };

const [orders, users, products, subscribers] = await Promise.all([
  prisma.order.findMany({ select: { status: true, user: { select: { email: true } }, items: { select: { variantId: true, quantity: true } } } }),
  prisma.user.findMany({ where: testUsers, select: { email: true } }),
  prisma.product.findMany({ where: testProducts, select: { name: true } }),
  prisma.newsletterSubscriber.count({ where: testSubscribers }),
]);

const byUser = new Map<string, number>();
for (const o of orders) byUser.set(o.user.email, (byUser.get(o.user.email) ?? 0) + 1);

console.log(`Orders:           ${orders.length}`);
for (const [email, n] of byUser) console.log(`  ${email}: ${n}`);
console.log(`Customer accounts: ${users.length}${users.length ? ` (${users.slice(0, 5).map((u) => u.email).join(", ")}${users.length > 5 ? ", …" : ""})` : ""}`);
console.log(`Test products:    ${products.length}`);
console.log(`Test newsletter:  ${subscribers}`);
console.log(`Kept: catalog products, admin accounts, ${DEMO_CUSTOMER}`);

if (!apply) {
  console.log("\nPreview only — nothing was deleted. To delete, run:  npm run db:clean-test-data -- --yes");
} else {
  // Stock held by orders that were not cancelled goes back on the shelf.
  const restock = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "CANCELLED") continue;
    for (const it of o.items) restock.set(it.variantId, (restock.get(it.variantId) ?? 0) + it.quantity);
  }
  await prisma.$transaction([
    ...[...restock].map(([id, qty]) => prisma.productVariant.update({ where: { id }, data: { stock: { increment: qty } } })),
    prisma.order.deleteMany({}),
    prisma.user.deleteMany({ where: testUsers }),
    prisma.product.deleteMany({ where: testProducts }),
    prisma.newsletterSubscriber.deleteMany({ where: testSubscribers }),
  ]);
  console.log("\nDone. Test data deleted.");
}

await prisma.$disconnect();
