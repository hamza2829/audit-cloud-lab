// Bundles functions/src plus ../shared into functions/lib/index.js.
// firebase-admin and firebase-functions stay external and resolve from node_modules.
import { build } from 'esbuild';

await build({
  entryPoints: ['functions/src/index.ts'],
  outfile: 'functions/lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  external: ['firebase-admin', 'firebase-admin/*', 'firebase-functions', 'firebase-functions/*'],
  logLevel: 'info',
});
