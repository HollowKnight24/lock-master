import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const checks = [
    ['release readiness', ['tools/check-release-readiness.mjs']],
    ['presentation feedback', ['tools/test-presentation-feedback.mjs']],
    ['UI interaction boundaries', ['tools/test-ui-polish.mjs']],
    ['platform integration', ['tools/test-platform-integration.mjs']],
    ['CrazyGames SDK bootstrap', ['tools/test-crazygames-bootstrap.mjs']],
    ['advertising policy', ['tools/test-ad-policy.mjs']],
    ['gameplay flow', ['tools/test-gameplay-flow.mjs']],
    ['balance curve', ['tools/test-balance-curve.mjs']],
    ['target pass-rate tuning', ['tools/tune-target-pass-rates.mjs']],
    ['five-level visuals', ['tools/test-five-level-visuals.mjs']],
    ['zone refresh', ['tools/test-zone-refresh.mjs']],
    ['linear pointer bounds', ['tools/test-linear-bounds.mjs']],
    ['editor scene', ['tools/verify-editor-scene.mjs']],
    ['scene preview', ['tools/test-scene-preview.mjs']],
    ['formal art', ['tools/verify-formal-art.mjs', '--cocos']],
];

for (const [name, args] of checks) {
    console.log('');
    console.log('=== ' + name + ' ===');
    const result = spawnSync(process.execPath, args, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
    });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    if (result.status !== 0) {
        console.error('FAILED: ' + name);
        process.exit(result.status || 1);
    }
}

const creatorTsc = path.join(
    'C:',
    'ProgramData',
    'cocos',
    'editors',
    'Creator',
    '3.8.8',
    'resources',
    'app.asar.unpacked',
    'node_modules',
    'typescript',
    'lib',
    'tsc.js',
);

console.log('');
console.log('=== TypeScript ===');
const typeCheck = spawnSync(process.execPath, [creatorTsc, '-p', 'tsconfig.json', '--noEmit', '--skipLibCheck'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
});
process.stdout.write(typeCheck.stdout || '');
process.stderr.write(typeCheck.stderr || '');
if (typeCheck.status !== 0) {
    console.error('FAILED: TypeScript');
    process.exit(typeCheck.status || 1);
}

console.log('');
console.log('PASS: release-candidate automated validation completed.');
