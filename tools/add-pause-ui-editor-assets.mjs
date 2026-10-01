import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const scenePath = path.join(root, 'assets/scene.scene');
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8').replace(/^\uFEFF/, ''));
const ref = __id__ => ({ __id__ });
const clone = value => structuredClone(value);
const compress = uuid => {
    const hex = uuid.replace(/-/g, '');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = hex.slice(0, 5);
    for (let i = 5; i < 32; i += 3) {
        const value = Number.parseInt(hex.slice(i, i + 3), 16);
        output += alphabet[value >> 6] + alphabet[value & 63];
    }
    return output;
};
const uid = () => compress(crypto.randomUUID());
const scriptId = name => compress(JSON.parse(fs.readFileSync(path.join(root, `assets/scripts/${name}.ts.meta`), 'utf8')).uuid);
const named = name => scene.findIndex(item => item.__type__ === 'cc.Node' && item._name === name);
const component = (nodeIndex, type) => scene[nodeIndex]._components
    .map(item => scene[item.__id__])
    .find(item => item.__type__ === type);

if (named('PauseUI') >= 0 || named('PauseBtn') >= 0) {
    console.log('Pause hierarchy already exists; no changes made.');
    process.exit(0);
}

function remap(value, map) {
    if (!value || typeof value !== 'object') return;
    if (Object.hasOwn(value, '__id__')) {
        if (map.has(value.__id__)) value.__id__ = map.get(value.__id__);
        return;
    }
    if (Array.isArray(value)) value.forEach(item => remap(item, map));
    else Object.values(value).forEach(item => remap(item, map));
}

function cloneBranch(sourceIndex, parentIndex) {
    const map = new Map();
    const collect = index => {
        if (map.has(index)) return;
        const source = scene[index];
        map.set(index, scene.push(clone(source)) - 1);
        for (const child of source._children || []) collect(child.__id__);
        for (const componentRef of source._components || []) {
            const componentIndex = componentRef.__id__;
            if (!map.has(componentIndex)) map.set(componentIndex, scene.push(clone(scene[componentIndex])) - 1);
            for (const eventRef of scene[componentIndex].clickEvents || []) {
                if (!map.has(eventRef.__id__)) map.set(eventRef.__id__, scene.push(clone(scene[eventRef.__id__])) - 1);
            }
        }
    };
    collect(sourceIndex);
    for (const clonedIndex of map.values()) {
        const item = scene[clonedIndex];
        remap(item, map);
        if (Object.hasOwn(item, '_id')) item._id = uid();
        if (Object.hasOwn(item, '_prefab')) item._prefab = null;
        if (Object.hasOwn(item, '__prefab')) item.__prefab = null;
    }
    const result = map.get(sourceIndex);
    scene[result]._parent = ref(parentIndex);
    scene[parentIndex]._children.push(ref(result));
    return result;
}

function setSize(nodeIndex, width, height) {
    const transform = component(nodeIndex, 'cc.UITransform');
    if (transform) Object.assign(transform._contentSize, { width, height });
}
function setPosition(nodeIndex, x, y) {
    Object.assign(scene[nodeIndex]._lpos, { x, y, z: 0 });
}
function directChild(parentIndex, name) {
    const child = scene[parentIndex]._children.find(item => scene[item.__id__]._name === name);
    return child?.__id__ ?? -1;
}
function setButtonHandler(buttonIndex, targetIndex, handler) {
    const button = component(buttonIndex, 'cc.Button');
    if (!button) throw new Error(`Node ${scene[buttonIndex]._name} has no Button component`);
    if (!button.clickEvents?.length) {
        const eventIndex = scene.push({ __type__: 'cc.ClickEvent' }) - 1;
        button.clickEvents = [ref(eventIndex)];
    }
    const event = scene[button.clickEvents[0].__id__];
    Object.assign(event, {
        target: ref(targetIndex),
        component: '',
        _componentId: scriptId('ui/GamePlayUI'),
        handler,
        customEventData: '',
    });
}
function setButtonLabel(buttonIndex, value) {
    const labelNode = directChild(buttonIndex, 'Label');
    const label = labelNode >= 0 ? component(labelNode, 'cc.Label') : null;
    if (label) label._string = value;
}

const uiRoot = named('UIRoot');
const gameplay = named('GamePlayUI');
const gameOver = named('GameOverUI');
const speedButton = named('SpeedUpBtn');
if ([uiRoot, gameplay, gameOver, speedButton].some(index => index < 0)) throw new Error('Expected authored scene nodes are missing');

// Compact pause button in the gameplay hierarchy.
const pauseButton = cloneBranch(speedButton, gameplay);
scene[pauseButton]._name = 'PauseBtn';
scene[pauseButton]._active = false;
setPosition(pauseButton, 0, -760);
setSize(pauseButton, 210, 82);
const pauseArt = directChild(pauseButton, '__ButtonArt');
const pauseIcon = directChild(pauseButton, '__ButtonIcon');
const pauseLabel = directChild(pauseButton, 'Label');
if (pauseArt >= 0) setSize(pauseArt, 210, 82);
if (pauseIcon >= 0) scene[pauseIcon]._active = false;
if (pauseLabel >= 0) { setPosition(pauseLabel, 0, 0); setSize(pauseLabel, 180, 70); }
setButtonLabel(pauseButton, '暂停');
setButtonHandler(pauseButton, gameplay, 'onPauseBtnClick');

// Pause modal reuses the production result panel and button artwork, but is
// a separate authored sibling so it is visible and editable in Hierarchy.
const pauseRoot = clone(scene[gameOver]);
pauseRoot._name = 'PauseUI';
pauseRoot._active = false;
pauseRoot._parent = ref(uiRoot);
pauseRoot._children = [];
pauseRoot._components = [];
pauseRoot._id = uid();
pauseRoot._prefab = null;
const pauseRootIndex = scene.push(pauseRoot) - 1;
scene[uiRoot]._children.push(ref(pauseRootIndex));
for (const componentRef of scene[gameOver]._components) {
    const source = scene[componentRef.__id__];
    if (!['cc.UITransform', 'cc.Widget'].includes(source.__type__)) continue;
    const copied = clone(source);
    copied.node = ref(pauseRootIndex);
    copied._id = uid();
    copied.__prefab = null;
    const copiedIndex = scene.push(copied) - 1;
    scene[pauseRootIndex]._components.push(ref(copiedIndex));
}
const blockInputIndex = scene.push({
    __type__: 'cc.BlockInputEvents', _name: '', _objFlags: 0, __editorExtras__: {},
    node: ref(pauseRootIndex), _enabled: true, __prefab: null, _id: uid(),
}) - 1;
scene[pauseRootIndex]._components.push(ref(blockInputIndex));

for (const name of ['__ModalShade', '__Panel']) {
    const source = directChild(gameOver, name);
    if (source >= 0) cloneBranch(source, pauseRootIndex);
}
const title = cloneBranch(directChild(gameOver, 'ResultTitle'), pauseRootIndex);
scene[title]._name = 'PauseTitle';
setPosition(title, 0, 260);
const titleLabel = component(title, 'cc.Label');
if (titleLabel) titleLabel._string = '游戏已暂停';

const continueButton = cloneBranch(directChild(gameOver, 'RestartBtn'), pauseRootIndex);
scene[continueButton]._name = 'ContinueBtn';
setPosition(continueButton, 0, 40);
setButtonLabel(continueButton, 'RESUME');
setButtonHandler(continueButton, gameplay, 'onResumeBtnClick');

const homeButton = cloneBranch(directChild(gameOver, 'HomeBtn'), pauseRootIndex);
scene[homeButton]._name = 'PauseHomeBtn';
setPosition(homeButton, 0, -110);
setButtonLabel(homeButton, 'EXIT TO HOME');
setButtonHandler(homeButton, gameplay, 'onPauseHomeClick');

fs.writeFileSync(scenePath, `${JSON.stringify(scene, null, 2)}\n`);
console.log('Added PauseBtn and PauseUI to assets/scene.scene.');
