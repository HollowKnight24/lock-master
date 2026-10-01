import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const outputDir = resolve(process.argv[2] ?? 'build/wechatgame-trial');
const mib = 1024 * 1024;

function fail(message) {
  console.error(`[wechat-trial] FAIL: ${message}`);
  process.exitCode = 1;
}

function filesUnder(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) result.push(...filesUnder(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

if (!existsSync(outputDir)) {
  fail(`build directory does not exist: ${outputDir}`);
  process.exit();
}

const required = ['game.js', 'game.json', 'project.config.json', 'application.js'];
for (const file of required) {
  if (!existsSync(join(outputDir, file))) fail(`missing ${file}`);
}
if (process.exitCode) process.exit();

const gameConfig = JSON.parse(readFileSync(join(outputDir, 'game.json'), 'utf8'));
const projectConfig = JSON.parse(readFileSync(join(outputDir, 'project.config.json'), 'utf8'));
const gameEntry = readFileSync(join(outputDir, 'game.js'), 'utf8');
const files = filesUnder(outputDir);
const subpackagePrefix = `subpackages${sep}`;
const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
const subpackageBytes = files
  .filter((file) => relative(outputDir, file).startsWith(subpackagePrefix))
  .reduce((sum, file) => sum + statSync(file).size, 0);
const mainBytes = totalBytes - subpackageBytes;

if (projectConfig.compileType !== 'game') fail('project.config.json compileType is not game');
if (!/^wx[0-9a-z]+$/i.test(projectConfig.appid ?? '')) fail('a real WeChat Mini Game AppID is not configured');
if (!gameConfig.plugins?.cocos) fail('Cocos WeChat engine plugin is not enabled');
if (!gameEntry.includes('LOCK_MASTER_WECHAT_TRIAL_CONFIG') || !gameEntry.includes('experienceMockAds: true')) {
  fail('trial-only simulated ad configuration was not injected');
}
if (!gameConfig.subpackages?.some((item) => item.name === 'resources')) {
  fail('resources Asset Bundle is not declared as a WeChat subpackage');
}
if (mainBytes > 4 * mib) fail(`main package is ${(mainBytes / mib).toFixed(2)} MiB (limit: 4 MiB)`);
if (totalBytes > 30 * mib) fail(`total package is ${(totalBytes / mib).toFixed(2)} MiB (limit: 30 MiB)`);

if (!process.exitCode) {
  console.log('[wechat-trial] PASS');
  console.log(`  files: ${files.length}`);
  console.log(`  main: ${(mainBytes / mib).toFixed(2)} MiB / 4 MiB`);
  console.log(`  subpackages: ${(subpackageBytes / mib).toFixed(2)} MiB`);
  console.log(`  total: ${(totalBytes / mib).toFixed(2)} MiB / 30 MiB`);
  console.log(`  engine plugin: Cocos ${gameConfig.plugins.cocos.version}`);
  console.log('  ads: simulated trial flow enabled (no requests or revenue)');
  console.log('  AppID: configured (value intentionally hidden)');
}
