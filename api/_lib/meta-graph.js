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
  }));
};

export const fetchMetaCampaignInsights = async (accessToken, adAccountId) => {
  const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const path = `${cleanAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,insights.date_preset(last_7d){spend,ctr,cpm,impressions,reach,inline_link_click_ctr,inline_link_clicks,cpc,purchase_roas,actions,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions}`;
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

const parseActionsValue = (actions = [], allowedTypes = []) => {
  if (!Array.isArray(actions) || actions.length === 0) return 0;
  const matched = actions.find((action) => allowedTypes.includes(action.action_type));
  return Number.parseFloat(matched?.value || '0');
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

export const fetchMetaAdCreatives = async (accessToken, adAccountId) => {
  const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const path = `${cleanAccountId}/ads?fields=id,name,status,adset{id,name},campaign{id,name},creative{id,name,effective_object_story_id,object_story_id,image_url,thumbnail_url,object_type,object_story_spec{link_data{picture},photo_data{image_url},video_data{image_url,video_id},template_data{picture}}},insights.date_preset(last_7d){spend,ctr,cpm,impressions,reach,inline_link_click_ctr,inline_link_clicks,cpc,actions,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions}`;
  const payload = await fetchMetaGraph(path, accessToken);
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
    const item = ad.insights?.data?.[0] || {};
    const impressions = Number.parseFloat(item.impressions || '0');
    const spend = Number.parseFloat(item.spend || '0');
    const linkClicks = Number.parseFloat(item.inline_link_clicks || '0');
    const videoViews3s = Number.parseFloat(item.video_play_actions?.[0]?.value || '0');
    const videoViews25 = Number.parseFloat(item.video_p25_watched_actions?.[0]?.value || '0');
    const videoViews50 = Number.parseFloat(item.video_p50_watched_actions?.[0]?.value || '0');
    const videoViews75 = Number.parseFloat(item.video_p75_watched_actions?.[0]?.value || '0');
    const rate75VV = videoViews25 > 0 ? videoViews75 / videoViews25 : null;
    const resultCount = parseActionsValue(item.actions, [
      'onsite_conversion.messaging_conversation_started_7d',
      'onsite_conversion.messaging_first_reply',
      'lead',
      'omni_lead',
      'purchase',
    ]);
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
