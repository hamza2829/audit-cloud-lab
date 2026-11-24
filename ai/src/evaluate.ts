import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTfidf } from './tfidf';
import { clusterVectors } from './cluster';
import { adjustedRandIndex, pairwise, purity } from './metrics';

const here = dirname(fileURLToPath(import.meta.url));
const evalDir = join(here, '..', 'eval');

export interface EvalRow {
  threshold: number;
  clusters: number;
  purity: number;
  precision: number;
  recall: number;
  f1: number;
  ari: number;
}

export function evaluate(items: { text: string; rootCause: string }[], thresholds: number[]): EvalRow[] {
  const vectors = buildTfidf(items.map((i) => i.text)).vectors;
  const gold = items.map((i) => i.rootCause);
  return thresholds.map((threshold) => {
    const pred = clusterVectors(vectors, threshold);
    const pw = pairwise(pred, gold);
    return {
      threshold,
      clusters: new Set(pred).size,
      purity: purity(pred, gold),
      ...pw,
      ari: adjustedRandIndex(pred, gold),
    };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { items } = JSON.parse(readFileSync(join(evalDir, 'labeled-findings.json'), 'utf8'));
  const thresholds = [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.16, 0.2];
  const rows = evaluate(items, thresholds);
  // Held-out check: tune the threshold on even rows, report on odd rows.
  const tuneSet = items.filter((_: unknown, i: number) => i % 2 === 0);
  const testSet = items.filter((_: unknown, i: number) => i % 2 === 1);
  const tuned = evaluate(tuneSet, thresholds).sort((a, b) => b.ari - a.ari)[0]!;
  const heldOut = evaluate(testSet, [tuned.threshold])[0]!;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const md = [
    '# Root cause clustering evaluation',
    '',
    `Dataset: ${items.length} labeled synthetic findings, ${new Set(items.map((i: { rootCause: string }) => i.rootCause)).size} gold root causes.`,
    '',
    '| threshold | clusters | purity | pair precision | pair recall | pair F1 | ARI |',
    '|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.threshold} | ${r.clusters} | ${r3(r.purity)} | ${r3(r.precision)} | ${r3(r.recall)} | ${r3(r.f1)} | ${r3(r.ari)} |`),
    '',
    `Held-out check: threshold tuned on ${tuneSet.length} even rows (best ${tuned.threshold}, ARI ${r3(tuned.ari)}), applied to ${testSet.length} odd rows: purity ${r3(heldOut.purity)}, pair F1 ${r3(heldOut.f1)}, ARI ${r3(heldOut.ari)}.`,
    '',
    'Features: word tokens plus character 4-grams, sublinear TF, smoothed IDF, L2 norm. Clustering: average-linkage agglomerative on cosine similarity.',
    '',
  ].join('\n');
  mkdirSync(evalDir, { recursive: true });
  writeFileSync(join(evalDir, 'report.md'), md);
  const round = (r: EvalRow) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, r3(v)]));
  writeFileSync(join(evalDir, 'report.json'), JSON.stringify({ sweep: rows.map(round), heldOut: { tunedThreshold: tuned.threshold, ...round(heldOut) } }, null, 2));
  console.log(md);
}
