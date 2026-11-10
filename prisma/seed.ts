import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Deterministic PRNG so the seed is reproducible.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const brands = ["Nike", "Adidas", "New Balance", "Puma", "Converse", "Vans", "Asics", "Dr. Martens"];
const categories = ["Running", "Lifestyle", "Basketball", "Boots", "Skate", "Training"];

// Product photos hosted on a public image CDN (Unsplash). In production these
// are object keys in the shop's own bucket behind CDN_BASE_URL.
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const photos = [
  "photo-1542291026-7eec264c27ff",
  "photo-1549298916-b41d501d3772",
  "photo-1606107557195-0e29a4b5b4aa",
  "photo-1595950653106-6c9ebd614d3a",
  "photo-1600185365483-26d7a4cc7519",
  "photo-1608231387042-66d1773070a5",
  "photo-1560769629-975ec94e6a86",
  "photo-1525966222134-fcfa99b8ae77",
  "photo-1491553895911-0055eca6402d",
  "photo-1600269452121-4f2416e55c28",
].map(photo);

const products: Array<[name: string, brand: string, category: string, color: string, price: number]> = [
  ["Air Zoom Pegasus 41", "Nike", "Running", "Black", 13000],
  ["Air Max 90", "Nike", "Lifestyle", "White", 13500],
  ["Dunk Low Retro", "Nike", "Skate", "Grey", 11500],
  ["LeBron Witness 8", "Nike", "Basketball", "Red", 11000],
  ["Metcon 9", "Nike", "Training", "Blue", 15000],
  ["Ultraboost Light", "Adidas", "Running", "Black", 19000],
  ["Samba OG", "Adidas", "Lifestyle", "White", 10000],
  ["Gazelle Indoor", "Adidas", "Lifestyle", "Blue", 12000],
  ["Dame 9", "Adidas", "Basketball", "Green", 12000],
  ["Terrex Swift R3", "Adidas", "Boots", "Brown", 16000],
  ["Fresh Foam X 1080v14", "New Balance", "Running", "Grey", 16500],
  ["550", "New Balance", "Lifestyle", "White", 11000],
  ["990v6 Made in USA", "New Balance", "Lifestyle", "Grey", 20000],
  ["Minimus TR", "New Balance", "Training", "Black", 11500],
  ["Velocity Nitro 3", "Puma", "Running", "Red", 14000],
  ["Suede Classic", "Puma", "Lifestyle", "Black", 7500],
  ["MB.03", "Puma", "Basketball", "Pink", 12500],
  ["Chuck Taylor All Star High", "Converse", "Lifestyle", "Black", 6500],
  ["Chuck 70 Low", "Converse", "Lifestyle", "White", 8500],
  ["Run Star Hike", "Converse", "Lifestyle", "White", 11000],
  ["Old Skool", "Vans", "Skate", "Black", 7000],
  ["Sk8-Hi", "Vans", "Skate", "Black", 8000],
  ["Authentic", "Vans", "Skate", "Red", 6000],
  ["Gel-Kayano 31", "Asics", "Running", "Blue", 16000],
  ["Gel-Nimbus 26", "Asics", "Running", "White", 16000],
  ["GT-2000 13", "Asics", "Running", "Grey", 14000],
  ["Gel-1130", "Asics", "Lifestyle", "White", 11000],
  ["1460 Smooth Leather Boot", "Dr. Martens", "Boots", "Black", 17000],
  ["2976 Chelsea Boot", "Dr. Martens", "Boots", "Brown", 17000],
  ["Jadon Platform Boot", "Dr. Martens", "Boots", "Black", 21000],
];

const sizes = [38, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 45, 46];

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
    const b = await prisma.brand.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });
    brandIds.set(name, b.id);
  }
  const categoryIds = new Map<string, string>();
  for (const name of categories) {
    const c = await prisma.category.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });
    categoryIds.set(name, c.id);
  }

  let created = 0;
  for (const [i, [name, brand, category, color, priceCents]] of products.entries()) {
    const fullName = `${brand} ${name}`;
    const slug = slugify(fullName);
    if (await prisma.product.findUnique({ where: { slug } })) continue;

    const productSizes = sizes.filter(() => rand() > 0.15);
    await prisma.product.create({
      data: {
        slug,
        name: fullName,
        description: `The ${fullName} combines everyday comfort with ${category.toLowerCase()}-ready performance. ` +
          `Premium materials, a cushioned midsole and a durable rubber outsole make it a pair you will reach for again and again.`,
        brandId: brandIds.get(brand)!,
        categoryId: categoryIds.get(category)!,
        color,
        priceCents,
        images: [photos[i % photos.length]!, photos[(i + 3) % photos.length]!],
        // Stagger createdAt so "newest" sorting is meaningful.
        createdAt: new Date(Date.now() - i * 86_400_000),
        variants: {
          create: productSizes.map((size) => {
            const r = rand();
            return { size, stock: r < 0.15 ? 0 : r < 0.3 ? 1 + Math.floor(rand() * 3) : 5 + Math.floor(rand() * 20) };
          }),
        },
      },
    });
    created++;
  }
  console.log(`Seed complete: ${created} new products, ${brands.length} brands, ${categories.length} categories.`);
  console.log(`Admin: admin@shoeshop.test / ${adminPassword}`);
  console.log(`Customer: customer@shoeshop.test / ${customerPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
