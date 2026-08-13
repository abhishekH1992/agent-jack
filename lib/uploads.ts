import path from "path";

export const UPLOAD_FOLDERS = [
  "banners",
  "images",
  "category",
  "subcategory",
  "menu",
] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export function uploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

export function uploadDir(folder: string) {
  return path.join(uploadRoot(), folder);
}

export function publicUploadPath(folder: string, filename: string) {
  return `/uploads/${folder}/${filename}`;
}
