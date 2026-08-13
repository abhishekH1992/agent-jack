import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  publicUploadPath,
  uploadDir,
  UPLOAD_FOLDERS,
} from "@/lib/uploads";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extFor(type: string, fallbackName: string) {
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  const fromName = path.extname(fallbackName).toLowerCase();
  return fromName || ".jpg";
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-clerk-role");
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const folderRaw = String(form.get("folder") || "images");
  const folder = UPLOAD_FOLDERS.includes(folderRaw as (typeof UPLOAD_FOLDERS)[number])
    ? folderRaw
    : "images";

  const files = form
    .getAll("files")
    .filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f);

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const dir = uploadDir(folder);
  await mkdir(dir, { recursive: true });

  const urls: string[] = [];

  for (const file of files) {
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported type: ${file.type || file.name}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `${file.name} is larger than 8MB` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${extFor(file.type, file.name)}`;
    await writeFile(path.join(dir, filename), buffer);
    urls.push(publicUploadPath(folder, filename));
  }

  return NextResponse.json({ urls });
}
