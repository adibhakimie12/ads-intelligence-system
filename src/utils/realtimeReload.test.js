import test from 'node:test';
import assert from 'node:assert/strict';
import { createDebouncedReloader } from './realtimeReload.js';

test('coalesces multiple realtime events into one reload', async () => {
  let calls = 0;
  const reload = createDebouncedReloader(() => {
    calls += 1;
    return Promise.resolve();
  }, 10);

  reload();
  reload();
  reload();

  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.equal(calls, 1);
});

test('runs again after the debounce window', async () => {
  let calls = 0;
  const reload = createDebouncedReloader(() => {
    calls += 1;
    return Promise.resolve();
  }, 10);

  reload();
  await new Promise((resolve) => setTimeout(resolve, 30));
  reload();
  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.equal(calls, 2);
});