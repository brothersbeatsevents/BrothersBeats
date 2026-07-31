// ──────────────────────────────────────────
// esbuild config — bundles Lambda handler into a single JS file
// ──────────────────────────────────────────

const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['src/lambda.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/lambda.js',
    format: 'cjs',
    sourcemap: true,
    minify: false,
    external: [],
  })
  .then(() => {
    console.log('✅ Lambda bundle built → dist/lambda.js');
  })
  .catch((err) => {
    console.error('❌ Build failed:', err);
    process.exit(1);
  });
