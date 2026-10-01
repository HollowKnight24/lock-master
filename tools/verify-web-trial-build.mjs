import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outputDir = resolve(process.argv[2] ?? 'build/web-mobile');
const required = ['index.html', '_headers'];
for (const file of required) if (!existsSync(join(outputDir, file))) throw new Error(`[web-trial] missing ${file}`);
const html = readFileSync(join(outputDir, 'index.html'), 'utf8');
if (!html.includes('LOCK_MASTER_WEB_TRIAL_CONFIG')
    || !html.includes('browserMockAds: true')
    || !html.includes('browserMockPlatform: true')) {
  throw new Error('[web-trial] simulated ad configuration was not injected');
}
function filesUnder(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(root, entry.name);
    return entry.isDirectory() ? filesUnder(absolute) : [absolute];
  });
}
const files = filesUnder(outputDir);
for (const stem of ['index', 'application']) {
  if (!files.some((file) => new RegExp(`[/\\\\]${stem}(?:\\.[a-f0-9]+)?\\.js$`).test(file))) {
    throw new Error(`[web-trial] missing versioned ${stem}.js`);
  }
}
if (!files.some((file) => /[/\\]style(?:\.[a-f0-9]+)?\.css$/.test(file))) {
  throw new Error('[web-trial] missing versioned style.css');
}
const total = files.reduce((sum, file) => sum + statSync(file).size, 0);
console.log('[web-trial] PASS');
console.log(`  files: ${files.length}`);
console.log(`  total: ${(total / 1024 / 1024).toFixed(2)} MiB`);
console.log('  ads: simulated browser flow enabled (no requests or revenue)');
