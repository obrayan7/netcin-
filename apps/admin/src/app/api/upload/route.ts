import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { presignUpload, UPLOAD_FOLDERS, type UploadFolder } from "@/lib/s3";

export async function POST(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { folder, filename, contentType } = await req.json().catch(() => ({}));
  if (!UPLOAD_FOLDERS.includes(folder) || typeof filename !== "string" || typeof contentType !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const okType = folder === "videos" ? contentType.startsWith("video/") || contentType === "application/vnd.apple.mpegurl" : contentType.startsWith("image/");
  if (!okType) return NextResponse.json({ error: "type de fichier refusé" }, { status: 400 });

  return NextResponse.json(await presignUpload(folder as UploadFolder, filename, contentType));
}
