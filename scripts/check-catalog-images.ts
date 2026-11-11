/** Verifies every demo-catalog image is on the Wikimedia thumbnail CDN and loads: `npx tsx scripts/check-catalog-images.ts` */
import { catalog } from "../prisma/catalog.js";
import { commonsImages } from "../prisma/catalog-images.js";

const used = [...new Set(catalog.flatMap((c) => c.images))];
let bad = 0;
for (const i of used) {
  const img = commonsImages[i];
  if (!img) {
    console.log(`#${i}: missing`);
    bad++;
    continue;
  }
  const res = await fetch(img.url, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } });
  const okHost = img.url.startsWith("https://thumb.wikimedia.org/");
  if (!res.ok || !okHost) {
    console.log(`#${i}: ${res.status} ${okHost ? "" : "(original upload, rate-limited host)"} ${img.url}`);
    bad++;
  }
}
console.log(`${catalog.length} products, ${used.length} images, ${bad} problems`);
