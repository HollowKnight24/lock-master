import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript');
function fixture(file, className) {
    let finish;
    const sprite = { color: null, fillRange: 0 };
    const cc = {
        _decorator: { ccclass: () => value => value }, Component: class {},
        Color: { BLUE: 'blue', YELLOW: 'yellow' }, v3: (...args) => args,
        tween: () => ({ to() { return this; }, call(fn) { finish = fn; return this; }, start() {}, stop() {} }),
    };
    const exports = {};
    const random = Object.create(Math);
    random.random = () => 0; // Force every eligible roll blue to exercise the cooldown.
    const output = ts.transpileModule(fs.readFileSync(new URL('../assets/scripts/core/' + file, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, experimentalDecorators: true },
    }).outputText;
    vm.runInNewContext(output, { exports, Math: random, require: id => id === 'cc' ? cc : { HighlightType: { NONE: 0, YELLOW: 1, BLUE: 2 } } });
    const zone = new exports[className]();
    zone.node = { active: true, getComponent: () => sprite, setPosition() {}, setScale() {}, setRotationFromEuler() {} };
    return { zone, expire: () => finish() };
}
for (const [file, className, halfCircle] of [
    ['level1/ZoneLinear.ts', 'ZoneLinear', null],
    ['level2_3/ZoneRotation.ts', 'ZoneRotation', true],
    ['level2_3/ZoneRotation.ts', 'ZoneRotation', false],
]) {
    const f = fixture(file, className);
    const spawn = () => halfCircle === null
        ? f.zone.spawnNewZone(0.15, spawn)
        : f.zone.spawnNewZone(0.15, halfCircle, spawn, true);
    spawn();
    assert.equal(f.zone.currentType, 2);
    f.expire();
    assert.equal(f.zone.currentType, 1, 'Expired, unhit blue must refresh yellow');
    f.expire();
    assert.equal(f.zone.currentType, 2);
    f.zone.clearZone(); // Same clear-and-spawn path used after a successful hit.
    spawn();
    assert.equal(f.zone.currentType, 1, 'Hit blue must also refresh yellow');
}
const challenge = fixture('level2_3/ZoneRotation.ts', 'ZoneRotation');
const spawnChallenge = () => challenge.zone.spawnNewZone(0.15, false, spawnChallenge, true);
spawnChallenge();
challenge.expire();
assert.equal(challenge.zone.currentType, 1, 'Challenge expired blue must refresh yellow');
challenge.expire();
assert.equal(challenge.zone.currentType, 2);
challenge.zone.clearZone();
spawnChallenge();
assert.equal(challenge.zone.currentType, 1, 'Challenge hit blue must refresh yellow');
console.log('PASS: normal and challenge tracks refresh yellow after expired/hit blue.');
