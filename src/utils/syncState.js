const sortCreatives = (creatives) => [...creatives].sort((left, right) => {
  const leftScore = (left.score || 0) + (left.ROAS || 0) + (left.CTR || 0);
  const rightScore = (right.score || 0) + (right.ROAS || 0) + (right.CTR || 0);
  return rightScore - leftScore;
});

export const mergeSyncedCampaignsByPlatform = (existingCampaigns, syncedCampaigns, customCampaigns, source) => {
  const sourcesToReplace = source === 'all' ? ['meta', 'google'] : [source];
  const sourceSet = new Set(sourcesToReplace);

  const preservedExisting = existingCampaigns.filter((campaign) => {
    const isManual = String(campaign.id || '').startsWith('manual_');
    return isManual || !sourceSet.has(campaign.platform);
  });

  const nextMap = new Map();
  [...preservedExisting, ...syncedCampaigns, ...customCampaigns].forEach((campaign) => {
    nextMap.set(campaign.id, campaign);
  });

  return [...nextMap.values()];
};

export const mergeSyncedCreativesByPlatform = (existingCreatives, syncedCreatives, customCreatives, source) => {
  const sourcesToReplace = source === 'all' ? ['meta', 'google'] : [source];
  const sourceSet = new Set(sourcesToReplace);

  const preservedExisting = existingCreatives.filter((creative) => {
    if (creative.origin === 'uploaded') {
      return true;
    }

    return !sourceSet.has(creative.platform);
  });

  const nextMap = new Map();
  [...preservedExisting, ...syncedCreatives, ...customCreatives].forEach((creative) => {
    nextMap.set(creative.id, creative);
  });

  return sortCreatives([...nextMap.values()]);
};
