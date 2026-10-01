import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'lock-master-sdk-'));

try {
    writeFileSync(join(temporary, 'index.html'),
        '<title>Original</title>\n<script>\n    System.import("./index.js");\n</script>\n');
    const injection = spawnSync(process.execPath,
        [join(root, 'tools/inject-crazygames-config.mjs'), temporary], { encoding: 'utf8' });
    assert.equal(injection.status, 0, injection.stderr || injection.stdout);

    const html = readFileSync(join(temporary, 'index.html'), 'utf8');
    assert.match(html, /<title>Lock Master<\/title>/);
    assert.match(html, /__LOCK_MASTER_CRAZYGAMES_READY__\.then\(function \(ready\)/,
        'Cocos startup must wait for the Data module to initialize');
    assert.match(html, /__LOCK_MASTER_CRAZYGAMES_READY_RESULT__ = ready/);
    const script = html.match(/\/\* LOCK_MASTER_CRAZYGAMES_V3 \*\/([\s\S]*?)<\/script>/)?.[1];
    assert.ok(script, 'CrazyGames bootstrap was not injected');

    const run = async (sdk) => {
        const warnings = [];
        const context = { Promise, CrazyGames: sdk ? { SDK: sdk } : undefined,
            console: { warn: (...args) => warnings.push(args) } };
        context.globalThis = context;
        vm.runInNewContext(script, context);
        return { ready: await context.__LOCK_MASTER_CRAZYGAMES_READY__, warnings };
    };

    assert.equal((await run(null)).ready, false, 'missing SDK must not crash startup');

    let initialized = 0;
    let loadingStarted = 0;
    const successful = await run({
        init: async () => { initialized++; },
        game: { loadingStart: () => { loadingStarted++; } },
    });
    assert.equal(successful.ready, true);
    assert.equal(initialized, 1);
    assert.equal(loadingStarted, 1);

    const failed = await run({ init: async () => { throw new Error('offline'); } });
    assert.equal(failed.ready, false, 'rejected SDK init must downgrade safely');
    assert.equal(failed.warnings.length, 1);

    console.log('PASS: CrazyGames SDK missing, ready, and rejected startup paths are safe.');
} finally {
    const tempRoot = resolve(tmpdir()) + sep;
    if (!resolve(temporary).startsWith(tempRoot) || !basename(temporary).startsWith('lock-master-sdk-')) {
        throw new Error('Unexpected temporary test directory; refusing cleanup');
    }
    rmSync(temporary, { recursive: true, force: true });
}
