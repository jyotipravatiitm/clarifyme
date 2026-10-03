export interface Token {
  word: string;
  lower: string;
  start: number;
  end: number;
}

export interface Sentence {
  text: string;
  start: number;
  end: number;
}

const WORD_RE = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

export function tokenize(text: string, offset = 0): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const start = offset + (m.index ?? 0);
    out.push({ word: m[0], lower: m[0].toLowerCase(), start, end: start + m[0].length });
  }
  return out;
}

/** Splits on . ! ? or newlines. Keeps offsets into the original text. */
export function sentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[^.!?\n]+[.!?]*/g;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const start = (m.index ?? 0) + lead;
    out.push({ text: trimmed, start, end: start + trimmed.length });
  }
  return out;
}

/** Finds whole-word/phrase matches, case-insensitive. */
export function findPhrases(text: string, phrases: readonly string[]): { phrase: string; start: number; end: number }[] {
  const hits: { phrase: string; start: number; end: number }[] = [];
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const re = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "gi");
    for (const m of text.matchAll(re)) {
      hits.push({ phrase, start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

/** Very small stemmer, good enough for word-list lookups. */
export function stems(word: string): string[] {
  const w = word.toLowerCase().replace(/[’']s$/, "");
  const out = new Set([w]);
  const rules: [RegExp, string][] = [
    [/ies$/, "y"],
    [/ied$/, "y"],
    [/ier$/, "y"],
    [/iest$/, "y"],
    [/ily$/, "y"],
    [/es$/, ""],
    [/s$/, ""],
    [/ed$/, ""],
    [/ed$/, "e"],
    [/d$/, ""],
    [/ing$/, ""],
    [/ing$/, "e"],
    [/er$/, ""],
    [/er$/, "e"],
    [/est$/, ""],
    [/ly$/, ""],
    [/n't$/, ""],
  ];
  for (const [re, rep] of rules) {
    if (re.test(w)) {
      const s = w.replace(re, rep);
      out.add(s);
      // doubled consonant: stopped -> stopp -> stop
      if (/([b-df-hj-np-tv-z])\1$/.test(s)) out.add(s.slice(0, -1));
    }
  }
  return [...out];
}
