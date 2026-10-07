import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { currentState, selectCrop, works } from '../src/lib/current-state.mjs';

test('the selected authored crop stays fixed through the session', () => {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const first = selectCrop(storage, () => 0.8);
  assert.equal(first.id, 'hma-04');
  assert.equal(selectCrop(storage, () => 0).id, first.id);
});

test('stale storage and unavailable session storage do not break the landing', () => {
  const storage = { getItem: () => 'old-state', setItem: () => { throw new Error('blocked'); } };
  assert.equal(selectCrop(storage, () => 0).id, 'hma-01');
  assert.equal(selectCrop(undefined, () => 0.5).id, 'hma-03');
});

test('the current layer uses the supplied excerpt and keeps missing media static', () => {
  assert.equal(currentState.crops.length, 4);
  assert.equal(works.length, 3);
  assert.equal(works.find((work) => work.id === 'chasse').excerpt, '/assets/works/la-chasse-loop.mp4');
  assert.equal(works.find((work) => work.id === 'tiny').excerpt, null);
  assert.equal(works.find((work) => work.id === 'reconstruction').excerpt, null);
});

test('served masters are unchanged and derivatives retain authored dimensions', async () => {
  const assets = [
    ...currentState.crops.map((crop) => ['landing', crop.id, 'png']),
    ...works.map((work) => ['works', work.still, work.masterExtension]),
  ];
  const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');
  for (const [group, name, extension] of assets) {
    const original = await readFile(new URL(`../../Assets/${group}_/${name}.${extension}`, import.meta.url));
    const served = await readFile(new URL(`../public/assets/${group}/${name}.${extension}`, import.meta.url));
    assert.equal(digest(served), digest(original), `${name}: unchanged master`);
    const dimensions = await sharp(original).metadata();
    for (const format of ['webp', 'avif']) {
      const derivative = await sharp(fileURLToPath(new URL(`../public/assets/${group}/${name}.${format}`, import.meta.url))).metadata();
      assert.equal(derivative.width, dimensions.width, `${name}.${format}: width`);
      assert.equal(derivative.height, dimensions.height, `${name}.${format}: height`);
    }
  }
  for (const work of works.filter((candidate) => candidate.excerpt)) {
    const filename = work.excerpt.split('/').pop();
    const original = await readFile(new URL(`../../Assets/works_/${filename}`, import.meta.url));
    const served = await readFile(new URL(`../public${work.excerpt}`, import.meta.url));
    assert.equal(digest(served), digest(original), `${work.id}: unchanged authored excerpt`);
  }
});