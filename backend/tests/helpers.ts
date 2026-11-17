import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { bySize } from "../src/modules/products/product.serializer.js";

export const app = createApp();
export const api = () => request(app);

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "OrderItem", "Order", "CartItem", "Review", "WishlistItem", "ProductVariant", "Product", "Brand", "Category", "User" RESTART IDENTITY CASCADE`,
  );
}

let counter = 0;
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function createUser(opts: { role?: "ADMIN" | "CUSTOMER"; password?: string; email?: string } = {}) {
  const password = opts.password ?? "Password123!";
  const user = await prisma.user.create({
    data: {
      email: opts.email ?? `user-${uid()}@test.dev`,
      name: "Test User",
      role: opts.role ?? "CUSTOMER",
      // Low cost keeps tests fast; production uses cost 12.
      passwordHash: await bcrypt.hash(password, 4),
    },
  });
  return { user, password };
}

export async function login(email: string, password: string) {
  const res = await api().post("/api/v1/auth/login").send({ email, password });
  return res.body.token as string;
}

export async function createCustomer() {
  const { user, password } = await createUser();
  return { user, token: await login(user.email, password) };
}

export async function createAdmin() {
  const { user, password } = await createUser({ role: "ADMIN" });
  return { user, token: await login(user.email, password) };
}

export async function createProduct(opts: {
  name?: string;
  brand?: string;
  category?: string;
  color?: string;
  priceCents?: number;
  isActive?: boolean;
  gender?: "MEN" | "WOMEN" | "UNISEX";
  colorway?: string;
  styleGroup?: string;
  variants?: Array<{ size: number | string; stock: number }>;
} = {}) {
  const brandName = opts.brand ?? "Acme";
  const categoryName = opts.category ?? "Running";
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const brand = await prisma.brand.upsert({ where: { slug: slug(brandName) }, update: {}, create: { name: brandName, slug: slug(brandName) } });
  const category = await prisma.category.upsert({
    where: { slug: slug(categoryName) },
    update: {},
    create: { name: categoryName, slug: slug(categoryName) },
  });
  const name = opts.name ?? `Shoe ${uid()}`;
  return prisma.product.create({
    data: {
      name,
      slug: `${slug(name)}-${uid()}`,
      description: "A test shoe",
      color: opts.color ?? "Black",
      priceCents: opts.priceCents ?? 10000,
      isActive: opts.isActive ?? true,
      gender: opts.gender ?? "UNISEX",
      colorway: opts.colorway,
      styleGroup: opts.styleGroup,
      images: ["products/test.jpg"],
      brandId: brand.id,
      categoryId: category.id,
      variants: { create: (opts.variants ?? [{ size: 42, stock: 10 }]).map((v) => ({ size: String(v.size), stock: v.stock })) },
    },
    include: { variants: true },
  }).then((p) => ({ ...p, variants: bySize(p.variants) }));
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
