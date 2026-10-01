import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve(process.argv[2] ?? 'build/crazygames');
const indexPath = resolve(outputDir, 'index.html');
const marker = 'LOCK_MASTER_CRAZYGAMES_V3';
let source = readFileSync(indexPath, 'utf8');

if (!source.includes(marker)) {
  const bootstrap = `<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n` +
    `<script>\n/* ${marker} */\n` +
    `var lockMasterSdk = globalThis.CrazyGames && globalThis.CrazyGames.SDK;\n` +
    `globalThis.__LOCK_MASTER_CRAZYGAMES_READY__ = lockMasterSdk && typeof lockMasterSdk.init === 'function'\n` +
    `  ? Promise.resolve().then(function () { return lockMasterSdk.init(); }).then(function () {\n` +
    `      lockMasterSdk.game.loadingStart();\n` +
    `      return true;\n` +
    `    }).catch(function (error) {\n` +
    `      console.warn('[Lock Master] CrazyGames SDK unavailable; platform features disabled.', error);\n` +
    `      return false;\n` +
    `    })\n` +
    `  : Promise.resolve(false);\n</script>\n`;
  source = source.replace(/<script>\r?\n\s*System\.import/, bootstrap + '<script>\n    System.import');
}

source = source.replace(/<title>.*?<\/title>/, '<title>Lock Master</title>');
writeFileSync(indexPath, source, 'utf8');
console.log('[crazygames] SDK v3 bootstrap and English title injected');
