import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { badRequest } from "../../lib/errors.js";
import { imageUrl } from "../products/product.serializer.js";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
type UploadType = (typeof UPLOAD_TYPES)[number];

/** Public path the API serves local uploads under (see app.ts). */
export const LOCAL_UPLOAD_ROUTE = "/api/v1/uploads";
export const uploadDir = () => path.resolve(env.UPLOAD_DIR);

const EXT: Record<UploadType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/**
 * Work out the real image type from the file's first bytes. The browser's
 * Content-Type is only a claim; an HTML or SVG file renamed to .jpg must
 * never be stored and served back from our origin.
 */
export function sniffImageType(buf: Buffer): UploadType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(buf.toString("ascii", 8, 12))) return "image/avif";
  return null;
}

/**
 * Store an admin's product photo. Uses S3-compatible storage when it is
 * configured, otherwise the API server's own disk (fine for one server;
 * use S3 when running several or on hosts with a throwaway disk).
 * Returns the reference to put in Product.images and a URL to preview it.
 */
export async function saveProductImage(body: unknown) {
  if (!Buffer.isBuffer(body) || body.length === 0) throw badRequest("Choose a JPEG, PNG, WebP or AVIF image");
  const type = sniffImageType(body);
  if (!type) throw badRequest("That file isn't a JPEG, PNG, WebP or AVIF image");

  const name = `${randomUUID()}.${EXT[type]}`;
  const month = new Date().toISOString().slice(0, 7);

  if (env.S3_BUCKET && env.S3_REGION) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } : undefined,
    });
    const key = `products/${month}/${name}`;
    await client.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: type, CacheControl: "public, max-age=31536000, immutable" }));
    return { key, url: imageUrl(key) };
  }

  const dir = path.join(uploadDir(), "products", month);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), body, { flag: "wx" });
  const key = `${LOCAL_UPLOAD_ROUTE}/products/${month}/${name}`;
  return { key, url: key };
}
