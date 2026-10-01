import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const marker = path.join(root, 'temp', 'crazygames-build-start.txt');
const output = path.join(root, 'build', 'crazygames', 'index.html');

if (process.argv.includes('--start')) {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, String(Date.now()), 'utf8');
    process.exit(0);
}

const startedAt = Number(fs.readFileSync(marker, 'utf8'));
const builtAt = fs.statSync(output).mtimeMs;
if (!Number.isFinite(startedAt) || builtAt < startedAt) {
    throw new Error('Cocos Creator did not produce a fresh CrazyGames build.');
}
console.log('[crazygames] fresh Cocos build confirmed');
