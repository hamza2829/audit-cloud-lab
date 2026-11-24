// Prints median category scores from reports/lighthouse/manifest.json.
import { readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('reports/lighthouse/manifest.json', 'utf8'));
const runs = manifest.map((m) => m.summary);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const keys = Object.keys(runs[0]);
const summary = Object.fromEntries(keys.map((k) => [k, Math.round(median(runs.map((r) => r[k])) * 100)]));
writeFileSync('reports/lighthouse-summary.json', JSON.stringify({ runs: runs.length, medianScores: summary }, null, 2));
console.log(`Lighthouse median over ${runs.length} runs:`, summary);
