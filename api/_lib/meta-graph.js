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

const fetchMetaGraphByUrl = async (urlString, accessToken) => {
  const url = new URL(urlString);
  if (!url.searchParams.get('access_token')) {
    url.searchParams.set('access_token', accessToken);
  }

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || 'Meta Graph API request failed.');
  }

  return payload;
};

const fetchMetaGraphPaginated = async (path, accessToken, maxPages = 20) => {
  const firstPage = await fetchMetaGraph(path, accessToken);
  const initialRows = Array.isArray(firstPage.data) ? firstPage.data : [];

  let rows = [...initialRows];
  let nextUrl = firstPage.paging?.next || null;
  let pageCount = 1;

  while (nextUrl && pageCount < maxPages) {
    const nextPage = await fetchMetaGraphByUrl(nextUrl, accessToken);
    const pageRows = Array.isArray(nextPage.data) ? nextPage.data : [];
    rows = rows.concat(pageRows);
    nextUrl = nextPage.paging?.next || null;
    pageCount += 1;
  }

  return {
    ...firstPage,
    data: rows,
  };
};

const pickFirstUrl = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0) || null;

const isVideoLikeValue = (value) => /video|reel|clip|movie/.test(String(value || '').toLowerCase());

const extractMediaFromAttachment = (attachment) => {
  if (!attachment) {
    return null;
  }

  const subattachments = attachment.subattachments?.data || [];
  for (const subattachment of subattachments) {
    const extracted = extractMediaFromAttachment(subattachment);
    if (extracted?.previewUrl || extracted?.thumbnailUrl) {
      return extracted;
    }
  }

  const attachmentKind = `${attachment.type || ''} ${attachment.media_type || ''}`;
  const isVideo = isVideoLikeValue(attachmentKind);
  const mediaImageUrl = pickFirstUrl(
    attachment.media?.image?.src,
    attachment.media?.image?.uri,
    attachment.picture
  );
  const mediaSourceUrl = pickFirstUrl(
    attachment.media?.source,
    attachment.source,
    attachment.unshimmed_url
  );

  if (isVideo) {
    return {
      mediaType: 'video',
      previewUrl: mediaSourceUrl,
      thumbnailUrl: mediaImageUrl,
    };
  }

  return {
    mediaType: 'image',
    previewUrl: pickFirstUrl(mediaImageUrl, attachment.url, attachment.unshimmed_url),
    thumbnailUrl: pickFirstUrl(mediaImageUrl, attachment.url, attachment.unshimmed_url),
  };
};

const extractMediaFromStorySpec = (storySpec = {}) => {
  const videoData = storySpec.video_data || {};
  const photoData = storySpec.photo_data || {};
  const linkData = storySpec.link_data || {};
  const templateData = storySpec.template_data || {};

  const videoId = videoData.video_id || null;
  const videoPoster = pickFirstUrl(videoData.image_url);
  const imagePreview = pickFirstUrl(
    photoData.image_url,
    linkData.picture,
    templateData.picture
  );

  if (videoId) {
    return {
      mediaType: 'video',
      videoId,
      previewUrl: null,
      thumbnailUrl: videoPoster,
    };
  }

  if (imagePreview) {
    return {
      mediaType: 'image',
      videoId: null,
      previewUrl: imagePreview,
      thumbnailUrl: imagePreview,
    };
  }

  return null;
};

const fetchMetaPostMedia = async (accessToken, storyId) => {
  try {
    const payload = await fetchMetaGraph(
      `${storyId}?fields=source,picture,full_picture,attachments{media,type,media_type,url,unshimmed_url,source,picture,subattachments{media,type,media_type,url,unshimmed_url,source,picture}}`,
      accessToken
    );
    const attachmentMedia = extractMediaFromAttachment(payload.attachments?.data?.[0]);
    const fallbackImage = pickFirstUrl(payload.full_picture, payload.picture);
    const postSource = pickFirstUrl(payload.source);
    const mediaType = postSource ? 'video' : (attachmentMedia?.mediaType || 'image');

    return {
      mediaType,
      previewUrl: postSource || attachmentMedia?.previewUrl || fallbackImage,
      thumbnailUrl: attachmentMedia?.thumbnailUrl || fallbackImage,
    };
  } catch {
    return null;
  }
};

const fetchMetaVideoSource = async (accessToken, videoId) => {
  if (!videoId) {
    return null;
  }

  try {
    const payload = await fetchMetaGraph(`${videoId}?fields=source,picture`, accessToken);
    return {
      previewUrl: pickFirstUrl(payload.source),
      thumbnailUrl: pickFirstUrl(payload.picture),
    };
  } catch {
    return null;
  }
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
    availableFunds: null,
    amountSpent: null,
    dailySpendingLimit: null,
  }));
};

export const fetchMetaAdAccountBilling = async (accessToken, adAccountId) => {
  const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const payload = await fetchMetaGraph(`${cleanAccountId}?fields=id,name,account_status,currency,balance,amount_spent,spend_cap`, accessToken);

  return {
    id: payload.id,
    name: payload.name,
    status: payload.account_status ?? null,
    currency: payload.currency ?? null,
    availableFunds: payload.balance != null ? Number(payload.balance) / 100 : null,
    amountSpent: payload.amount_spent != null ? Number(payload.amount_spent) / 100 : null,
    dailySpendingLimit: payload.spend_cap != null ? Number(payload.spend_cap) / 100 : null,
  };
};

const parseActionsValue = (actions = [], allowedTypes = []) => {
  if (!Array.isArray(actions) || actions.length === 0) return 0;
  const matched = actions.find((action) => allowedTypes.includes(action.action_type));
  return Number.parseFloat(matched?.value || '0');
};

const META_RESULT_ACTION_TYPES = [
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.messaging_first_reply',
  'onsite_conversion.total_messaging_connection',
  'lead',
  'omni_lead',
  'purchase',
];

const normalizeFieldData = (fieldData = []) => {
  if (!Array.isArray(fieldData)) {
    return {};
  }

  return fieldData.reduce((accumulator, item) => {
    const key = String(item?.name || '').trim().toLowerCase();
    if (!key) {
      return accumulator;
    }

    const values = Array.isArray(item?.values) ? item.values.filter(Boolean) : [];
    if (values.length > 0) {
      accumulator[key] = values.join(', ');
    }

    return accumulator;
  }, {});
};

const resolveDailyPresetDate = (datePreset) => {
  const now = new Date();
  if (datePreset === 'yesterday') {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().slice(0, 10);
};

const buildInsightsTimeQuery = (datePreset) => {
  if (datePreset === 'today' || datePreset === 'yesterday' || datePreset === 'last_7d' || datePreset === 'last_30d' || datePreset === 'maximum') {
    return `date_preset=${datePreset}`;
  }
  return 'date_preset=today';
};

export const fetchMetaCampaignInsights = async (accessToken, adAccountId, datePreset = 'today') => {
  const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const campaignPayload = await fetchMetaGraphPaginated(
    `${cleanAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget`,
    accessToken
  );
  const insightFields = 'campaign_id,campaign_name,spend,ctr,cpm,impressions,reach,inline_link_click_ctr,inline_link_clicks,cpc,purchase_roas,actions,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions';
  const timeQuery = buildInsightsTimeQuery(datePreset);
  let insightsPayload = await fetchMetaGraphPaginated(
    `${cleanAccountId}/insights?level=campaign&${timeQuery}&fields=${insightFields}`,
    accessToken
  );

  if (datePreset === 'today' && (!Array.isArray(insightsPayload.data) || insightsPayload.data.length === 0)) {
    insightsPayload = await fetchMetaGraphPaginated(
      `${cleanAccountId}/insights?level=campaign&date_preset=last_7d&fields=${insightFields}`,
      accessToken
    );
  }

  const insightMap = new Map((insightsPayload.data || []).map((item) => [item.campaign_id, item]));

  return (campaignPayload.data || []).map((campaign) => {
    const item = insightMap.get(campaign.id) || {};
    const results = parseActionsValue(item.actions, META_RESULT_ACTION_TYPES);
    const roas = item.purchase_roas?.[0]?.value || 0;
    const budget = Number.parseFloat(campaign.daily_budget || campaign.lifetime_budget || '0');
    const impressions = Number.parseFloat(item.impressions || '0');
    const reach = Number.parseFloat(item.reach || '0');
    const videoViews3s = Number.parseFloat(item.video_play_actions?.[0]?.value || '0');
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
      resultsLabel: results > 0 ? 'Messaging conversations' : 'Results',
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
      conversions: Number.parseInt(results || '0', 10),
      costPerResult: Number.parseInt(results || '0', 10) > 0
        ? Number.parseFloat(item.spend || '0') / Number.parseInt(results || '0', 10)
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

const inferCreativeMediaType = ({ creative = {}, adName = '', videoViews25 = 0, videoViews3s = 0 }) => {
  const objectType = String(creative.object_type || '').toLowerCase();
  const creativeName = String(creative.name || '').toLowerCase();
  const normalizedAdName = String(adName || '').toLowerCase();

  if (objectType.includes('video')) return 'video';
  if (videoViews25 > 0 || videoViews3s > 0) return 'video';
  if (/(video|reel|story|clip|ugc)/i.test(creativeName) || /(video|reel|story|clip|ugc)/i.test(normalizedAdName)) {
    return 'video';
  }
  return 'image';
};

export const fetchMetaAdCreatives = async (accessToken, adAccountId, datePreset = 'today') => {
  const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const payload = await fetchMetaGraphPaginated(
    `${cleanAccountId}/ads?fields=id,name,status,adset{id,name},campaign{id,name},creative{id,name,effective_object_story_id,object_story_id,image_url,thumbnail_url,object_type,object_story_spec{link_data{picture},photo_data{image_url},video_data{image_url,video_id},template_data{picture}}}`,
    accessToken
  );
  const insightFields = 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend,ctr,cpm,impressions,reach,inline_link_click_ctr,inline_link_clicks,cpc,actions,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions';
  const timeQuery = buildInsightsTimeQuery(datePreset);
  let adInsightsPayload = await fetchMetaGraphPaginated(
    `${cleanAccountId}/insights?level=ad&${timeQuery}&fields=${insightFields}`,
    accessToken
  );

  if (datePreset === 'today' && (!Array.isArray(adInsightsPayload.data) || adInsightsPayload.data.length === 0)) {
    adInsightsPayload = await fetchMetaGraphPaginated(
      `${cleanAccountId}/insights?level=ad&date_preset=last_7d&fields=${insightFields}`,
      accessToken
    );
  }

  const insightMap = new Map((adInsightsPayload.data || []).map((item) => [item.ad_id, item]));
  const postMediaCache = new Map();
  const videoMediaCache = new Map();

  const resolvePostMedia = async (storyId) => {
    if (!storyId) return null;
    if (!postMediaCache.has(storyId)) {
      postMediaCache.set(storyId, fetchMetaPostMedia(accessToken, storyId));
    }
    return postMediaCache.get(storyId);
  };

  const resolveVideoSource = async (videoId) => {
    if (!videoId) return null;
    if (!videoMediaCache.has(videoId)) {
      videoMediaCache.set(videoId, fetchMetaVideoSource(accessToken, videoId));
    }
    return videoMediaCache.get(videoId);
  };

  return Promise.all((payload.data || []).map(async (ad) => {
    const creative = ad.creative || {};
    const item = insightMap.get(ad.id) || {};
    const impressions = Number.parseFloat(item.impressions || '0');
    const spend = Number.parseFloat(item.spend || '0');
    const linkClicks = Number.parseFloat(item.inline_link_clicks || '0');
    const videoViews3s = Number.parseFloat(item.video_play_actions?.[0]?.value || '0');
    const videoViews25 = Number.parseFloat(item.video_p25_watched_actions?.[0]?.value || '0');
    const videoViews50 = Number.parseFloat(item.video_p50_watched_actions?.[0]?.value || '0');
    const videoViews75 = Number.parseFloat(item.video_p75_watched_actions?.[0]?.value || '0');
    const rate75VV = videoViews25 > 0 ? videoViews75 / videoViews25 : null;
    const resultCount = parseActionsValue(item.actions, META_RESULT_ACTION_TYPES);
    const existingPostId = creative.effective_object_story_id || creative.object_story_id || null;
    const mediaFromStorySpec = extractMediaFromStorySpec(creative.object_story_spec || {});
    const mediaFromPost = existingPostId ? await resolvePostMedia(existingPostId) : null;
    const mediaFromVideo = mediaFromStorySpec?.videoId ? await resolveVideoSource(mediaFromStorySpec.videoId) : null;
    const mediaType = mediaFromPost?.mediaType
      || mediaFromStorySpec?.mediaType
      || inferCreativeMediaType({ creative, adName: ad.name, videoViews25, videoViews3s });
    const previewUrl = pickFirstUrl(
      mediaFromVideo?.previewUrl,
      mediaFromPost?.previewUrl,
      mediaFromStorySpec?.previewUrl,
      creative.image_url,
      creative.thumbnail_url
    );
    const thumbnailUrl = pickFirstUrl(
      mediaFromVideo?.thumbnailUrl,
      mediaFromPost?.thumbnailUrl,
      mediaFromStorySpec?.thumbnailUrl,
      creative.thumbnail_url,
      creative.image_url
    );

    return {
      adId: ad.id,
      adName: ad.name || creative.name || 'Unnamed Ad',
      delivery: String(ad.status || '').toUpperCase(),
      campaignId: ad.campaign?.id || null,
      campaignName: ad.campaign?.name || 'Unnamed Campaign',
      adsetId: ad.adset?.id || null,
      adsetName: ad.adset?.name || null,
      creativeId: creative.id || ad.id,
      creativeName: creative.name || ad.name || ad.campaign?.name || 'Unnamed Creative',
      existingPostId,
      previewUrl,
      thumbnailUrl,
      mediaType,
      spend,
      ctr: Number.parseFloat(item.ctr || '0'),
      linkCtr: Number.parseFloat(item.inline_link_click_ctr || '0'),
      linkClicks,
      costPerLinkClick: Number.parseFloat(item.cpc || '0'),
      cpm: Number.parseFloat(item.cpm || '0'),
      reach: Number.parseFloat(item.reach || '0'),
      impressions,
      conversions: resultCount,
      costPerResult: resultCount > 0 ? spend / resultCount : null,
      hookRate: impressions > 0 ? videoViews3s / impressions : null,
      videoViews3s,
      videoViews25,
      videoViews50,
      videoViews75,
      rate75VV,
    };
  }));
};

export { resolveDailyPresetDate };

export const fetchMetaLeadGenForms = async (accessToken, adAccountId) => {
  const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const payload = await fetchMetaGraphPaginated(
    `${cleanAccountId}/leadgen_forms?fields=id,name,status,locale,created_time`,
    accessToken
  );

  return (payload.data || []).map((form) => ({
    id: form.id,
    name: form.name || 'Meta Lead Form',
    status: form.status || 'UNKNOWN',
    locale: form.locale || null,
    createdTime: form.created_time || null,
  }));
};

export const fetchMetaLeadGenLeads = async (accessToken, formId) => {
  const payload = await fetchMetaGraphPaginated(
    `${formId}/leads?fields=id,created_time,ad_id,campaign_name,field_data`,
    accessToken,
    50
  );

  return (payload.data || []).map((lead) => ({
    id: lead.id,
    createdTime: lead.created_time || null,
    adId: lead.ad_id || null,
    adName: null,
    adsetId: null,
    adsetName: null,
    campaignId: null,
    campaignName: lead.campaign_name || null,
    platform: 'meta',
    fields: normalizeFieldData(lead.field_data),
  }));
};
