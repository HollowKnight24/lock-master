import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve(process.argv[2] ?? 'build/web-mobile');
const indexPath = resolve(outputDir, 'index.html');
const marker = 'LOCK_MASTER_WEB_TRIAL_CONFIG';
let source = readFileSync(indexPath, 'utf8');

if (!source.includes(marker)) {
  const bootstrap = `<script>\n/* ${marker}: simulated ads, never use for production */\n` +
    `globalThis.__LOCK_MASTER_PLATFORM_CONFIG__ = Object.assign({}, globalThis.__LOCK_MASTER_PLATFORM_CONFIG__ || {}, { browserMockAds: true, browserMockPlatform: true });\n</script>\n`;
  source = source.replace(/<script>\r?\n\s*System\.import/, bootstrap + '<script>\n    System.import');
}
source = source.replace(/<title>.*?<\/title>/, '<title>Lock Master | Web Trial</title>');
writeFileSync(indexPath, source, 'utf8');

const headersPath = resolve(outputDir, '_headers');
const headers = `# Cloudflare Pages cache rules for the versioned Cocos build\n` +
  `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n` +
  `/cocos-js/*\n  Cache-Control: public, max-age=31536000, immutable\n\n` +
  `/src/*\n  Cache-Control: public, max-age=31536000, immutable\n\n` +
  `/index.html\n  Cache-Control: public, max-age=0, must-revalidate\n`;
writeFileSync(headersPath, headers, 'utf8');
console.log('[web-trial] simulated ad flow enabled (no real ad requests or revenue)');
console.log('[web-trial] Cloudflare cache headers generated');
