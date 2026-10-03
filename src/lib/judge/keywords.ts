/**
 * Offline matching helpers. A keyword matches at a word start, so "expir"
 * matches "expires" and "expiry". Keywords with symbols ("%", "10%") match as substrings.
 */
export function hasKeyword(text: string, keyword: string): boolean {
  const t = text.toLowerCase();
  const k = keyword.toLowerCase();
  if (!/^[a-z0-9' -]+$/.test(k)) return t.includes(k);
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![a-z0-9])${escaped}`).test(t);
}

/** True when every group has at least one keyword in the text. */
export function matchesAllGroups(text: string, groups: string[][]): boolean {
  return groups.every((g) => g.some((k) => hasKeyword(text, k)));
}

export function missingGroups(text: string, groups: string[][]): string[][] {
  return groups.filter((g) => !g.some((k) => hasKeyword(text, k)));
}
