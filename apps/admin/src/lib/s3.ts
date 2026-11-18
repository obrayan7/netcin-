import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

export const UPLOAD_FOLDERS = ["posters", "backdrops", "thumbs", "videos"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

/** URL présignée : le navigateur envoie le fichier directement au bucket (pas via notre serveur). */
export async function presignUpload(folder: UploadFolder, filename: string, contentType: string) {
  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key = `${folder}/${randomUUID()}.${ext}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 3600 },
  );
  const base = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
  return { uploadUrl, publicUrl: `${base}/${key}` };
}
