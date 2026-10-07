export const EPOCH = Date.UTC(2026, 9, 4);
const BASE = 381.627;
const PERIOD = 120;
const accumulated = new Map([[0, 0]]);
let firstBlock = 0;
let lastBlock = 0;

function rateForBlock(block) {
  let seed = Math.imul(block ^ 0x45d9f3b, 0x45d9f3b);
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  const random = ((seed ^ (seed >>> 16)) >>> 0) / 4294967296;
  return 0.00006 + 0.008 * random ** 4;
}

function valueAtBlock(block) {
  while (lastBlock < block) {
    accumulated.set(lastBlock + 1, accumulated.get(lastBlock) + PERIOD * (rateForBlock(lastBlock) + rateForBlock(lastBlock + 1)) / 2);
    lastBlock += 1;
  }
  while (firstBlock > block) {
    accumulated.set(firstBlock - 1, accumulated.get(firstBlock) - PERIOD * (rateForBlock(firstBlock - 1) + rateForBlock(firstBlock)) / 2);
    firstBlock -= 1;
  }
  return accumulated.get(block);
}

export function temporalRate(timestamp) {
  const seconds = (timestamp - EPOCH) / 1000;
  const block = Math.floor(seconds / PERIOD);
  const fraction = seconds / PERIOD - block;
  const blend = 3 * fraction ** 2 - 2 * fraction ** 3;
  return rateForBlock(block) + (rateForBlock(block + 1) - rateForBlock(block)) * blend;
}

export function temporalValue(timestamp) {
  const seconds = (timestamp - EPOCH) / 1000;
  const block = Math.floor(seconds / PERIOD);
  const fraction = seconds / PERIOD - block;
  const startRate = rateForBlock(block);
  const difference = rateForBlock(block + 1) - startRate;
  return BASE + valueAtBlock(block) + PERIOD * (startRate * fraction + difference * (fraction ** 3 - fraction ** 4 / 2));
}

export function formatCounter(value) {
  const [integer, decimal] = Math.max(0, value).toFixed(3).split('.');
  return `${integer.padStart(5, '0')}.${decimal}`;
}

export const counterProvider = { valueAt: temporalValue, rateAt: temporalRate };