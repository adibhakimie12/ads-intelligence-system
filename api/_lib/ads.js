const normalizeAdData = (campaign_name, spend, CTR, CPM, ROAS, conversions) => ({
  id: `campaign_${Math.random().toString(36).slice(2, 11)}`,
  campaign_name,
  spend,
  CTR,
  CPM,
  ROAS,
  conversions,
  revenue: spend > 0 ? spend * ROAS : 0,
  date: new Date().toISOString(),
});

export const buildMockMetaAds = () => ([
  normalizeAdData('Meta_Scale_Broad_Q1', 450.5, 2.1, 15.2, 3.8, 12),
  normalizeAdData('Meta_Retargeting_Hot', 120.0, 0.8, 22.5, 1.2, 1),
  normalizeAdData('Meta_Lookalike_Conversion', 550.0, 3.4, 18.0, 4.5, 25),
]);

export const buildMockGoogleAds = () => ([
  normalizeAdData('Google_Search_Branded', 120.0, 12.5, 8.5, 5.2, 35),
  normalizeAdData('Google_PMax_Broad', 800.0, 1.2, 35.0, 2.1, 8),
  normalizeAdData('Google_Display_Cold', 250.0, 0.4, 5.2, 0.8, 0),
]);

export const fetchMetaAdsData = async () => {
  const { META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_API_VERSION } = process.env;

  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
    return buildMockMetaAds();
  }

  const endpoint = `https://graph.facebook.com/${META_API_VERSION || 'v19.0'}/act_${META_AD_ACCOUNT_ID}/insights`;
  const url = new URL(endpoint);
  url.searchParams.append('access_token', META_ACCESS_TOKEN);
  url.searchParams.append('fields', 'campaign_name,spend,ctr,cpm,purchase_roas,actions');
  url.searchParams.append('level', 'campaign');
  url.searchParams.append('date_preset', 'last_7d');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Meta API connection failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.data || []).map((item) => {
    const purchases = item.actions ? item.actions.find((a) => a.action_type === 'purchase')?.value : 0;
    const roas = item.purchase_roas ? item.purchase_roas[0]?.value : 0;

    return normalizeAdData(
      item.campaign_name,
      parseFloat(item.spend || '0'),
      parseFloat(item.ctr || '0'),
      parseFloat(item.cpm || '0'),
      parseFloat(roas || '0'),
      parseInt(purchases || '0', 10)
    );
  });
};

export const fetchGoogleAdsData = async () => {
  const { GOOGLE_DEVELOPER_TOKEN, GOOGLE_CUSTOMER_ID, GOOGLE_REFRESH_TOKEN } = process.env;

  if (!GOOGLE_DEVELOPER_TOKEN || !GOOGLE_CUSTOMER_ID || !GOOGLE_REFRESH_TOKEN) {
    return buildMockGoogleAds();
  }

  return [
    normalizeAdData('Google_Live_Campaign_1', 300, 4.0, 10.0, 2.0, 5),
  ];
};
