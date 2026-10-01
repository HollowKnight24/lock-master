import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd());

function collectFiles(folder) {
    const entries = fs.readdirSync(folder, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const target = path.join(folder, entry.name);
        return entry.isDirectory() ? collectFiles(target) : [target];
    });
}

function readText(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function pngTextureBytes(file) {
    const data = fs.readFileSync(file);
    if (data.length < 24 || data.toString('ascii', 1, 4) !== 'PNG') {
        return 0;
    }
    return data.readUInt32BE(16) * data.readUInt32BE(20) * 4;
}

const projectSettings = JSON.parse(readText('settings/v2/packages/project.json'));
const resolution = projectSettings.general?.designResolution;
assert(resolution?.width === 1080 && resolution?.height === 1920 && resolution?.fitHeight === true,
    'Project must keep the 1080x1920 portrait fitHeight design baseline.');

const safeAreaScript = readText('assets/scripts/ui/SafeAreaLayout.ts');
assert(safeAreaScript.includes('getSafeAreaRect') && safeAreaScript.includes('__MouseControlLegend') && safeAreaScript.includes('SoundBtn'),
    'Safe-area layout must protect the mouse and Esc guide and the home sound button.');

const audioManager = readText('assets/scripts/utils/AudioManager.ts');
assert(!/bgm|background music/i.test(audioManager), 'AudioManager must not retain background-music playback.');

const previewServer = readText('tools/serve-web-preview.mjs');
assert(previewServer.includes("const HOST = '127.0.0.1'") && previewServer.includes("process.argv[3] ?? 7457"),
    'The global-edition preview must default to http://127.0.0.1:7457/.');

const resources = collectFiles(path.join(root, 'assets/resources'));
const resourceBytes = resources.reduce((total, file) => total + fs.statSync(file).size, 0);
const textureBytes = resources
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .reduce((total, file) => total + pngTextureBytes(file), 0);
const bgmFiles = resources.filter((file) => /[\\/]audio[\\/](music[\\/]|bgm\.)/i.test(file));

assert(bgmFiles.length === 0, 'Resources must not include packaged background music.');
assert(resourceBytes < 24 * 1024 * 1024, 'Resource package exceeds the 24 MiB phase-four budget.');

const toMiB = (value) => (value / 1024 / 1024).toFixed(2);
console.log('PASS: portrait baseline, safe-area support, no-BGM policy, and resource budget verified.');
console.log('Resources: ' + resources.length + ' files, ' + toMiB(resourceBytes) + ' MiB on disk.');
console.log('Estimated uncompressed PNG texture memory: ' + toMiB(textureBytes) + ' MiB.');
