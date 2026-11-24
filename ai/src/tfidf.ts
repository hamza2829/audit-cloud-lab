const STOPWORDS = new Set(
  'a an and are as at be by for from has have in is it its no not of on or past the to used was were with while near new on current still'.split(' '),
);

/** Lowercase, strip punctuation and ids like "TW-12", light plural stemming. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[a-z]+-\d+/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}

/** Word tokens plus character 4-grams (helps with calibrated/calibration, label/labelled). */
export function features(text: string): string[] {
  const words = tokenize(text);
  const out = [...words];
  for (const w of words) {
    const padded = `_${w}_`;
    for (let i = 0; i + 4 <= padded.length; i++) out.push(`#${padded.slice(i, i + 4)}`);
  }
  return out;
}

export type SparseVector = Map<string, number>;

export interface TfidfModel {
  idf: Map<string, number>;
  vectors: SparseVector[];
}

export function buildTfidf(docs: string[]): TfidfModel {
  const tokenized = docs.map(features);
  const df = new Map<string, number>();
  for (const tokens of tokenized) for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = docs.length;
  const idf = new Map<string, number>();
  for (const [t, d] of df) idf.set(t, Math.log((1 + n) / (1 + d)) + 1); // smoothed idf
  const vectors = tokenized.map((tokens) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const v: SparseVector = new Map();
    let norm = 0;
    for (const [t, c] of tf) {
      const w = (1 + Math.log(c)) * idf.get(t)!; // sublinear tf
      v.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm);
    if (norm > 0) for (const [t, w] of v) v.set(t, w / norm);
    return v;
  });
  return { idf, vectors };
}

export function cosine(a: SparseVector, b: SparseVector): number {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, w] of small) {
    const o = large.get(t);
    if (o !== undefined) dot += w * o;
  }
  return dot;
}
