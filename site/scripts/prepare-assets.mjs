import { mkdir, copyFile, access, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { works } from '../src/lib/current-state.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.resolve(root, '../Assets');
const output = path.join(root, 'public/assets');
const images = [
  ...[1, 2, 3, 4].map((index) => ['landing', `hma-0${index}.png`]),
  ['works', 'tiny-infiltration-still.png'],
  ['works', 'la-chasse-still.png'],
  ['works', 'volume-reconstruction.jpg'],
];

for (const [group, filename] of images) {
  const directory = path.join(output, group);
  await mkdir(directory, { recursive: true });
  const original = path.join(source, `${group}_`, filename);
  const basename = path.parse(filename).name;
  await copyFile(original, path.join(directory, filename));
  await sharp(original).webp({ quality: 94 }).toFile(path.join(directory, `${basename}.webp`));
  await sharp(original).avif({ quality: 85, effort: 4 }).toFile(path.join(directory, `${basename}.avif`));
  console.log(`Prepared ${group}/${basename} without resizing or cropping`);
}

for (const work of works) {
  if (!work.excerpt) continue;
  const filename = path.basename(work.excerpt);
  await copyFile(path.join(source, 'works_', filename), path.join(output, 'works', filename));
  console.log(`Copied authored excerpt works/${filename} unchanged`);
}

await mkdir(path.join(output, 'documents'), { recursive: true });
await copyFile(path.join(source, 'documents_/Olivia_Joret_Portfolio_2026.pdf'), path.join(output, 'documents/Olivia_Joret_Portfolio_2026.pdf'));

const fonts = path.join(root, 'public/fonts');
await mkdir(fonts, { recursive: true });
const upstream = 'https://raw.githubusercontent.com/ArtifexSoftware/urw-base35-fonts/3c0ba3b5687632dfc66526544a4e811fe0ec0cd9';
for (const [remote, local] of [['fonts/NimbusSans-Bold.otf', 'NimbusSans-Bold.otf'], ['LICENSE', 'LICENSE'], ['COPYING', 'COPYING']]) {
  const destination = path.join(fonts, local);
  try { await access(destination); } catch {
    const response = await fetch(`${upstream}/${remote}`);
    if (!response.ok) throw new Error(`Official font download failed: ${response.status} ${remote}`);
    await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  }
}
console.log('Prepared portfolio and official Nimbus Sans Bold with upstream license files');