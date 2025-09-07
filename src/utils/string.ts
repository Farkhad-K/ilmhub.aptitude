// src\utils\string.ts
export const toBase64 = (plain: string) =>
  typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(plain))) : Buffer.from(plain, 'utf-8').toString('base64');

export const fromBase64 = (b64: string) =>
  typeof window !== "undefined" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString('utf-8');

export function slugify(phrase: string) {
  if (!phrase) return '';
  let str = phrase.toLowerCase();
  str = str.replace(/[^a-z0-9\s-]/g, '');
  str = str.replace(/\s+/g, ' ').trim();
  str = str.replace(/\s/g, '-');
  return str.replace(/^-+|-+$/g, '');
}

export function toCapitalCase(text?: string) {
  if (!text) return '';
  const result = text.replace(/\b(\w)/g, (m) => m.toUpperCase());
  return result.replace(/\b(of|in|by|and|'st)\b/gi, (m) => m.toLowerCase());
}
