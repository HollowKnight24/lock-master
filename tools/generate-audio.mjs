import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve(import.meta.dirname, '..', 'assets', 'resources', 'audio');
fs.mkdirSync(out, { recursive: true });
const rate = 22050;
const clamp = (v) => Math.max(-1, Math.min(1, v));

function writeWav(name, seconds, sample) {
    const count = Math.floor(rate * seconds);
    const buffer = Buffer.alloc(44 + count * 2);
    buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + count * 2, 4); buffer.write('WAVE', 8);
    buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
    buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(count * 2, 40);
    for (let i = 0; i < count; i++) buffer.writeInt16LE(Math.round(clamp(sample(i / rate, seconds)) * 32767), 44 + i * 2);
    fs.writeFileSync(path.join(out, name + '.wav'), buffer);
}

const env = (t, length, attack = 0.012, release = 0.22) => Math.min(1, t / attack, (length - t) / release);
const sine = (hz, t) => Math.sin(Math.PI * 2 * hz * t);

writeWav('ui_click', 0.11, (t, d) => 0.20 * sine(900, t) * env(t, d, 0.004, 0.07));
writeWav('hit_yellow', 0.32, (t, d) => (0.28 * sine(880, t) + 0.16 * sine(1320, t)) * env(t, d, 0.008, 0.20));
writeWav('hit_blue', 0.43, (t, d) => (0.22 * sine(660 + t * 720, t) + 0.14 * sine(1320 + t * 960, t)) * env(t, d, 0.008, 0.28));
writeWav('miss', 0.36, (t, d) => (0.20 * sine(180 - t * 100, t) + 0.05 * Math.sin(t * 9800)) * env(t, d, 0.006, 0.22));
writeWav('win', 0.72, (t, d) => {
    const notes = [[0, 523.25], [0.14, 659.25], [0.28, 783.99], [0.42, 1046.5]];
    return notes.reduce((sum, [at, hz]) => sum + (t >= at ? 0.16 * sine(hz, t - at) * env(t - at, d - at, 0.008, 0.24) : 0), 0);
});
writeWav('lose', 0.58, (t, d) => (0.22 * sine(330 - t * 200, t) + 0.08 * sine(165 - t * 80, t)) * env(t, d, 0.008, 0.32));
writeWav('bgm', 12, (t, d) => {
    const step = Math.floor(t * 2) % 8;
    const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23][step];
    const local = (t * 2) % 1;
    const lead = 0.07 * sine(melody, t) * Math.min(local / 0.04, (1 - local) / 0.20);
    const pad = 0.035 * (sine(130.81, t) + sine(196, t) + sine(261.63, t));
    const pulse = 0.018 * sine(65.41, t) * (0.5 + 0.5 * Math.sin(Math.PI * 2 * 0.5 * t));
    return (lead + pad + pulse) * Math.min(t / 0.5, (d - t) / 0.5);
});
console.log('Generated 7 original WAV assets in ' + out);
