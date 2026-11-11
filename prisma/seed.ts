import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { brands, catalog, categories, productName, productSlug, sizeRuns, slugify } from "./catalog.js";
import { catalogImages } from "./catalog-images.js";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, options: "-c TimeZone=UTC" }) });

// Deterministic PRNG so stock levels are reproducible.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "Customer123!";

  await prisma.user.upsert({
    where: { email: "admin@shoeshop.test" },
    update: {},
    create: { email: "admin@shoeshop.test", name: "Shop Admin", role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 12) },
  });
  await prisma.user.upsert({
    where: { email: "customer@shoeshop.test" },
    update: {},
    create: { email: "customer@shoeshop.test", name: "Casey Customer", passwordHash: await bcrypt.hash(customerPassword, 12) },
  });

  const brandIds = new Map<string, string>();
  for (const name of brands) {
    const b = await prisma.brand.upsert({ where: { slug: slugify(name) }, update: { name }, create: { name, slug: slugify(name) } });
    brandIds.set(name, b.id);
  }
  const categoryIds = new Map<string, string>();
  for (const name of categories) {
    const c = await prisma.category.upsert({ where: { slug: slugify(name) }, update: { name }, create: { name, slug: slugify(name) } });
    categoryIds.set(name, c.id);
  }

  let created = 0;
  let updated = 0;
  for (const [i, item] of catalog.entries()) {
    const slug = productSlug(item);
    const images = item.images.map((key) => {
      const img = catalogImages[key];
      if (!img) throw new Error(`Unknown image "${key}" for ${slug}`);
      return img;
    });
    const credits = [...new Set(images.map((im) => im.credit))];
    const data = {
      name: productName(item),
      description: item.description,
      brandId: brandIds.get(item.brand)!,
      categoryId: categoryIds.get(item.category)!,
      color: item.color,
      colorway: item.colorway,
      gender: item.gender,
      styleGroup: item.group,
      priceCents: item.price,
      images: images.map((im) => im.url),
      imageCredit: `Photo${images.length > 1 ? "s" : ""}: ${credits.join(" · ")}`,
      imageSourceUrl: images.find((im) => im.source)?.source ?? null,
      isActive: true,
    };

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      // Refresh catalog content but never touch live stock levels.
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
      continue;
    }
    const run = sizeRuns[item.sizes];
    await prisma.product.create({
      data: {
        ...data,
        slug,
        // Stagger createdAt so "newest" sorting is meaningful.
        createdAt: new Date(Date.now() - i * 86_400_000),
        variants: {
          create: run
            // Keep every size of short runs (e.g. One Size); drop a few from long ones.
            .filter(() => run.length <= 3 || rand() > 0.1)
            .map((size) => {
              const r = rand();
              return { size, stock: r < 0.1 ? 0 : r < 0.25 ? 1 + Math.floor(rand() * 3) : 5 + Math.floor(rand() * 25) };
            }),
        },
      },
    });
    created++;
  }

  // Anything not in the current catalog is hidden from the shop (never hard-deleted: orders may reference it).
  const keep = catalog.map(productSlug);
  const retired = await prisma.product.updateMany({ where: { slug: { notIn: keep }, isActive: true }, data: { isActive: false } });

  console.log(`Seed complete: ${created} created, ${updated} refreshed, ${retired.count} products no longer in the catalog hidden.`);
  console.log(`Admin: admin@shoeshop.test / ${adminPassword}`);
  console.log(`Customer: customer@shoeshop.test / ${customerPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
