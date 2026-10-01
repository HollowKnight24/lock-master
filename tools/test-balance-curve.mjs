import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../assets/scripts/core/GameConfig.ts', import.meta.url), 'utf8');
const levelPattern = /levelId:\s*(\d+),\s*initialTime:\s*(\d+),\s*targetScore:\s*(\d+),\s*baseSpeed:\s*(\d+),\s*blueChance:\s*([\d.]+)/g;
const levels = [...source.matchAll(levelPattern)].map((match) => ({
    id: Number(match[1]),
    time: Number(match[2]),
    target: Number(match[3]),
    speed: Number(match[4]),
    blueChance: Number(match[5]),
}));

const expected = [
    { id: 1, time: 25, target: 7, speed: 150, blueChance: 0.10 },
    { id: 2, time: 20, target: 15, speed: 130, blueChance: 0.12 },
    { id: 3, time: 45, target: 15, speed: 270, blueChance: 0.13 },
    { id: 4, time: 50, target: 17, speed: 310, blueChance: 0.14 },
    { id: 5, time: 40, target: 20, speed: 175, blueChance: 0.15 },
];
assert.deepEqual(levels, expected, '五关正式数值基线发生了未评审的变化');

const tracks = [
    { label: '直线', length: 470, closed: false, zoneFraction: 120 / 470 },
    { label: '半圆', length: 180, closed: false, zoneFraction: 54 / 180 },
    { label: 'S 型', length: 2 * Math.PI * 112, closed: false, zoneFraction: 0.14 },
    { label: '菱形', length: 1200.865, closed: true, zoneFraction: 0.14 },
    { label: '圆环', length: 360, closed: true, zoneFraction: 0.15 },
];

const metrics = levels.map((level, index) => {
    const track = tracks[index];
    const traversal = track.length * (track.closed ? 1 : 2) / level.speed;
    const initialWindow = track.length * track.zoneFraction / level.speed;
    return {
        level: level.id,
        track: track.label,
        requiredHitsPerSecond: level.target / level.time,
        traversalSeconds: traversal,
        initialWindowSeconds: initialWindow,
    };
});

assert.ok(levels.every((level, index) => index === 0 || level.target >= levels[index - 1].target),
    '普通模式目标分不得在后续关卡下降');
assert.ok(levels[2].speed >= 260 && levels[3].speed >= 300,
    'S 型与菱形长路径速度过低，高亮生命周期内会频繁不可达');
assert.ok(levels[3].time >= levels[2].time + 2 && metrics[3].traversalSeconds < metrics[2].traversalSeconds,
    '菱形关时间与速度没有共同补偿最长路径');
assert.ok(metrics[4].initialWindowSeconds >= 0.30 && metrics[4].initialWindowSeconds <= 0.32,
    '第五关基础命中窗口偏离约 0.31 秒的终局目标');
assert.ok(levels.every((level, index) => index === 0 || level.blueChance >= levels[index - 1].blueChance),
    '蓝区概率不应在后续关卡突然下降');
assert.match(source, /initialTime:\s*60[\s\S]*baseSpeed:\s*220/,
    '挑战模式必须保持 60 秒和 220 基础速度');

console.table(metrics.map((metric) => ({
    关卡: metric.level,
    轨道: metric.track,
    '最低得分节奏/秒': metric.requiredHitsPerSecond.toFixed(3),
    '完整往返或一圈/秒': metric.traversalSeconds.toFixed(2),
    '初始命中窗口/秒': metric.initialWindowSeconds.toFixed(2),
})));
console.log('PASS: five-level time, score, speed, reachability, and difficulty curve are locked.');
