import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { brands, catalog, categories, descriptions, sizeRuns } from "./catalog.js";
import { commonsImages } from "./catalog-images.js";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, options: "-c TimeZone=UTC" }) });

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Deterministic PRNG so stock levels are reproducible.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const genderLabel = { MEN: "Men's", WOMEN: "Women's", UNISEX: "Unisex" } as const;

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
    const name = `${item.brand} ${item.model}`;
    const slug = slugify(`${name} ${item.colorway} ${item.gender === "UNISEX" ? "" : item.gender}`);
    const images = item.images.map((n) => commonsImages[n]!);
    const data = {
      name,
      description: descriptions[item.group] ?? `${genderLabel[item.gender]} ${item.model}.`,
      brandId: brandIds.get(item.brand)!,
      categoryId: categoryIds.get(item.category)!,
      color: item.color,
      colorway: item.colorway,
      gender: item.gender,
      styleGroup: item.group,
      priceCents: item.price,
      images: images.map((im) => im.url),
      imageCredit: `Photo${images.length > 1 ? "s" : ""}: ${images.map((im) => im.credit).join("; ")} — via Wikimedia Commons`,
      imageSourceUrl: images[0]!.source,
      isActive: true,
    };

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      // Refresh catalog content but never touch live stock levels.
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
      continue;
    }
    await prisma.product.create({
      data: {
        ...data,
        slug,
        // Stagger createdAt so "newest" sorting is meaningful.
        createdAt: new Date(Date.now() - i * 86_400_000),
        variants: {
          create: sizeRuns[item.gender]
            .filter(() => rand() > 0.12)
            .map((size) => {
              const r = rand();
              return { size, stock: r < 0.12 ? 0 : r < 0.27 ? 1 + Math.floor(rand() * 3) : 5 + Math.floor(rand() * 20) };
            }),
        },
      },
    });
    created++;
  }

  const keep = new Set(catalog.map((c) => slugify(`${c.brand} ${c.model} ${c.colorway} ${c.gender === "UNISEX" ? "" : c.gender}`)));
  const retired = await prisma.product.updateMany({ where: { slug: { notIn: [...keep] }, isActive: true, styleGroup: null }, data: { isActive: false } });

  console.log(`Seed complete: ${created} created, ${updated} refreshed, ${retired.count} legacy products hidden.`);
  console.log(`Admin: admin@shoeshop.test / ${adminPassword}`);
  console.log(`Customer: customer@shoeshop.test / ${customerPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
