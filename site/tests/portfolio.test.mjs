import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { cameraEntryPoints, selectCameraEntry } from '../src/lib/spatial-world.mjs';
import {
  cameraViewBox,
  cameraLimits,
  createSpatialCamera,
  panCamera,
  resizeCamera,
  zoomCamera,
} from '../src/lib/spatial-camera.mjs';

const world = { width: 5000, height: 3500 };
const viewport = { width: 1440, height: 900 };
const samePosition = (actual, expected) => Math.abs(actual - expected) < 1e-8;
const center = { x: world.width / 2, y: world.height / 2 };

test('the camera opens at its authored crop and remains inside the finite A1', () => {
  const camera = createSpatialCamera(world, viewport, center);
  const limits = cameraLimits(world, viewport);
  assert.ok(camera.scale >= limits.min);
  assert.ok(camera.scale <= limits.max);
  assert.ok(Math.abs(viewport.width / camera.scale / world.width - 0.3) < 1e-8);
  assert.ok(viewport.width / camera.scale <= world.width * 0.75);
  assert.ok(viewport.height / camera.scale <= world.height);
  assert.ok(camera.x >= 0 && camera.x <= world.width - viewport.width / camera.scale);
  assert.ok(camera.y >= 0 && camera.y <= world.height - viewport.height / camera.scale);
});

test('authored fresh-entry choices share one scale and stay in distinct A1 territories', () => {
  const a1 = { width: 3179, height: 2245 };
  assert.equal(cameraEntryPoints.length, 8);
  assert.equal(new Set(cameraEntryPoints.map((entry) => entry.id)).size, cameraEntryPoints.length);
  assert.equal(selectCameraEntry(() => 0), cameraEntryPoints[0]);
  assert.equal(selectCameraEntry(() => 0.999), cameraEntryPoints.at(-1));
  const cameras = cameraEntryPoints.map((entry) => createSpatialCamera(a1, viewport, entry));
  assert.equal(new Set(cameras.map((camera) => camera.scale)).size, 1);
  assert.ok(cameras.every((camera) => camera.x >= 0 && camera.y >= 0));
  assert.ok(new Set(cameras.map((camera) => `${Math.round(camera.x)},${Math.round(camera.y)}`)).size >= 6);
});

test('panning stops firmly at all four A1 edges without changing zoom', () => {
  const boundedWorld = { width: 5000, height: 3500 };
  const boundedViewport = { width: 1000, height: 800 };
  const camera = { x: 20, y: 2500, scale: 1 };
  const leftTop = panCamera(camera, boundedWorld, boundedViewport, -1000, -3000);
  assert.equal(camera.x, 0);
  assert.equal(camera.y, 0);
  assert.equal(leftTop.x, -20);
  assert.equal(leftTop.y, -2500);
  panCamera(camera, boundedWorld, boundedViewport, 10000, 10000);
  assert.equal(camera.x, 4000);
  assert.equal(camera.y, 2700);
  assert.equal(camera.scale, 1);
});

test('zoom remains anchored to the pointer and respects the no-fit lower bound', () => {
  const camera = createSpatialCamera(world, viewport, center);
  const point = { x: 430, y: 300 };
  const anchorX = camera.x + point.x / camera.scale;
  const anchorY = camera.y + point.y / camera.scale;
  zoomCamera(camera, world, viewport, point, camera.scale * 1.5);
  assert.ok(samePosition(camera.x + point.x / camera.scale, anchorX));
  assert.ok(samePosition(camera.y + point.y / camera.scale, anchorY));
  zoomCamera(camera, world, viewport, point, Number.POSITIVE_INFINITY);
  assert.equal(camera.scale, cameraLimits(world, viewport).max);
  assert.ok(samePosition(camera.x + point.x / camera.scale, anchorX));
  assert.ok(samePosition(camera.y + point.y / camera.scale, anchorY));
  zoomCamera(camera, world, viewport, point, 0);
  assert.equal(camera.scale, cameraLimits(world, viewport).min);
});

test('native SVG viewBox exposes increasing source detail as the camera zooms', () => {
  const camera = createSpatialCamera(world, viewport, center);
  const initial = cameraViewBox(camera, viewport);
  zoomCamera(camera, world, viewport, { x: 720, y: 450 }, camera.scale * 4);
  const zoomed = cameraViewBox(camera, viewport);
  assert.ok(zoomed.width < initial.width);
  assert.ok(zoomed.height < initial.height);
  assert.equal(zoomed.width, viewport.width / camera.scale);
  assert.equal(zoomed.height, viewport.height / camera.scale);
});

test('resizing preserves the world center and current zoom when allowed', () => {
  const camera = createSpatialCamera(world, viewport, center);
  const centerX = camera.x + viewport.width / (2 * camera.scale);
  const centerY = camera.y + viewport.height / (2 * camera.scale);
  const nextViewport = { width: 1280, height: 800 };
  resizeCamera(camera, world, viewport, nextViewport);
  assert.ok(samePosition(camera.x + nextViewport.width / (2 * camera.scale), centerX));
  assert.ok(samePosition(camera.y + nextViewport.height / (2 * camera.scale), centerY));
});

test('minimum zoom uses cover bounds and reveals the complete A1 on a matching aspect ratio', () => {
  for (const size of [viewport, { width: 390, height: 844 }]) {
    const limits = cameraLimits(world, size);
    const visibleWidth = size.width / limits.min;
    const visibleHeight = size.height / limits.min;
    assert.ok(visibleWidth <= world.width);
    assert.ok(visibleHeight <= world.height);
    assert.ok(Math.abs(visibleWidth - world.width) < 1e-8 || Math.abs(visibleHeight - world.height) < 1e-8);
  }
});

test('resizing to portrait enforces cover bounds without resetting the A1 center', () => {
  const camera = { x: 1200, y: 900, scale: 0.2 };
  const portrait = { width: 390, height: 844 };
  resizeCamera(camera, world, viewport, portrait);
  assert.ok(camera.scale >= cameraLimits(world, portrait).min);
  assert.ok(camera.x >= 0 && camera.x <= world.width - portrait.width / camera.scale);
  assert.ok(camera.y >= 0 && camera.y <= world.height - portrait.height / camera.scale);
});

test('the native Penpot world and all extracted media are published unchanged', async () => {
  const handoff = new URL('../../HMA_reconstruction_handoff/', import.meta.url);
  const sourceSvg = await readFile(new URL('source/Board.svg', handoff));
  const servedSvg = await readFile(new URL('../public/assets/portfolio/Board.svg', import.meta.url));
  const sourceWorld = JSON.parse(await readFile(new URL('world-data.json', handoff), 'utf8'));
  const servedWorld = JSON.parse(await readFile(new URL('../public/assets/portfolio/world-data.json', import.meta.url), 'utf8'));
  const penpotWorld = JSON.parse(await readFile(new URL('../public/assets/portfolio/penpot-world.json', import.meta.url), 'utf8'));
  const sourceAssets = JSON.parse(await readFile(new URL('asset-index.json', handoff), 'utf8'));
  const servedAssets = JSON.parse(await readFile(new URL('../public/assets/portfolio/asset-index.json', import.meta.url), 'utf8'));
  const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');
  assert.equal(digest(servedSvg), digest(sourceSvg));
  assert.deepEqual(servedWorld, sourceWorld);
  assert.deepEqual(servedAssets, sourceAssets);
  assert.ok(Math.abs(penpotWorld.board.width - 3179) < 1e-6);
  assert.equal(penpotWorld.board.height, 2245);
  assert.equal(penpotWorld.background.x - penpotWorld.board.x, -2361);
  assert.equal(penpotWorld.background.y - penpotWorld.board.y, -142);
  assert.ok(penpotWorld.background.x + penpotWorld.background.width - (penpotWorld.board.x + penpotWorld.board.width) > 0);
  assert.ok(penpotWorld.background.y + penpotWorld.background.height - (penpotWorld.board.y + penpotWorld.board.height) > 0);
  const mapHB = Object.values(penpotWorld.objects).find((object) => object.name === 'mapHB');
  assert.equal(mapHB.x - penpotWorld.board.x, 1874);
  assert.equal(mapHB.y - penpotWorld.board.y, -90);
  assert.ok(mapHB.x + mapHB.width > penpotWorld.board.x + penpotWorld.board.width);
  assert.ok(sourceAssets.some((asset) => asset.penpot_media_record_id === mapHB.fills[0].fillImage.id));
  const boxcut = Object.values(penpotWorld.objects).find((object) => object.name === 'boxcut');
  assert.equal(boxcut.x - penpotWorld.board.x, -679);
  assert.ok(boxcut.y - penpotWorld.board.y + boxcut.height > penpotWorld.board.height);

  const imageIds = new Set([...sourceSvg.toString().matchAll(/assets\/by-file-media-id\/([a-f0-9-]+)/g)].map((match) => match[1]));
  assert.equal(imageIds.size, sourceAssets.length);
  assert.deepEqual(imageIds, new Set(sourceAssets.map((asset) => asset.penpot_media_record_id)));

  for (const asset of sourceAssets) {
    const filename = asset.extracted_file.split('/').pop();
    const original = await readFile(new URL(asset.extracted_file, handoff));
    const served = await readFile(new URL(`../public/assets/portfolio/native/${filename}`, import.meta.url));
    assert.equal(digest(served), digest(original), `${filename}: unchanged Penpot media`);
  }
});
