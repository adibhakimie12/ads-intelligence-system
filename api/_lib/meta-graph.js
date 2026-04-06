const META_GRAPH_BASE_URL = 'https://graph.facebook.com';
const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';

const fetchMetaGraph = async (path, accessToken) => {
  const url = new URL(`${META_GRAPH_BASE_URL}/${META_API_VERSION}/${path}`);
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || 'Meta Graph API request failed.');
  }

  return payload;
};

export const fetchMetaProfile = async (accessToken) => {
  const payload = await fetchMetaGraph('me?fields=id,name', accessToken);
  return {
    id: payload.id || null,
    name: payload.name || null,
  };
};

export const fetchMetaAdAccounts = async (accessToken) => {
  const payload = await fetchMetaGraph('me/adaccounts?fields=id,name,account_status,currency', accessToken);
  return (payload.data || []).map((account) => ({
    id: account.id,
    name: account.name,
    status: account.account_status ?? null,
    currency: account.currency ?? null,
  }));
};

export const fetchMetaCampaignInsights = async (accessToken, adAccountId) => {
  const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const path = `${cleanAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,insights.date_preset(last_7d){spend,ctr,cpm,impressions,reach,inline_link_click_ctr,inline_link_clicks,cpc,purchase_roas,actions,video_3_sec_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions}`;
  const payload = await fetchMetaGraph(path, accessToken);

  return (payload.data || []).map((campaign) => {
    const item = campaign.insights?.data?.[0] || {};
    const purchases = item.actions
      ? item.actions.find((action) => action.action_type === 'purchase')?.value
      : 0;
    const roas = item.purchase_roas?.[0]?.value || 0;
    const budget = Number.parseFloat(campaign.daily_budget || campaign.lifetime_budget || '0');
    const impressions = Number.parseFloat(item.impressions || '0');
    const reach = Number.parseFloat(item.reach || '0');
    const videoViews3s = Number.parseFloat(item.video_3_sec_watched_actions?.[0]?.value || '0');
    const videoViews25 = Number.parseFloat(item.video_p25_watched_actions?.[0]?.value || '0');
    const videoViews50 = Number.parseFloat(item.video_p50_watched_actions?.[0]?.value || '0');
    const videoViews75 = Number.parseFloat(item.video_p75_watched_actions?.[0]?.value || '0');
    const rate75VV = videoViews25 > 0 ? videoViews75 / videoViews25 : null;
    const status = String(campaign.status || '').toUpperCase();
    const delivery = status === 'ACTIVE' ? 'Active' : status === 'PAUSED' ? 'Paused' : status || 'Unknown';

    return {
      campaignId: campaign.id || item.campaign_id || campaign.name,
      campaignName: campaign.name || item.campaign_name || 'Unnamed Campaign',
      delivery,
      resultsLabel: 'Results',
      budget,
      spend: Number.parseFloat(item.spend || '0'),
      ctr: Number.parseFloat(item.ctr || '0'),
      linkCtr: Number.parseFloat(item.inline_link_click_ctr || '0'),
      linkClicks: Number.parseFloat(item.inline_link_clicks || '0'),
      costPerLinkClick: Number.parseFloat(item.cpc || '0'),
      cpm: Number.parseFloat(item.cpm || '0'),
      reach,
      impressions,
      roas: Number.parseFloat(roas || '0'),
      conversions: Number.parseInt(purchases || '0', 10),
      costPerResult: Number.parseInt(purchases || '0', 10) > 0
        ? Number.parseFloat(item.spend || '0') / Number.parseInt(purchases || '0', 10)
        : null,
      hookRate: impressions > 0 ? videoViews3s / impressions : null,
      videoViews3s,
      videoViews25,
      videoViews50,
      videoViews75,
      rate75VV,
    };
  });
};
