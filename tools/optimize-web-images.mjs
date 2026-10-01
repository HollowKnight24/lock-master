import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const outputDir = resolve(process.argv[2] ?? 'build/web-mobile');
const minBytes = 64 * 1024;

function filesUnder(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(root, entry.name);
    return entry.isDirectory() ? filesUnder(absolute) : [absolute];
  });
}

sharp.cache(false);
let before = 0;
let after = 0;
let optimized = 0;

for (const file of filesUnder(outputDir)) {
  if (extname(file).toLowerCase() !== '.png') continue;
  const originalSize = statSync(file).size;
  before += originalSize;
  if (originalSize < minBytes) {
    after += originalSize;
    continue;
  }

  const input = readFileSync(file);
  const output = await sharp(input)
    .png({ palette: true, quality: 92, effort: 10, colours: 256, dither: 0.8 })
    .toBuffer();
  if (output.length < originalSize) {
    writeFileSync(file, output);
    after += output.length;
    optimized += 1;
  } else {
    after += originalSize;
  }
}

console.log(`[web-trial] optimized ${optimized} PNG files: ${(before / 1048576).toFixed(2)} MiB -> ${(after / 1048576).toFixed(2)} MiB`);
