const inferPlatform = (campaignName = '') => {
  const lowered = campaignName.toLowerCase();
  if (lowered.includes('meta')) return 'meta';
  if (lowered.includes('google')) return 'google';
  return undefined;
};

export const generateInsightsFromCampaigns = (campaigns) => {
  const insights = [];

  campaigns.forEach((campaign) => {
    const platform = inferPlatform(campaign.campaignName);

    if (campaign.ctr < 1.0) {
      insights.push({
        type: 'creative',
        severity: 'attention',
        message: `Change creative for ${campaign.campaignName}`,
        reasoning: `CTR is ${campaign.ctr}%, indicating weak creative hook`,
        priority: 'high',
        action: `Change creative for ${campaign.campaignName}`,
        actionLabel: 'Improve Creative',
        platform,
        campaignExternalId: campaign.campaignId,
        campaignName: campaign.campaignName,
      });
    }

    if (campaign.cpm > 25) {
      insights.push({
        type: 'ads',
        severity: 'efficiency',
        message: `Adjust audience for ${campaign.campaignName}`,
        reasoning: `CPM is above $25 benchmark, suggesting audience mismatch or high competition`,
        priority: 'medium',
        action: `Adjust audience for ${campaign.campaignName}`,
        actionLabel: 'Adjust Audience',
        platform,
        campaignExternalId: campaign.campaignId,
        campaignName: campaign.campaignName,
      });
    }

    if (campaign.roas > 3.0) {
      insights.push({
        type: 'sales',
        severity: 'performance',
        message: `Scale campaign: ${campaign.campaignName}`,
        reasoning: `ROAS is ${campaign.roas}x (above target threshold), indicating campaign is highly scalable`,
        priority: 'high',
        action: `Scale campaign: ${campaign.campaignName}`,
        actionLabel: 'Scale Budget',
        platform,
        campaignExternalId: campaign.campaignId,
        campaignName: campaign.campaignName,
      });
    }

    if (campaign.roas < 1.5) {
      insights.push({
        type: 'ads',
        severity: 'attention',
        message: `Pause campaign: ${campaign.campaignName}`,
        reasoning: `ROAS is ${campaign.roas}x, which is below breakeven threshold. Immediate action required.`,
        priority: 'high',
        action: `Pause campaign: ${campaign.campaignName}`,
        actionLabel: 'Pause Campaign',
        platform,
        campaignExternalId: campaign.campaignId,
        campaignName: campaign.campaignName,
      });
    }
  });

  return insights;
};
