import { mkdir, copyFile, access, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { strFromU8, unzipSync } from 'fflate';
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

await rm(path.join(output, 'documents'), { recursive: true, force: true });
const reconstruction = path.resolve(root, '../HMA_reconstruction_handoff');
const portfolio = path.join(output, 'portfolio');
const nativeAssets = path.join(portfolio, 'native');
const overviewAssets = path.join(portfolio, 'native-overview');
const OVERVIEW_DENSITY = 4;
await mkdir(nativeAssets, { recursive: true });
await rm(overviewAssets, { recursive: true, force: true });
await mkdir(overviewAssets, { recursive: true });
await rm(path.join(portfolio, 'HMA_map_prototype_01.png'), { force: true });
const [worldDataBuffer, assetIndexBuffer, penpotBuffer] = await Promise.all([
  readFile(path.join(reconstruction, 'world-data.json')),
  readFile(path.join(reconstruction, 'asset-index.json')),
  readFile(path.join(reconstruction, 'source/New File 5.penpot')),
]);
const worldData = JSON.parse(worldDataBuffer.toString());
const media = JSON.parse(assetIndexBuffer.toString());
const archive = unzipSync(new Uint8Array(penpotBuffer));
const projectEntry = Object.keys(archive).find((filename) => /^files\/[^/]+\.json$/.test(filename));
if (!projectEntry) throw new Error('The Penpot archive has no project metadata.');
const project = JSON.parse(strFromU8(archive[projectEntry]));
const pagePrefix = `files/${project.id}/pages/${worldData.source.page_id}/`;
const objects = Object.entries(archive)
  .filter(([filename]) => filename.startsWith(pagePrefix) && filename.endsWith('.json'))
  .map(([, bytes]) => JSON.parse(strFromU8(bytes)))
  .filter((object) => object.id);
const objectsById = Object.fromEntries(objects.map((object) => [object.id, object]));
const board = objectsById[worldData.source.board_id];
const background = objects.find((object) => object.name === 'BACKGROUND interior bunker infinite');
if (!board || !background) throw new Error('The Penpot archive is missing its Board or continuous background object.');
const nativeWorld = {
  source: { file: project.name, fileId: project.id, pageId: worldData.source.page_id },
  board,
  background,
  objects: objectsById,
};
await writeFile(path.join(portfolio, 'penpot-world.json'), JSON.stringify(nativeWorld));
const boardSvg = await readFile(path.join(reconstruction, 'source/Board.svg'), 'utf8');
const displaySizes = new Map();
for (const [tag] of boardSvg.matchAll(/<image\b[^>]*>/g)) {
  const attribute = (name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const mediaId = attribute('href')?.split('/').pop();
  const previous = displaySizes.get(mediaId) ?? { width: 0, height: 0 };
  displaySizes.set(mediaId, {
    width: Math.max(previous.width, Number(attribute('width'))),
    height: Math.max(previous.height, Number(attribute('height'))),
  });
}
const overviews = {};
for (const asset of media) {
  const filename = path.basename(asset.extracted_file);
  const original = path.join(reconstruction, asset.extracted_file);
  await copyFile(original, path.join(nativeAssets, filename));
  // Overview rasters keep decoded image memory proportional to what the A1 view can show.
  // Untouched originals remain published and are swapped in by the viewer for close zoom.
  const display = displaySizes.get(asset.penpot_media_record_id);
  if (!display) continue;
  const metadata = await sharp(original).metadata();
  const { width, height } = metadata.autoOrient ?? metadata;
  const factor = Math.max(display.width * OVERVIEW_DENSITY / width, display.height * OVERVIEW_DENSITY / height);
  if (factor >= 0.75) continue;
  const overviewWidth = Math.max(1, Math.round(width * factor));
  const overviewHeight = Math.max(1, Math.round(height * factor));
  const pipeline = sharp(original).rotate().resize(overviewWidth, overviewHeight, { fit: 'fill' });
  if (/\.jpe?g$/i.test(filename)) pipeline.jpeg({ quality: 90 });
  await pipeline.toFile(path.join(overviewAssets, filename));
  overviews[filename] = { width: overviewWidth, height: overviewHeight };
}
await writeFile(path.join(portfolio, 'native-overview.json'), JSON.stringify(overviews));
await Promise.all([
  copyFile(path.join(reconstruction, 'source/Board.svg'), path.join(portfolio, 'Board.svg')),
  writeFile(path.join(portfolio, 'world-data.json'), worldDataBuffer),
  copyFile(path.join(reconstruction, 'asset-index.json'), path.join(portfolio, 'asset-index.json')),
]);
console.log(`Prepared Penpot world with ${objects.length} source objects and ${media.length} extracted raster assets`);
console.log(`Prepared ${Object.keys(overviews).length} overview rasters at ${OVERVIEW_DENSITY} px per world unit`);

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