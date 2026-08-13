import { readFile, stat } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { uploadFileCandidates, UPLOAD_FOLDERS } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path || [];
  const [folder, ...rest] = segments;
  const filename = rest.join("/");
  if (
    !folder ||
    !filename ||
    !UPLOAD_FOLDERS.includes(folder as (typeof UPLOAD_FOLDERS)[number]) ||
    filename.includes("..")
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let filePath: string | null = null;
  for (const candidate of uploadFileCandidates(folder, filename)) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) {
        filePath = candidate;
        break;
      }
    } catch {
      // try next location
    }
  }
  if (!filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const buf = await readFile(filePath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
