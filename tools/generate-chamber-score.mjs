import fs from 'node:fs';
import path from 'node:path';

const project = path.resolve(import.meta.dirname, '..');
const musicDir = path.join(project, 'assets', 'resources', 'audio', 'music');
const previewDir = 'C:/Users/Edwen/Documents/Codex/2026-09-12/zhe/outputs/音乐试听_室内乐版';
fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const rate = 44100;
const duration = 36;
const tau = Math.PI * 2;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const clamp = (value) => Math.max(-1, Math.min(1, value));
const sine = (frequency, time) => Math.sin(tau * frequency * time);
const fade = (time) => Math.max(0, Math.min(1, time / 2.2, (duration - time) / 2.8));
const env = (time, hold, attack, release) => Math.max(0, Math.min(1, time / attack, (hold - time) / release));

function piano(midi, time, hold) {
    const f = hz(midi);
    const detuned = 0.68 * sine(f, time) + 0.16 * sine(f * 2.002, time) + 0.09 * sine(f * 3.01, time)
        + 0.04 * sine(f * 4.07, time);
    return detuned * env(time, hold, 0.004, Math.min(hold * 0.88, 2.6));
}
function cello(midi, time, hold) {
    const f = hz(midi);
    const vibrato = 1 + 0.006 * sine(5.2, time);
    const body = 0.73 * sine(f * vibrato, time) + 0.16 * sine(f * 2, time) + 0.11 * sine(f * 0.5, time);
    return body * env(time, hold, 0.38, Math.min(hold * 0.5, 1.8));
}
function pizzicato(midi, time, hold) {
    const f = hz(midi);
    return (0.62 * sine(f, time) + 0.25 * sine(f * 2, time) + 0.13 * sine(f * 3.2, time))
        * env(time, hold, 0.003, Math.min(hold * 0.98, 0.42));
}

// Absolute musical events avoid the grid-like loops used by the earlier drafts.
const homeMelody = [
    [1.0, 74, 1.45], [2.7, 77, 0.8], [3.8, 81, 1.25], [5.4, 79, 0.7],
    [6.35, 76, 1.8], [8.6, 72, 0.65], [9.5, 74, 1.25], [11.1, 77, 1.55],
    [13.1, 76, 0.8], [14.15, 72, 1.5], [16.1, 69, 1.0], [17.5, 72, 1.6],
    [20.0, 74, 1.2], [21.5, 77, 1.1], [23.0, 81, 2.3], [26.1, 79, 0.75],
    [27.1, 76, 1.8], [29.5, 74, 0.8], [30.6, 72, 2.4],
];
const homeBass = [
    [0.0, 50, 4.1], [4.0, 48, 4.1], [8.0, 45, 4.1], [12.0, 47, 4.1],
    [16.0, 50, 4.1], [20.0, 48, 4.1], [24.0, 45, 4.1], [28.0, 47, 4.8],
];
const gamePizz = [
    [0.4, 62], [1.05, 65], [1.6, 69], [2.25, 65], [2.85, 60], [3.45, 64],
    [4.1, 67], [4.7, 64], [5.3, 62], [5.85, 65], [6.45, 69], [7.0, 72],
];
const gameTheme = [
    [2.6, 74, 1.0], [3.9, 77, 0.85], [5.0, 81, 1.4], [6.8, 79, 0.7],
    [8.0, 76, 1.0], [10.0, 72, 1.3], [13.0, 76, 0.7], [14.0, 79, 1.0],
    [15.4, 83, 1.45], [17.2, 81, 0.65], [18.4, 77, 1.2],
];
function eventValue(events, time, instrument, gain, pan) {
    let value = 0;
    for (const [start, key, hold = 0.42] of events) {
        const local = time - start;
        if (local >= 0 && local <= hold) value += instrument(key, local, hold) * gain;
    }
    return [value * (1 - pan * 0.4), value * (1 + pan * 0.4)];
}
function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }

function homeRaw(time) {
    let mix = [0, 0];
    mix = add(mix, eventValue(homeMelody, time, piano, 0.18, -0.18));
    mix = add(mix, eventValue(homeBass, time, cello, 0.105, 0.06));
    // Sparse answer notes, deliberately placed off the main melody grid.
    mix = add(mix, eventValue([[7.25, 86, 1.3], [18.65, 84, 1.5], [25.4, 88, 1.7]], time, piano, 0.055, 0.48));
    return mix;
}
function gameRaw(time) {
    const phraseTime = time % 12;
    let mix = [0, 0];
    const repeated = gamePizz.map(([start, key]) => [start, key, 0.46]);
    mix = add(mix, eventValue(repeated, phraseTime, pizzicato, 0.12, -0.36));
    mix = add(mix, eventValue(gameTheme, phraseTime, cello, 0.11, 0.12));
    const low = [[0, 38, 2.2], [3, 41, 2.1], [6, 36, 2.3], [9, 43, 2.1]];
    mix = add(mix, eventValue(low, phraseTime, cello, 0.12, 0));
    // One restrained, organic bow attack per phrase rather than electronic percussion.
    const strike = phraseTime % 3;
    if (strike < 0.09) {
        const hit = sine(118 - strike * 80, strike) * env(strike, 0.09, 0.003, 0.07) * 0.085;
        mix = add(mix, [hit, hit]);
    }
    return mix;
}
function render(raw, time) {
    const dry = raw(time);
    const early = raw(time - 0.27);
    const middle = raw(time - 0.61);
    const long = raw(time - 1.08);
    return [
        (dry[0] + early[1] * 0.25 + middle[0] * 0.15 + long[1] * 0.08) * fade(time),
        (dry[1] + early[0] * 0.25 + middle[1] * 0.15 + long[0] * 0.08) * fade(time),
    ];
}
function write(name, raw) {
    const frames = duration * rate;
    const data = Buffer.alloc(44 + frames * 4);
    data.write('RIFF', 0); data.writeUInt32LE(36 + frames * 4, 4); data.write('WAVE', 8);
    data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20);
    data.writeUInt16LE(2, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 4, 28);
    data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(frames * 4, 40);
    for (let i = 0; i < frames; i++) {
        const [left, right] = render(raw, i / rate);
        data.writeInt16LE(Math.round(clamp(left) * 32767), 44 + i * 4);
        data.writeInt16LE(Math.round(clamp(right) * 32767), 46 + i * 4);
    }
    const target = path.join(musicDir, name + '.wav');
    fs.writeFileSync(target, data);
    fs.copyFileSync(target, path.join(previewDir, name + '.wav'));
}

write('courtyard_home_chamber', homeRaw);
write('courtyard_game_chamber', gameRaw);
console.log('Generated original chamber-score home/game pair in ' + musicDir);
