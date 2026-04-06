import { fetchGoogleAdsData } from './_lib/ads.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = await fetchGoogleAdsData();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in /api/google-ads:', error);
    return res.status(500).json({ error: 'Failed to sync Google Ads Data' });
  }
}
