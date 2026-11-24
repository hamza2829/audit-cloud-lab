// Checks gzip sizes of the production build against perf/budget.json.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const budget = JSON.parse(readFileSync('perf/budget.json', 'utf8'));
const dir = 'dist/assets';
const files = readdirSync(dir).map((name) => {
  const buf = readFileSync(join(dir, name));
  return { name, raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length };
});
const kib = (b) => Math.round((b / 1024) * 10) / 10;
const js = files.filter((f) => f.name.endsWith('.js'));
const css = files.filter((f) => f.name.endsWith('.css'));
const firebase = js.filter((f) => f.name.startsWith('firebase'));
const app = js.filter((f) => !f.name.startsWith('firebase'));
const sum = (list) => list.reduce((s, f) => s + f.gzip, 0);

const checks = [
  { name: 'total JS (gzip)', actual: kib(sum(js)), limit: budget.totalJsKiB },
  { name: 'firebase chunk (gzip)', actual: kib(sum(firebase)), limit: budget.firebaseChunkKiB },
  { name: 'app JS without firebase (gzip)', actual: kib(sum(app)), limit: budget.appJsKiB },
  { name: 'largest app chunk (gzip)', actual: kib(Math.max(0, ...app.map((f) => f.gzip))), limit: budget.largestAppChunkKiB },
  { name: 'CSS (gzip)', actual: kib(sum(css)), limit: budget.cssKiB },
].map((c) => ({ ...c, ok: c.actual <= c.limit }));

mkdirSync('reports', { recursive: true });
writeFileSync('reports/bundle-size.json', JSON.stringify({ files: files.map((f) => ({ ...f, rawKiB: kib(f.raw), gzipKiB: kib(f.gzip) })), checks }, null, 2));
const md = ['| check | actual KiB | budget KiB | result |', '|---|---|---|---|', ...checks.map((c) => `| ${c.name} | ${c.actual} | ${c.limit} | ${c.ok ? 'pass' : 'FAIL'} |`)].join('\n');
writeFileSync('reports/bundle-size.md', `${md}\n`);
console.log(md);
if (checks.some((c) => !c.ok)) {
  console.error('Bundle budget exceeded.');
  process.exit(1);
}
