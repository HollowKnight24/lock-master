import { profiles, simulateLevel, tracks } from './simulate-balance-rounds.mjs';
import assert from 'node:assert/strict';

const targetRates = [.95, .90, .85, .80, .75];
const current = [
    [25, 6, 150, .10], [26, 9, 135, .12], [36, 10, 240, .13],
    [42, 11, 280, .14], [40, 16, 175, .15],
];
const coarse = [
    [25, 7, 150, .10], [16, 11, 135, .12], [36, 11, 260, .13],
    [40, 12, 290, .14], [40, 20, 185, .15],
];
const refined = [
    [25, 7, 150, .10], [19, 13, 130, .12], [44, 14, 270, .13],
    [46, 15, 310, .14], [39, 19, 175, .15],
];
const requested = [
    [25, 7, 150, .10], [20, 15, 130, .12], [45, 15, 270, .13],
    [50, 17, 310, .14], [40, 20, 175, .15],
];

function evaluate(tuple, index, attempts, salt = 0) {
    return simulateLevel(tuple, tracks[index], profiles.熟练, 24017 + index * 997 + salt, attempts);
}
function printRound(title, tuples, attempts, salt, showReferenceTarget = true) {
    console.log(`\n=== ${title} ===`);
    return tuples.map((tuple, index) => {
        const result = evaluate(tuple, index, attempts, salt);
        const reference = showReferenceTarget ? `目标 ${(targetRates[index] * 100).toFixed(0)}%，` : '';
        console.log(`L${index + 1} ${tuple[0]}秒/${tuple[1]}分/${tuple[2]}速 -> ${(result.passRate * 100).toFixed(1)}%（${reference}胜局余 ${result.remainingOnWin.toFixed(1)} 秒）`);
        return result;
    });
}

printRound('第3轮：当前配置基线', current, 20000, 0);
printRound('第4轮：粗调候选', coarse, 24000, 202);
printRound('第5轮：精调候选', refined, 120000, 404);
const finalResults = printRound('第6轮：用户定稿数值', requested, 120000, 3983, false);

finalResults.forEach((result, index) => {
    if (index > 0) assert.ok(result.passRate < finalResults[index - 1].passRate,
        '最终预测通过率必须逐关下降');
});
assert.deepEqual(requested.map(level => level.slice(0, 3)),
    [[25, 7, 150], [20, 15, 130], [45, 15, 270], [50, 17, 310], [40, 20, 175]],
    '用户定稿的时间、目标分或速度基线发生变化');

console.log('\nFINAL=' + JSON.stringify(requested));
console.log('PASS: user-approved final values keep predicted pass rates strictly descending.');
