import "server-only";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { firebaseAdmin } from "@/server/auth/admin";

/**
 * Product image storage — a Google Cloud Storage bucket (`GCS_BUCKET_MEDIA`)
 * in the same GCP project as Firebase. Objects are written world-readable and
 * served straight from `storage.googleapis.com` with a 1-year immutable cache.
 *
 * A dedicated GCS bucket (rather than the Firebase Storage default bucket) so
 * this works whether or not Firebase Storage has been "Get started"-ed in the
 * console — the Admin SDK service account has full Storage access regardless.
 */

const BUCKET = process.env.GCS_BUCKET_MEDIA || "amaashop-80cfd-media";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadProductImage(
  file: File,
): Promise<{ url: string; path: string }> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Unsupported image type — use JPEG, PNG, WebP, AVIF or GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is larger than 5 MB.");
  }

  const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const day = new Date().toISOString().slice(0, 10);
  const path = `products/${day}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const bucket = getStorage(firebaseAdmin()).bucket(BUCKET);
  await bucket.file(path).save(buffer, {
    resumable: false,
    contentType: file.type,
    predefinedAcl: "publicRead",
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });

  return { url: `https://storage.googleapis.com/${BUCKET}/${path}`, path };
}
