import fs from 'node:fs';
import path from 'node:path';

const project = path.resolve(import.meta.dirname, '..');
const musicDir = path.join(project, 'assets', 'resources', 'audio', 'music');
const previewDir = 'C:/Users/Edwen/Documents/Codex/2026-09-12/zhe/outputs/音乐试听_精致版';
fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const rate = 44100;
const duration = 24;
const tau = Math.PI * 2;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (n) => Math.max(-1, Math.min(1, n));
const fract = (n) => n - Math.floor(n);
const noise = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453) * 2 - 1;
const fade = (t) => Math.max(0, Math.min(1, t / 1.1, (duration - t) / 1.3));
const sine = (f, t) => Math.sin(tau * f * t);
const triangle = (f, t) => 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1;
const envelope = (t, hold, attack = 0.015, release = 0.22) => Math.max(0, Math.min(1, t / attack, (hold - t) / release));

function oscillator(f, t, kind) {
    if (kind === 'bell') return 0.72 * sine(f, t) + 0.23 * sine(f * 2.01, t) + 0.08 * sine(f * 3.96, t);
    if (kind === 'pluck') return 0.65 * triangle(f, t) + 0.28 * sine(f * 2, t) + 0.1 * sine(f * 3, t);
    if (kind === 'string') return 0.72 * sine(f, t) + 0.18 * triangle(f * 0.5, t) + 0.1 * sine(f * 1.5, t);
    return sine(f, t);
}

function loopNote(pattern, step, t, kind, gain, pan = 0) {
    const index = Math.floor(t / step) % pattern.length;
    const local = t - Math.floor(t / step) * step;
    const key = pattern[index];
    if (key == null) return [0, 0];
    const value = oscillator(midi(key), local, kind) * envelope(local, step, 0.01, Math.min(step * 0.7, 0.36)) * gain;
    return [value * (1 - pan * 0.45), value * (1 + pan * 0.45)];
}

function sustained(chords, t, kind, gain) {
    const chord = chords[Math.floor(t / 3) % chords.length];
    const local = t % 3;
    const amp = envelope(local, 3, 0.45, 0.7) * gain;
    const values = chord.map((key, i) => oscillator(midi(key), local, kind) * amp / chord.length * (i % 2 ? 0.9 : 1.1));
    return [values.reduce((a, n, i) => a + n * (i % 2 ? 0.75 : 1), 0), values.reduce((a, n, i) => a + n * (i % 2 ? 1 : 0.75), 0)];
}

function percussion(t, intensity) {
    const half = t % 0.5;
    const beat = Math.floor(t * 2);
    const kick = half < 0.11 && (beat % 4 === 0 || intensity > 0.55)
        ? sine(100 - half * 620, half) * (1 - half / 0.11) * 0.22 * intensity : 0;
    const hat = (t % 0.25) < 0.035
        ? noise(Math.floor(t * rate)) * (1 - (t % 0.25) / 0.035) * 0.05 * intensity : 0;
    const tick = (t % 0.5) < 0.028
        ? (sine(2300, t) + noise(Math.floor(t * rate))) * (1 - (t % 0.5) / 0.028) * 0.035 * intensity : 0;
    return [kick + hat + tick * 0.7, kick + hat + tick * 1.05];
}

function arrange(spec, gameplay) {
    const melody = gameplay ? spec.gameMelody : spec.homeMelody;
    const bass = gameplay ? spec.gameBass : spec.homeBass;
    const step = gameplay ? 0.375 : 0.75;
    const raw = (t) => {
        if (t < 0 || t >= duration) return [0, 0];
        const intro = t < 3 ? 0.48 : 1;
        const a = loopNote(melody, step, t, spec.lead, gameplay ? 0.11 : 0.095, -0.28);
        const b = loopNote(melody.map((x, i) => i % 3 === 0 && x ? x + 12 : null), step, t + step * 0.5, 'bell', gameplay ? 0.045 : 0.035, 0.38);
        const low = loopNote(bass, gameplay ? 0.75 : 1.5, t, 'string', gameplay ? 0.13 : 0.105, 0);
        const pad = sustained(spec.chords, t, 'string', gameplay ? 0.095 : 0.12);
        const drum = percussion(t, gameplay ? 0.88 : 0.28);
        return [(a[0] + b[0] + low[0] + pad[0] + drum[0]) * intro, (a[1] + b[1] + low[1] + pad[1] + drum[1]) * intro];
    };
    return (t) => {
        const base = raw(t);
        const echo1 = raw(t - 0.19);
        const echo2 = raw(t - 0.39);
        const l = (base[0] + echo1[1] * 0.18 + echo2[0] * 0.10) * fade(t);
        const r = (base[1] + echo1[0] * 0.18 + echo2[1] * 0.10) * fade(t);
        return [l, r];
    };
}

function write(name, sampler) {
    const frames = duration * rate;
    const buffer = Buffer.alloc(44 + frames * 4);
    buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + frames * 4, 4); buffer.write('WAVE', 8);
    buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(2, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 4, 28);
    buffer.writeUInt16LE(4, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(frames * 4, 40);
    for (let i = 0; i < frames; i++) {
        const [left, right] = sampler(i / rate);
        buffer.writeInt16LE(Math.round(clamp(left) * 32767), 44 + i * 4);
        buffer.writeInt16LE(Math.round(clamp(right) * 32767), 46 + i * 4);
    }
    const target = path.join(musicDir, name + '.wav');
    fs.writeFileSync(target, buffer);
    fs.copyFileSync(target, path.join(previewDir, name + '.wav'));
}

const sets = {
    castle: {
        lead: 'bell', homeMelody: [76, 79, 83, 86, 83, 79, 76, 74], gameMelody: [76, 79, 83, 86, 88, 86, 83, 79],
        homeBass: [52, 55, 59, 55], gameBass: [52, 55, 57, 59, 50, 55, 57, 59],
        chords: [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 62, 67]],
    },
    clockwork: {
        lead: 'pluck', homeMelody: [72, 76, 79, 76, 74, 77, 81, 77], gameMelody: [72, 76, 79, 81, 79, 77, 76, 74],
        homeBass: [48, 52, 55, 52], gameBass: [48, 52, 55, 52, 50, 53, 57, 53],
        chords: [[60, 64, 67], [64, 67, 71], [62, 65, 69], [59, 62, 65]],
    },
    abyss: {
        lead: 'string', homeMelody: [69, null, 72, 74, 76, 74, 72, null], gameMelody: [69, 72, 74, 76, 74, 72, 69, 67],
        homeBass: [45, 45, 48, 43], gameBass: [45, 48, 50, 43, 45, 48, 52, 43],
        chords: [[57, 60, 64], [60, 64, 67], [55, 59, 62], [57, 61, 64]],
    },
};

for (const [name, spec] of Object.entries(sets)) {
    write(name + '_home_premium', arrange(spec, false));
    write(name + '_game_premium', arrange(spec, true));
}
console.log('Generated three premium stereo home/game music pairs in ' + musicDir);
