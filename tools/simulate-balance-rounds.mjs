// Deterministic playtest model for comparing balance revisions. It models
// perception delay, imperfect use of the accelerate button, timing error,
// shrinking two-second zones, miss recovery, blue time bonuses and level-5
// direction reversal. It is a tuning aid, not a replacement for device tests.

import { pathToFileURL } from 'node:url';

export const rounds = {
    '第一轮（当前基线）': [
        [25, 6, 150, .10], [28, 8, 130, .12], [34, 9, 210, .13],
        [40, 10, 240, .14], [38, 14, 205, .15],
    ],
    '第二轮（最终采用）': [
        [25, 6, 150, .10], [26, 9, 135, .12], [36, 10, 240, .13],
        [42, 11, 280, .14], [40, 16, 175, .15],
    ],
};

export const tracks = [
    { length: 470, open: true, zone: 120 / 470, minZone: .025 },
    { length: 180, open: true, zone: 54 / 180, minZone: .02 },
    { length: 2 * Math.PI * 112, open: true, zone: .14, minZone: .018 },
    { length: 1200.865, open: false, zone: .14, minZone: .018 },
    { length: 360, open: false, zone: .15, minZone: .02, reverse: true },
];

export const profiles = {
    新手: { perception: .22, timingSigma: .10, accelerateUse: .58, slip: .08, retry: .60 },
    熟练: { perception: .16, timingSigma: .075, accelerateUse: .68, slip: .055, retry: .72 },
    高手: { perception: .11, timingSigma: .045, accelerateUse: .82, slip: .025, retry: .85 },
};

function random(seed) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function gaussian(rng) {
    const u = Math.max(rng(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
function distanceToTarget(track, phase, direction, target) {
    if (!track.open) return direction > 0 ? (target - phase + 1) % 1 : (phase - target + 1) % 1;
    const cycle = 2;
    return Math.min((target - phase + cycle) % cycle, (2 - target - phase + cycle) % cycle);
}
export function simulateLevel(tuple, track, profile, seed, attempts = 12000) {
    const [limit, targetScore, speed, blueChance] = tuple;
    const rng = random(seed);
    let wins = 0, totalScore = 0, totalRemaining = 0, expired = 0, zones = 0;
    const complexity = track.reverse ? 1.24 : track.length > 1000 ? 1.15 : track.length > 600 ? 1.10 : 1;
    for (let run = 0; run < attempts; run++) {
        let time = 0, score = 0, previousBlue = false;
        let phase = rng() * (track.open ? 2 : 1), direction = 1;
        while (time < limit && score < targetScore) {
            zones++;
            const target = rng();
            const distance = distanceToTarget(track, phase, direction, target);
            const boost = 1 + 1.2 * profile.accelerateUse;
            const nearDistance = speed * .42 / track.length;
            const travel = Math.max(0, distance - nearDistance) * track.length / (speed * boost)
                + Math.min(distance, nearDistance) * track.length / speed;
            const arrival = profile.perception + travel;
            if (arrival >= 2) {
                expired++;
                time += 2;
                phase = (phase + 2 * speed * boost / track.length) % (track.open ? 2 : 1);
                continue;
            }
            const zoneFraction = Math.max(track.minZone, track.zone * (1 - arrival / 2));
            const halfWindowSeconds = zoneFraction * track.length / speed / 2;
            const error = Math.abs(gaussian(rng) * profile.timingSigma * complexity);
            let hit = error <= halfWindowSeconds && rng() > profile.slip * complexity;
            let spent = arrival + .14;
            if (!hit && spent + .55 < 2 && rng() < profile.retry) {
                const retryWidth = Math.max(track.minZone, track.zone * (1 - (spent + .55) / 2));
                const retryHalfWindow = retryWidth * track.length / speed / 2;
                hit = Math.abs(gaussian(rng) * profile.timingSigma * .75 * complexity) <= retryHalfWindow;
                spent += .55;
            }
            if (hit) {
                score++;
                phase = track.open ? (target <= 1 ? target : 2 - target) : target;
                if (track.reverse) direction *= -1;
                const blue = !previousBlue && rng() < blueChance;
                previousBlue = blue;
                time += spent - (blue ? 1.5 : 0);
            } else {
                time += 2;
                expired++;
                phase = (phase + 2 * speed * boost / track.length) % (track.open ? 2 : 1);
                previousBlue = false;
            }
        }
        totalScore += score;
        if (score >= targetScore) {
            wins++;
            totalRemaining += Math.max(0, limit - time);
        }
    }
    return {
        passRate: wins / attempts,
        averageScore: totalScore / attempts,
        remainingOnWin: wins ? totalRemaining / wins : 0,
        expiryRate: zones ? expired / zones : 0,
    };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    for (const [roundName, values] of Object.entries(rounds)) {
        console.log(`\n=== ${roundName} ===`);
        for (const [profileName, profile] of Object.entries(profiles)) {
            const results = values.map((value, index) => simulateLevel(value, tracks[index], profile, 9017 + index * 97));
            console.log(profileName, results.map((result, index) =>
                `L${index + 1} ${Math.round(result.passRate * 100)}% / 余${result.remainingOnWin.toFixed(1)}s / 过期${Math.round(result.expiryRate * 100)}%`
            ).join(' | '));
        }
    }
}
