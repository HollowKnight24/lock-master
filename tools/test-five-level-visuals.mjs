import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const pathTrack = read('assets/scripts/core/PathTrack.ts');
const visualTheme = read('assets/scripts/ui/VisualTheme.ts');
const scene = read('assets/scene.scene');
const sceneData = JSON.parse(scene);

function numericConstant(name) {
    const match = pathTrack.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+(?:\\.\\d+)?)`));
    if (!match) throw new Error(`缺少视觉常量 ${name}`);
    return Number(match[1]);
}

const sStroke = numericConstant('S_ZONE_STROKE');
const diamondStroke = numericConstant('DIAMOND_ZONE_STROKE');
const diamondOffset = numericConstant('DIAMOND_ZONE_OUTWARD_OFFSET');
const sNeedle = numericConstant('S_NEEDLE_HALF_LENGTH');
const diamondNeedle = numericConstant('DIAMOND_NEEDLE_HALF_LENGTH');

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(sStroke === 52 && sNeedle === 28, '第三关 S 型轨道视觉规格发生未验收变更');
expect(diamondStroke === 60 && diamondNeedle === 46, '第四关菱形轨道视觉规格发生未验收变更');
expect(diamondOffset === 22, '第四关高亮外移量发生未验收变更');

// Relative to the pointer centre line, the highlight reaches only 8 px inward
// and 52 px outward. These budgets keep both edges inside the authored groove.
expect(diamondStroke / 2 - diamondOffset <= 8, '第四关高亮内缘可能覆盖中央实心区域');
expect(diamondStroke / 2 + diamondOffset <= 52, '第四关高亮外缘可能越过轨道外边缘');
expect(pathTrack.includes('const p=this.zoneAt(t)') && pathTrack.includes('DIAMOND_ZONE_OUTWARD_OFFSET'),
    '第四关高亮没有使用独立外移轨迹');
expect(pathTrack.includes('const p=this.at(this.progress)'), '第四关指针不应跟随高亮外移');

for (const name of ['TrackVertical', 'TrackHalfCircle', 'TrackS', 'TrackDiamond', 'TrackFullCircle']) {
    expect(scene.includes(`"_name": "${name}"`), `场景缺少 ${name}`);
}
const previewComponent = sceneData.find((item) => item && Array.isArray(item.tracks)
    && Object.prototype.hasOwnProperty.call(item, 'debugStartLevel'));
expect(!!previewComponent, '场景缺少 ScenePreview 组件');
expect(previewComponent?.tracks?.length === 5
    && previewComponent.tracks.every((reference) => reference && Number.isInteger(reference.__id__)),
    'ScenePreview 的五关轨道必须全部保存为有效节点引用');
expect(scene.includes('"debugStartLevel": 0') && scene.includes('"previewPage": 0'),
    '发布场景必须保持首页启动');

expect(visualTheme.includes("'characters/mascot_' + (win ? 'win' : 'lose')"),
    '结算没有按结果切换胜利/失败角色素材');
expect(visualTheme.includes('Tween.stopAllByTarget(n)') && visualTheme.includes('tween(n)'),
    '结算角色动画没有重置或播放');
expect(visualTheme.includes('this.playResultBurst(root, win)'), '结算缺少成功/失败反馈特效');

if (failures.length) {
    console.error('FAIL: ' + failures.join('；'));
    process.exit(1);
}

console.log('PASS: five track visuals, diamond groove clearances, release startup, and result mascot animation are guarded.');
