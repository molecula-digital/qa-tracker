// src/lib/slugify.ts

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function slugifyWithSuffix(text: string): string {
  const base = slugify(text);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`.slice(0, 60);
}
