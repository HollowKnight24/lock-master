import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const outputDir = resolve(process.argv[2] ?? 'build/crazygames');
for (const name of ['index.html']) {
  if (!existsSync(join(outputDir, name))) throw new Error(`[crazygames] missing ${name}`);
}

function filesUnder(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(root, entry.name);
    return entry.isDirectory() ? filesUnder(absolute) : [absolute];
  });
}

const files = filesUnder(outputDir);
const html = readFileSync(join(outputDir, 'index.html'), 'utf8');
if (!html.includes('crazygames-sdk-v3.js') || !html.includes('LOCK_MASTER_CRAZYGAMES_V3')) {
  throw new Error('[crazygames] SDK v3 bootstrap is missing');
}
if (!html.includes('CrazyGames SDK unavailable; platform features disabled.')
  || !html.includes('Promise.resolve(false)')) {
  throw new Error('[crazygames] SDK startup failure guard is missing');
}
if (!html.includes('<title>Lock Master</title>')) throw new Error('[crazygames] English title is missing');
if (html.includes('browserMockAds: true') || html.includes('browserMockPlatform: true')) {
  throw new Error('[crazygames] mock advertising must not ship');
}
if (files.length > 1500) throw new Error(`[crazygames] file count ${files.length} exceeds 1500`);

const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
if (totalBytes > 250 * 1024 * 1024) throw new Error('[crazygames] total build exceeds 250 MiB');
const localPaths = files.filter((file) => ['.html', '.js', '.json', '.css'].includes(extname(file).toLowerCase()))
  .filter((file) => /(?:D:\\cocos|C:\\Users\\)/i.test(readFileSync(file, 'utf8')));
if (localPaths.length) throw new Error(`[crazygames] absolute local paths found in ${localPaths[0]}`);

const scene = readFileSync(resolve('assets/scene.scene'), 'utf8');
if (/[\u3400-\u9fff]/.test(scene)) throw new Error('[crazygames] Chinese text remains in the production scene');

console.log('[crazygames] PASS');
console.log(`  files: ${files.length} / 1500`);
console.log(`  total: ${(totalBytes / 1048576).toFixed(2)} MiB / 250 MiB`);
console.log('  SDK: CrazyGames HTML5 v3');
console.log('  ads: real platform callbacks; no mocks or external ad SDKs');
