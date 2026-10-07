import test from 'node:test';
import assert from 'node:assert/strict';
import { EPOCH, temporalRate, temporalValue, formatCounter } from '../src/lib/counter.mjs';

test('the epoch has the authored display format', () => {
  assert.equal(formatCounter(temporalValue(EPOCH)), '00381.627');
});

test('absolute-time values are reproducible and always increase', () => {
  let previous = temporalValue(EPOCH);
  for (let offset = 100; offset <= 600000; offset += 100) {
    const timestamp = EPOCH + offset;
    const value = temporalValue(timestamp);
    assert.ok(value > previous);
    assert.equal(value, temporalValue(timestamp));
    previous = value;
  }
});

test('the rate drifts smoothly between slow and fast phases', () => {
  const rates = Array.from({ length: 720 }, (_, index) => temporalRate(EPOCH + index * 120000));
  assert.ok(Math.min(...rates) < 0.0001);
  assert.ok(Math.max(...rates) > 0.004);
  assert.ok(Math.abs(temporalRate(EPOCH + 1000) - temporalRate(EPOCH)) < 0.0001);
});

test('the integrated value matches the rate through phase boundaries', () => {
  for (const offset of [-120000, -1, 0, 60000, 119999, 120000, 240000]) {
    const timestamp = EPOCH + offset;
    const measuredRate = (temporalValue(timestamp + 1) - temporalValue(timestamp - 1)) / 0.002;
    assert.ok(Math.abs(measuredRate - temporalRate(timestamp)) < 0.000001);
  }
});