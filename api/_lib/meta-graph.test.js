import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchMetaCampaignInsights } from './meta-graph.js';

const jsonResponse = (payload, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => payload,
});

test('fetchMetaCampaignInsights aggregates paginated campaigns and insights', async () => {
  const originalFetch = global.fetch;

  const calls = [];
  global.fetch = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url.includes('/campaigns?page=2')) {
      return jsonResponse({
        data: [
          { id: 'c_2', name: 'Campaign 2', status: 'ACTIVE' },
        ],
      });
    }

    if (url.includes('/campaigns?')) {
      return jsonResponse({
        data: [
          { id: 'c_1', name: 'Campaign 1', status: 'ACTIVE' },
        ],
        paging: {
          next: 'https://graph.facebook.com/v19.0/act_123/campaigns?page=2',
        },
      });
    }

    if (url.includes('/insights?page=2') && url.includes('date_preset=today')) {
      return jsonResponse({
        data: [
          { campaign_id: 'c_2', spend: '8.19', ctr: '1.0', cpm: '7.0' },
        ],
      });
    }

    if (url.includes('/insights?') && url.includes('date_preset=today')) {
      return jsonResponse({
        data: [
          { campaign_id: 'c_1', spend: '5.50', ctr: '1.2', cpm: '8.5' },
        ],
        paging: {
          next: 'https://graph.facebook.com/v19.0/act_123/insights?page=2&date_preset=today',
        },
      });
    }

    throw new Error(`Unhandled fetch URL in test: ${url}`);
  };

  try {
    const campaigns = await fetchMetaCampaignInsights('token_abc', '123');

    assert.equal(campaigns.length, 2);
    assert.equal(campaigns[0].campaignId, 'c_1');
    assert.equal(campaigns[1].campaignId, 'c_2');
    assert.equal(campaigns.reduce((sum, campaign) => sum + campaign.spend, 0), 13.69);
    assert.ok(calls.some((url) => url.includes('/campaigns?page=2')));
    assert.ok(calls.some((url) => url.includes('/insights?page=2') && url.includes('date_preset=today')));
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchMetaCampaignInsights falls back to last_7d only when today has no data', async () => {
  const originalFetch = global.fetch;

  const calls = [];
  global.fetch = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url.includes('/campaigns?')) {
      return jsonResponse({
        data: [{ id: 'c_1', name: 'Campaign 1', status: 'ACTIVE' }],
      });
    }

    if (url.includes('/insights?') && url.includes('date_preset=today')) {
      return jsonResponse({ data: [] });
    }

    if (url.includes('/insights?') && url.includes('date_preset=last_7d')) {
      return jsonResponse({
        data: [{ campaign_id: 'c_1', spend: '9.18', ctr: '1.0', cpm: '9.0' }],
      });
    }

    throw new Error(`Unhandled fetch URL in test: ${url}`);
  };

  try {
    const campaigns = await fetchMetaCampaignInsights('token_abc', '123');
    assert.equal(campaigns.length, 1);
    assert.equal(campaigns[0].spend, 9.18);

    const todayCallIndex = calls.findIndex((url) => url.includes('date_preset=today'));
    const last7dCallIndex = calls.findIndex((url) => url.includes('date_preset=last_7d'));
    assert.notEqual(todayCallIndex, -1);
    assert.notEqual(last7dCallIndex, -1);
    assert.ok(todayCallIndex < last7dCallIndex);
  } finally {
    global.fetch = originalFetch;
  }
});
