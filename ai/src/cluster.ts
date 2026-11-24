import { buildTfidf, cosine, type SparseVector } from './tfidf';

/**
 * Average-linkage agglomerative clustering on cosine similarity.
 * Merges the most similar pair of clusters until no pair exceeds `threshold`.
 * O(n^3) in the worst case, fine for a few hundred findings.
 */
export function clusterVectors(vectors: SparseVector[], threshold: number): number[] {
  const n = vectors.length;
  const sim: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : cosine(vectors[i]!, vectors[j]!))),
  );
  let clusters: number[][] = vectors.map((_, i) => [i]);
  const avg = (a: number[], b: number[]) => {
    let s = 0;
    for (const i of a) for (const j of b) s += sim[i]![j]!;
    return s / (a.length * b.length);
  };
  for (;;) {
    let best = -1;
    let bi = -1;
    let bj = -1;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const s = avg(clusters[i]!, clusters[j]!);
        if (s > best) {
          best = s;
          bi = i;
          bj = j;
        }
      }
    }
    if (bi < 0 || best < threshold) break;
    const merged = [...clusters[bi]!, ...clusters[bj]!];
    clusters = clusters.filter((_, k) => k !== bi && k !== bj);
    clusters.push(merged);
  }
  const labels = new Array<number>(n).fill(-1);
  clusters
    .sort((a, b) => b.length - a.length || Math.min(...a) - Math.min(...b))
    .forEach((members, c) => members.forEach((m) => (labels[m] = c)));
  return labels;
}

export function clusterTexts(texts: string[], threshold = 0.08): number[] {
  return clusterVectors(buildTfidf(texts).vectors, threshold);
}
