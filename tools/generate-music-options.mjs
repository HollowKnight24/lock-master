import fs from 'node:fs';
import path from 'node:path';

const project = path.resolve(import.meta.dirname, '..');
const musicDir = path.join(project, 'assets', 'resources', 'audio', 'music');
const previewDir = 'C:/Users/Edwen/Documents/Codex/2026-09-12/zhe/outputs/音乐试听';
fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const rate = 22050;
const length = 16;
const clamp = (v) => Math.max(-1, Math.min(1, v));
const sine = (hz, t) => Math.sin(Math.PI * 2 * hz * t);
const tri = (hz, t) => 2 * Math.abs(2 * ((hz * t) % 1) - 1) - 1;
const note = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const env = (t, duration, attack = 0.01, release = 0.18) => Math.max(0, Math.min(1, t / attack, (duration - t) / release));

function writeWav(name, sampler) {
    const frames = Math.floor(length * rate);
    const buffer = Buffer.alloc(44 + frames * 2);
    buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + frames * 2, 4); buffer.write('WAVE', 8);
    buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
    buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(frames * 2, 40);
    for (let i = 0; i < frames; i++) buffer.writeInt16LE(Math.round(clamp(sampler(i / rate)) * 32767), 44 + i * 2);
    const target = path.join(musicDir, name + '.wav');
    fs.writeFileSync(target, buffer);
    fs.copyFileSync(target, path.join(previewDir, name + '.wav'));
}

function sequence(pattern, step, t, voice, gain) {
    const index = Math.floor(t / step) % pattern.length;
    const local = t % step;
    const value = pattern[index];
    return value == null ? 0 : voice(note(value), local) * env(local, step, 0.01, Math.min(0.25, step * 0.65)) * gain;
}

function makeAmber(home) {
    const melody = home ? [76, 79, 83, 79, 74, 78, 81, 78] : [76, 79, 83, 86, 81, 79, 78, 74];
    const bass = home ? [52, 52, 55, 55, 50, 50, 57, 57] : [52, 55, 57, 50];
    return (t) => {
        const lead = sequence(melody, home ? 1 : 0.5, t, (hz, x) => sine(hz, x) + 0.34 * sine(hz * 2, x), home ? 0.075 : 0.065);
        const low = sequence(bass, home ? 2 : 1, t, (hz, x) => 0.72 * sine(hz, x) + 0.28 * sine(hz / 2, x), 0.10);
        const pad = 0.026 * (sine(note(64), t) + sine(note(67), t) + sine(note(71), t));
        const tick = !home && (t % 0.5 < 0.045) ? 0.025 * sine(1800, t) * (1 - (t % 0.5) / 0.045) : 0;
        return (lead + low + pad + tick) * Math.min(1, t / 0.5, (length - t) / 0.5);
    };
}

function makeMoon(home) {
    const melody = home ? [69, null, 72, 74, 76, 74, 72, null] : [69, 72, 74, 76, 74, 72, 69, 67];
    const bass = [45, 45, 48, 43];
    return (t) => {
        const lead = sequence(melody, home ? 1 : 0.5, t, (hz, x) => 0.75 * sine(hz, x) + 0.25 * tri(hz / 2, x), home ? 0.065 : 0.06);
        const low = sequence(bass, home ? 2 : 1, t, (hz, x) => sine(hz, x), 0.11);
        const drone = 0.03 * (sine(note(57), t) + 0.55 * sine(note(64), t));
        const pulse = !home && (t % 0.25 < 0.035) ? 0.018 * tri(90, t) : 0;
        return (lead + low + drone + pulse) * Math.min(1, t / 0.65, (length - t) / 0.65);
    };
}

function makeSpark(home) {
    const melody = home ? [79, 83, 86, 83, 78, 81, 84, 81] : [79, 83, 86, 88, 86, 83, 81, 79];
    const bass = [55, 55, 60, 60, 53, 53, 57, 57];
    return (t) => {
        const lead = sequence(melody, home ? 0.75 : 0.375, t, (hz, x) => 0.7 * tri(hz, x) + 0.3 * sine(hz * 2, x), home ? 0.06 : 0.055);
        const low = sequence(bass, home ? 1.5 : 0.75, t, (hz, x) => sine(hz, x), 0.09);
        const clap = !home && (t % 0.375 < 0.03) ? 0.018 * Math.sin(t * 23000) : 0;
        const shimmer = 0.012 * sine(note(91), t);
        return (lead + low + clap + shimmer) * Math.min(1, t / 0.4, (length - t) / 0.4);
    };
}

for (const [name, factory] of [['amber', makeAmber], ['moon', makeMoon], ['spark', makeSpark]]) {
    writeWav(name + '_home', factory(true));
    writeWav(name + '_game', factory(false));
}
console.log('Generated three home/game music pairs in ' + musicDir);
