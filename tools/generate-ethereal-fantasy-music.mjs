import fs from 'node:fs';
import path from 'node:path';

const project = path.resolve(import.meta.dirname, '..');
const musicDir = path.join(project, 'assets', 'resources', 'audio', 'music');
const previewDir = 'C:/Users/Edwen/Documents/Codex/2026-09-12/zhe/outputs/音乐试听_空灵奇幻版';
fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const rate = 44100;
const duration = 30;
const tau = Math.PI * 2;
const midi = (key) => 440 * Math.pow(2, (key - 69) / 12);
const clamp = (value) => Math.max(-1, Math.min(1, value));
const sine = (hz, t) => Math.sin(tau * hz * t);
const triangle = (hz, t) => 2 * Math.abs(2 * ((hz * t) % 1) - 1) - 1;
const fade = (t) => Math.max(0, Math.min(1, t / 1.8, (duration - t) / 2));
const env = (t, hold, attack, release) => Math.max(0, Math.min(1, t / attack, (hold - t) / release));

function feltPiano(key, t, hold) {
    const f = midi(key);
    const body = 0.58 * sine(f, t) + 0.23 * sine(f * 2, t) + 0.1 * sine(f * 3, t);
    return body * env(t, hold, 0.008, Math.min(hold * 0.9, 1.7));
}
function celesta(key, t, hold) {
    const f = midi(key);
    const body = 0.64 * sine(f, t) + 0.2 * sine(f * 2.76, t) + 0.08 * sine(f * 4.13, t);
    return body * env(t, hold, 0.006, Math.min(hold * 0.9, 2.2));
}
function stringPad(key, t, hold) {
    const f = midi(key);
    return (0.76 * sine(f, t) + 0.15 * triangle(f * 0.5, t) + 0.09 * sine(f * 1.5, t))
        * env(t, hold, 0.9, 1.5);
}
function pan(value, amount) { return [value * (1 - amount * 0.48), value * (1 + amount * 0.48)]; }

function makeTrack(style, gameplay) {
    const mood = style === 'gloam'
        ? {
            // Original minor-key motifs: introspective, sparse and hand-drawn.
            melody: [69, 72, 76, 74, 72, 69, 67, 69, 72, 74, 77, 76],
            arp: [57, 60, 64, 60, 55, 59, 62, 59, 53, 57, 60, 57],
            chords: [[45, 52, 57, 60], [43, 50, 55, 59], [41, 48, 53, 57], [43, 50, 55, 59]],
            root: [45, 43, 41, 43],
        }
        : {
            // Original luminous major/minor colour, designed for an open forest feeling.
            melody: [76, 79, 83, 81, 79, 76, 74, 76, 79, 81, 84, 83],
            arp: [60, 64, 67, 72, 57, 60, 64, 69, 55, 59, 62, 67],
            chords: [[48, 55, 60, 64], [45, 52, 57, 60], [43, 50, 55, 59], [45, 52, 57, 60]],
            root: [48, 45, 43, 45],
        };
    const step = gameplay ? 0.32 : 0.64;
    const raw = (t) => {
        if (t < 0 || t >= duration) return [0, 0];
        const phrase = Math.floor(t / step) % mood.melody.length;
        const local = t % step;
        const chordIndex = Math.floor(t / 3.84) % mood.chords.length;
        const chordLocal = t % 3.84;
        let left = 0, right = 0;

        const main = feltPiano(mood.melody[phrase], local, step);
        [left, right] = [left + main * 0.15, right + main * 0.15];

        const arpKey = mood.arp[Math.floor(t / (gameplay ? 0.16 : 0.32)) % mood.arp.length];
        const arpLocal = t % (gameplay ? 0.16 : 0.32);
        const arp = celesta(arpKey + (gameplay && phrase % 4 === 3 ? 12 : 0), arpLocal, gameplay ? 0.16 : 0.32) * (gameplay ? 0.07 : 0.052);
        const arpPan = pan(arp, phrase % 2 ? 0.62 : -0.62);
        left += arpPan[0]; right += arpPan[1];

        mood.chords[chordIndex].forEach((key, i) => {
            const pad = stringPad(key, chordLocal, 3.84) * (gameplay ? 0.052 : 0.068);
            left += pad * (i % 2 ? 0.8 : 1); right += pad * (i % 2 ? 1 : 0.8);
        });
        const bass = stringPad(mood.root[chordIndex] - 12, chordLocal, 3.84) * (gameplay ? 0.10 : 0.075);
        left += bass; right += bass;

        // Soft wind and distant pulse create a spacious game-world bed without copying a source work.
        const wind = (sine(0.11, t) * 0.5 + sine(0.043, t) * 0.5) * 0.008;
        left += wind; right -= wind;
        if (gameplay) {
            const pulseLocal = t % 0.64;
            const pulse = sine(86 - pulseLocal * 24, pulseLocal) * env(pulseLocal, 0.64, 0.015, 0.34) * 0.06;
            left += pulse; right += pulse;
        }
        return [left, right];
    };
    return (t) => {
        const dry = raw(t);
        const echoA = raw(t - 0.23);
        const echoB = raw(t - 0.51);
        const echoC = raw(t - 0.89);
        return [
            (dry[0] + echoA[1] * 0.22 + echoB[0] * 0.13 + echoC[1] * 0.07) * fade(t),
            (dry[1] + echoA[0] * 0.22 + echoB[1] * 0.13 + echoC[0] * 0.07) * fade(t),
        ];
    };
}

function writeWav(name, sampler) {
    const frames = duration * rate;
    const data = Buffer.alloc(44 + frames * 4);
    data.write('RIFF', 0); data.writeUInt32LE(36 + frames * 4, 4); data.write('WAVE', 8);
    data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20);
    data.writeUInt16LE(2, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 4, 28);
    data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(frames * 4, 40);
    for (let index = 0; index < frames; index++) {
        const [left, right] = sampler(index / rate);
        data.writeInt16LE(Math.round(clamp(left) * 32767), 44 + index * 4);
        data.writeInt16LE(Math.round(clamp(right) * 32767), 46 + index * 4);
    }
    const target = path.join(musicDir, name + '.wav');
    fs.writeFileSync(target, data);
    fs.copyFileSync(target, path.join(previewDir, name + '.wav'));
}

for (const style of ['gloam', 'lumen']) {
    writeWav(style + '_home_ethereal', makeTrack(style, false));
    writeWav(style + '_game_ethereal', makeTrack(style, true));
}
console.log('Generated two original ethereal fantasy music pairs in ' + musicDir);
