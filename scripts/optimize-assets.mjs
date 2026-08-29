/**
 * Re-encodes the downloaded art to webp at sizes the layout actually uses.
 * Map splashes arrive at 4K and sit behind a blur, so they lose the most weight.
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const IMG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img');

// prefix -> [max width, quality]. Map layers are blurred, so they tolerate low quality.
const RULES = [
  ['map-', 1600, 62],
  ['agent-', 900, 82],
  ['ability-', 160, 90], // small HUD glyphs, kept crisp
];

const files = (await readdir(IMG)).filter((f) => f.endsWith('.png'));
let before = 0;
let after = 0;

for (const file of files) {
  const rule = RULES.find(([prefix]) => file.startsWith(prefix));
  if (!rule) continue;
  const [, width, quality] = rule;
  const src = path.join(IMG, file);
  const dest = src.replace(/\.png$/, '.webp');

  before += (await stat(src)).size;
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(dest);
  after += (await stat(dest)).size;
  await unlink(src);
}

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
console.log(`optimized ${files.length} images: ${mb(before)} -> ${mb(after)}`);
