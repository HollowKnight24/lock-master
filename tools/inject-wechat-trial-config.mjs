import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve(process.argv[2] ?? 'build/wechatgame-trial');
const entryPath = resolve(outputDir, 'game.js');
const marker = 'LOCK_MASTER_WECHAT_TRIAL_CONFIG';
const source = readFileSync(entryPath, 'utf8');

if (!source.includes(marker)) {
  const bootstrap = `/* ${marker}: simulated ads, never use for production */\n` +
    `globalThis.__LOCK_MASTER_PLATFORM_CONFIG__ = Object.assign({}, globalThis.__LOCK_MASTER_PLATFORM_CONFIG__ || {}, { experienceMockAds: true });\n`;
  writeFileSync(entryPath, bootstrap + source, 'utf8');
}

console.log('[wechat-trial] simulated ad flow enabled (no real ad requests or revenue)');
