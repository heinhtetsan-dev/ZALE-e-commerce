/** Verifies every demo-catalog image exists and loads: `npx tsx scripts/check-catalog-images.ts` */
import { existsSync } from "node:fs";
import { catalog } from "../prisma/catalog.js";
import { catalogImages } from "../prisma/catalog-images.js";

const used = [...new Set(catalog.flatMap((c) => c.images))];
let bad = 0;
for (const key of used) {
  const img = catalogImages[key];
  if (!img) {
    console.log(`${key}: missing`);
    bad++;
    continue;
  }
  if (img.url.startsWith("/")) {
    // Served by the storefront from frontend/public.
    if (!existsSync(new URL(`../../frontend/public${img.url}`, import.meta.url))) {
      console.log(`${key}: file not found in frontend/public${img.url}`);
      bad++;
    }
    continue;
  }
  const res = await fetch(img.url, { method: "HEAD" });
  if (!res.ok) {
    console.log(`${key}: ${res.status} ${img.url}`);
    bad++;
  }
}
console.log(`${catalog.length} products, ${used.length} images, ${bad} problems`);
