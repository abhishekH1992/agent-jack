export type BannerCopy = {
  header: string;
  subheader: string;
};

export function parseBannerCopy(
  content: string | null | undefined,
): BannerCopy {
  if (!content?.trim()) return { header: "", subheader: "" };
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        header: String(parsed.header ?? parsed.title ?? "").trim(),
        subheader: String(parsed.subheader ?? parsed.subtitle ?? "").trim(),
      };
    }
  } catch {
    // ignore non-JSON (e.g. leftover HTML)
  }
  return { header: "", subheader: "" };
}

export function serializeBannerCopy(copy: BannerCopy): string {
  return JSON.stringify({
    header: (copy.header || "").trim(),
    subheader: (copy.subheader || "").trim(),
  });
}
