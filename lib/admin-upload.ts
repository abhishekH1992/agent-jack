export async function uploadAdminFiles(
  files: FileList | File[],
  folder: "banners" | "images" = "images",
) {
  const form = new FormData();
  form.append("folder", folder);
  Array.from(files).forEach((file) => form.append("files", file));

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "x-clerk-role": "admin" },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Upload failed");
  }
  return json.urls as string[];
}
