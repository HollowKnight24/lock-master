import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript');
const exports = {};
const source = fs.readFileSync(new URL('../assets/scripts/core/level1/PointerLinear.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, experimentalDecorators: true,
} }).outputText, { exports, require: () => ({
    _decorator: { ccclass: () => value => value },
    Component: class { unschedule() {} }, v3: (x, y, z) => ({ x, y, z }),
}) });
const pointer = new exports.PointerLinear();
pointer.node = { position: { x: 0, y: 0, z: 0 }, setPosition(value) { this.position = value; } };
pointer.initSpeed(150);
assert.equal(pointer.getCurrentY(), -235);
assert.equal(pointer.moveSpeed, 150);
for (const multiplier of [1, 2.2]) {
    pointer.setSpeedMultiplier(multiplier);
    for (let frame = 0; frame < 2000; frame++) {
        pointer.update(frame % 30 === 0 ? 0.2 : 1 / 60);
        assert.ok(pointer.getCurrentY() >= -235 && pointer.getCurrentY() <= 235);
    }
}
pointer.update(10);
assert.ok(Math.abs(pointer.getCurrentY()) <= 235);
pointer.initSpeed(150);
assert.equal(pointer.getCurrentY(), -235, 'Restart resets inside the slot');
for (const file of ['scene.scene', 'prefabs/TrackVertical.prefab']) {
    const nodes = JSON.parse(fs.readFileSync(new URL('../assets/' + file, import.meta.url)));
    assert.equal(nodes.find(node => node._name === 'Pointer_Linear')._lpos.y, -235);
}
console.log('PASS: linear pointer stays in bounds at normal/accelerated speed and resets inside slot.');
