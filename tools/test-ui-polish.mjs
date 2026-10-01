import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript');
const calls = [];
const uiEvents = [];
const decorator = (...args) => args.length > 1 ? undefined : () => undefined;
let enabled = true;
let loaded;
class UIOpacity {}
const cc = {
    _decorator: { ccclass: () => value => value, property: decorator },
    Component: class {}, UIOpacity, Vec3: class {},
    Tween: { stopAllByTarget: target => calls.push(['stop', target]) },
    tween: target => ({ to() { return this; }, start() { calls.push(['start', target]); } }),
    isValid: () => true,
    resources: { load: (_path, _type, callback) => { loaded = callback; } },
};
function load(file) {
    const module = { exports: {} };
    const output = ts.transpileModule(fs.readFileSync(new URL('../assets/scripts/' + file, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, experimentalDecorators: true },
    }).outputText;
    vm.runInNewContext(output, { exports: module.exports, require: id => {
        if (id === 'cc') return cc;
        if (id.endsWith('PlayerData')) return { PlayerData: { isAudioEnabled: () => enabled } };
        if (id.endsWith('EventManager')) return { EventManager: { emit: event => uiEvents.push(event) }, GameEvents: { UI_CLICK: 'UI_CLICK' } };
        if (id.endsWith('ControlLayout')) return { usesTouchControls: () => false };
        if (id.endsWith('ArtAssets') || id.includes('/core/')) return {};
        throw Error(id);
    }, console });
    return module.exports;
}
const { presentPanel } = load('ui/UITransition.ts');
const opacity = new UIOpacity();
const panel = { getComponent: () => opacity, setScale() {} };
presentPanel(panel);
presentPanel(panel);
assert.deepEqual(calls.map(call => call[0]), ['stop', 'stop', 'start', 'start', 'stop', 'stop', 'start', 'start']);
assert.equal(opacity.opacity, 0);
const { AudioManager } = load('utils/AudioManager.ts');
const audio = new AudioManager();
let plays = 0;
audio.enabledInHierarchy = true;
audio.sfxSource = { playOneShot: (_clip, volume) => { assert.equal(volume, 0.4); plays++; } };
const pending = audio.playSFX('audio/ui_click');
enabled = false;
loaded(null, {});
await pending;
assert.equal(plays, 0, 'muting during an async load must suppress playback');
enabled = true;
await audio.playSFX('audio/ui_click');
assert.equal(plays, 1, 'unmuted cached SFX still plays');
const { ProductionButton } = load('ui/ProductionButton.ts');
const speedButton = new ProductionButton();
speedButton.node = { name: 'SpeedUpBtn', getComponent: () => ({ interactable: true }) };
speedButton.onTouchEnd();
assert.equal(uiEvents.length, 0, 'speed-up release must not emit click audio');
speedButton.node.name = 'UnlockBtn';
speedButton.onTouchEnd();
assert.deepEqual(uiEvents, ['UI_CLICK'], 'other buttons retain click audio');
console.log('PASS: panel transitions cancel prior tweens; pending SFX respects mute; cached SFX resumes.');
