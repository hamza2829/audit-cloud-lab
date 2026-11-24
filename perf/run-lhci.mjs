// Runs Lighthouse CI with the Chromium that Playwright installed, unless CHROME_PATH is set.
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const env = { ...process.env, CHROME_PATH: process.env.CHROME_PATH || chromium.executablePath() };
const res = spawnSync('npx', ['lhci', 'autorun', '--config=perf/lighthouserc.cjs'], { stdio: 'inherit', env });
process.exit(res.status ?? 1);
