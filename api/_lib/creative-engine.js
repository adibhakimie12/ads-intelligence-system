const CTA_KEYWORDS = ['shop', 'buy', 'book', 'claim', 'learn', 'register', 'download', 'whatsapp', 'message', 'sign up'];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const inferMediaType = (name, fallback = 'image') => {
  const lowered = String(name || '').toLowerCase();
  if (/(video|reel|story|ugc|clip)/i.test(lowered)) return 'video';
  if (/(image|banner|catalog|static|display)/i.test(lowered)) return 'image';
  return fallback;
};

const inferHookType = (name) => {
  const lowered = String(name || '').toLowerCase();
  if (/\?|how\b|why\b|what\b/.test(lowered)) return 'Question';
  if (/save|boost|grow|scale|win|best/.test(lowered)) return 'Benefit';
  if (/today|now|last chance|limited|deadline/.test(lowered)) return 'Urgency';
  if (/sale|discount|promo|free|bundle/.test(lowered)) return 'Offer';
  return 'Direct';
};

const analyzeCreative = ({ creativeName, campaignName, platform, mediaType, ctr = 0, roas = 0, spend = 0 }) => {
  const lowered = String(creativeName || '').toLowerCase();
  const hasPerformanceSignal = spend > 0 || ctr > 0 || roas > 0;
  const hookKeywordBonus = /(stop|secret|before|after|mistake|why|how|sale|save|hook|boost|free)/i.test(lowered) ? 8 : 0;
  const ctaKeywordBonus = CTA_KEYWORDS.some((keyword) => lowered.includes(keyword)) ? 18 : 0;
  const mediaBonus = mediaType === 'video' ? 6 : 0;

  const hookStrength = clamp(38 + (ctr * 24) + hookKeywordBonus + mediaBonus, 18, 98);
  const messageClarity = clamp(40 + (roas * 12) + (ctr * 10) + (campaignName ? 6 : 0), 20, 97);
  const ctaPresence = clamp(34 + (roas * 9) + ctaKeywordBonus, 18, 99);

  let fatigue = 'low';
  if ((spend > 1800 && ctr < 1.1) || (spend > 2500 && roas < 1.5)) {
    fatigue = 'high';
  } else if ((spend > 900 && ctr < 1.5) || (spend > 1500 && roas < 2)) {
    fatigue = 'medium';
  }

  const score = Math.round((hookStrength + messageClarity + ctaPresence) / 3);

  let status = 'TESTING';
  if (fatigue === 'high' || (roas > 0 && roas < 1)) {
    status = 'KILL';
  } else if (score >= 80 && ctr >= 1.5 && roas >= 2) {
    status = 'WINNING';
  } else if (hasPerformanceSignal && (fatigue === 'medium' || ctr < 1)) {
    status = 'FATIGUE DETECTED';
  } else if (score < 55 && roas <= 1.2) {
    status = 'COLD TEST';
  }

  const suggestions = [];
  if (hookStrength < 60) suggestions.push('Lead harder in the first seconds with the offer, pain point, or pattern interrupt.');
  if (messageClarity < 65) suggestions.push('Simplify the message so the promise is obvious immediately.');
  if (ctaPresence < 65) suggestions.push('Add a more explicit CTA so viewers know the next action.');
  if (fatigue !== 'low') suggestions.push('Test a fresh angle or opening to reduce fatigue.');
  if (platform === 'meta' && mediaType === 'video') suggestions.push('Meta video assets should front-load branding and the offer.');
  if (platform === 'google' && mediaType === 'image') suggestions.push('Google image assets should stay visually simple and headline-led.');
  if (suggestions.length === 0) suggestions.push('Healthy creative signal. Keep monitoring before broadening spend.');

  const summary = status === 'WINNING'
    ? 'Strong creative signal with good engagement and conversion intent.'
    : status === 'KILL'
      ? 'Weak economics suggest this creative should be replaced or heavily reworked.'
      : status === 'FATIGUE DETECTED'
        ? 'Performance is slipping and a fresh angle is recommended.'
        : 'This creative still needs more testing before it is ready to scale.';

  return {
    hookType: inferHookType(creativeName),
    score,
    status,
    hookStrength,
    messageClarity,
    ctaPresence,
    fatigue,
    suggestions,
    summary,
  };
};

export const buildCreativeSnapshotsFromCampaigns = (workspaceId, campaigns, platform, snapshotDate) =>
  campaigns.map((campaign) => {
    const mediaType = inferMediaType(campaign.campaignName, platform === 'meta' ? 'video' : 'image');
    const analysis = analyzeCreative({
      creativeName: campaign.campaignName,
      campaignName: campaign.campaignName,
      platform,
      mediaType,
      ctr: campaign.ctr,
      roas: campaign.roas,
      spend: campaign.spend,
    });

    return {
      workspace_id: workspaceId,
      source_platform: platform,
      origin: 'synced',
      creative_name: campaign.campaignName,
      campaign_name: campaign.campaignName,
      campaign_external_id: campaign.campaignId,
      creative_external_id: `${platform}_${campaign.campaignId}`,
      media_type: mediaType,
      hook_type: analysis.hookType,
      status: analysis.status,
      score: analysis.score,
      ctr: campaign.ctr,
      link_ctr: campaign.linkCtr ?? null,
      roas: campaign.roas,
      spend: campaign.spend,
      impressions: campaign.impressions ?? null,
      link_clicks: campaign.linkClicks ?? null,
      cost_per_link_click: campaign.costPerLinkClick ?? null,
      cost_per_result: campaign.costPerResult ?? null,
      target_cpl: campaign.targetCpl ?? null,
      max_cpl: campaign.maxCpl ?? null,
      hook_rate: campaign.hookRate ?? null,
      video_views_3s: campaign.videoViews3s ?? null,
      video_views_25: campaign.videoViews25 ?? null,
      video_views_50: campaign.videoViews50 ?? null,
      video_views_75: campaign.videoViews75 ?? null,
      hook_strength: analysis.hookStrength,
      message_clarity: analysis.messageClarity,
      cta_presence: analysis.ctaPresence,
      fatigue: analysis.fatigue,
      analysis_summary: analysis.summary,
      ai_verdict: analysis.summary,
      suggestions: analysis.suggestions,
      snapshot_date: snapshotDate,
    };
  });

export const buildCreativeSnapshotsFromAds = (workspaceId, ads, platform, snapshotDate) =>
  ads.map((ad) => {
    const analysis = analyzeCreative({
      creativeName: ad.creativeName,
      campaignName: ad.campaignName,
      platform,
      mediaType: ad.mediaType,
      ctr: ad.ctr,
      roas: 0,
      spend: ad.spend,
    });

    return {
      workspace_id: workspaceId,
      source_platform: platform,
      origin: 'synced',
      creative_name: ad.creativeName,
      campaign_name: ad.campaignName,
      campaign_external_id: ad.campaignId,
      adset_name: ad.adsetName,
      ad_name: ad.adName,
      creative_external_id: ad.creativeId || `${platform}_${ad.adId}`,
      media_type: ad.mediaType,
      preview_url: ad.previewUrl,
      thumbnail_url: ad.thumbnailUrl,
      hook_type: analysis.hookType,
      status: analysis.status,
      score: analysis.score,
      ctr: ad.ctr,
      link_ctr: ad.linkCtr ?? null,
      roas: 0,
      spend: ad.spend,
      impressions: ad.impressions ?? null,
      link_clicks: ad.linkClicks ?? null,
      cost_per_link_click: ad.costPerLinkClick ?? null,
      cost_per_result: ad.costPerResult ?? null,
      target_cpl: null,
      max_cpl: null,
      hook_rate: ad.hookRate ?? null,
      video_views_3s: ad.videoViews3s ?? null,
      video_views_25: ad.videoViews25 ?? null,
      video_views_50: ad.videoViews50 ?? null,
      video_views_75: ad.videoViews75 ?? null,
      hook_strength: analysis.hookStrength,
      message_clarity: analysis.messageClarity,
      cta_presence: analysis.ctaPresence,
      fatigue: analysis.fatigue,
      analysis_summary: ad.existingPostId
        ? `${analysis.summary} This ad is linked to an existing Meta post (${ad.existingPostId}).`
        : analysis.summary,
      ai_verdict: analysis.summary,
      suggestions: analysis.suggestions,
      snapshot_date: snapshotDate,
    };
  });
