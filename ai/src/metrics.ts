/** Clustering quality metrics against gold labels. */
export function purity(pred: number[], gold: string[]): number {
  const byCluster = new Map<number, Map<string, number>>();
  pred.forEach((p, i) => {
    const m = byCluster.get(p) ?? new Map<string, number>();
    m.set(gold[i]!, (m.get(gold[i]!) ?? 0) + 1);
    byCluster.set(p, m);
  });
  let correct = 0;
  for (const m of byCluster.values()) correct += Math.max(...m.values());
  return pred.length === 0 ? 0 : correct / pred.length;
}

export function pairwise(pred: number[], gold: string[]): { precision: number; recall: number; f1: number } {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (let i = 0; i < pred.length; i++) {
    for (let j = i + 1; j < pred.length; j++) {
      const samePred = pred[i] === pred[j];
      const sameGold = gold[i] === gold[j];
      if (samePred && sameGold) tp++;
      else if (samePred) fp++;
      else if (sameGold) fn++;
    }
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

const comb2 = (n: number) => (n * (n - 1)) / 2;

/** Adjusted Rand Index (Hubert and Arabie). */
export function adjustedRandIndex(pred: number[], gold: string[]): number {
  const table = new Map<string, number>();
  const a = new Map<number, number>();
  const b = new Map<string, number>();
  pred.forEach((p, i) => {
    const g = gold[i]!;
    table.set(`${p}|${g}`, (table.get(`${p}|${g}`) ?? 0) + 1);
    a.set(p, (a.get(p) ?? 0) + 1);
    b.set(g, (b.get(g) ?? 0) + 1);
  });
  const index = [...table.values()].reduce((s, n) => s + comb2(n), 0);
  const sumA = [...a.values()].reduce((s, n) => s + comb2(n), 0);
  const sumB = [...b.values()].reduce((s, n) => s + comb2(n), 0);
  const expected = (sumA * sumB) / comb2(pred.length);
  const max = (sumA + sumB) / 2;
  return max === expected ? 1 : (index - expected) / (max - expected);
}
