import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSyncedCampaignsByPlatform, mergeSyncedCreativesByPlatform } from './syncState.js';

test('replaces only the synced campaign platform while preserving other platforms and manual campaigns', () => {
  const existing = [
    { id: 'meta_old', platform: 'meta', spend: 1.1 },
    { id: 'google_1', platform: 'google', spend: 9.5 },
    { id: 'manual_1', platform: 'meta', spend: 12 },
  ];
  const synced = [{ id: 'meta_new', platform: 'meta', spend: 4.9 }];
  const custom = [{ id: 'manual_1', platform: 'meta', spend: 12 }];

  assert.deepEqual(mergeSyncedCampaignsByPlatform(existing, synced, custom, 'meta'), [
    { id: 'google_1', platform: 'google', spend: 9.5 },
    { id: 'manual_1', platform: 'meta', spend: 12 },
    { id: 'meta_new', platform: 'meta', spend: 4.9 },
  ]);
});

test('replaces only the synced creative platform while preserving uploads and other platforms', () => {
  const existing = [
    { id: 'creative_meta_old', platform: 'meta', origin: 'synced', score: 10, spend: 1.1 },
    { id: 'creative_google', platform: 'google', origin: 'synced', score: 40, spend: 9.5 },
    { id: 'creative_upload', platform: 'meta', origin: 'uploaded', score: 5, spend: 0 },
  ];
  const synced = [{ id: 'creative_meta_new', platform: 'meta', origin: 'synced', score: 20, spend: 4.9 }];
  const custom = [{ id: 'creative_upload', platform: 'meta', origin: 'uploaded', score: 5, spend: 0 }];

  assert.deepEqual(mergeSyncedCreativesByPlatform(existing, synced, custom, 'meta'), [
    { id: 'creative_google', platform: 'google', origin: 'synced', score: 40, spend: 9.5 },
    { id: 'creative_meta_new', platform: 'meta', origin: 'synced', score: 20, spend: 4.9 },
    { id: 'creative_upload', platform: 'meta', origin: 'uploaded', score: 5, spend: 0 },
  ]);
});
