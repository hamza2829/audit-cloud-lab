// Lighthouse CI against the production build served by vite preview.
// Audits the public sign-in page (the other routes need an authenticated session).
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: '4173',
      url: ['http://127.0.0.1:4173/login'],
      numberOfRuns: 3,
      settings: { chromeFlags: '--headless=new --no-sandbox --disable-dev-shm-usage' },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: { target: 'filesystem', outputDir: 'reports/lighthouse' },
  },
};
