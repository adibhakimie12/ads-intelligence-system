import type { AdsData, CreativeData, LeadData } from '../types';

type CreativeAnalysisInput = {
  creativeName: string;
  platform?: 'meta' | 'google';
  mediaType: 'image' | 'video';
  ctr?: number;
  roas?: number;
  spend?: number;
  campaignName?: string;
  leadCount?: number;
  wonLeadCount?: number;
};

export type WinningAdsVerdict = 'WINNING' | 'ADJUST' | 'KILL' | 'LEARNING';

export type WinningAdsMetricStatus = 'pass' | 'watch' | 'fail' | 'pending';

export type WinningAdsMetric = {
  label: string;
  value?: number;
  benchmark: string;
  status: WinningAdsMetricStatus;
  note?: string;
};

export type WinningAdsEvaluation = {
  verdict: WinningAdsVerdict;
  rationale: string;
  targetCpl: number;
  maxCpl: number;
  costPerResult?: number;
  linkedLeadCount: number;
  posterMetrics: WinningAdsMetric[];
  videoMetrics: WinningAdsMetric[];
};

const CTA_KEYWORDS = ['shop', 'buy', 'book', 'claim', 'learn', 'register', 'download', 'whatsapp', 'message', 'sign up'];
const HOOK_PATTERNS: Array<{ label: string; matches: RegExp[] }> = [
  { label: 'Question', matches: [/\?/, /how\b/i, /why\b/i, /what\b/i] },
  { label: 'Benefit', matches: [/save/i, /boost/i, /grow/i, /scale/i, /win/i, /best/i] },
  { label: 'Urgency', matches: [/today/i, /now/i, /last chance/i, /limited/i, /deadline/i] },
  { label: 'Offer', matches: [/sale/i, /discount/i, /promo/i, /free/i, /bundle/i] },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const defaultMaxCpl = (targetCpl: number) => targetCpl * 1.5;

export const inferCreativeMediaType = (name: string, fallback: 'image' | 'video' = 'image'): 'image' | 'video' => {
  const lowered = name.toLowerCase();
  if (/(video|reel|story|ugc|clip)/i.test(lowered)) {
    return 'video';
  }
  if (/(image|banner|catalog|static|display)/i.test(lowered)) {
    return 'image';
  }
  return fallback;
};

export const inferCreativePlatform = (name: string, campaignName?: string): 'meta' | 'google' => {
  const combined = `${name} ${campaignName || ''}`.toLowerCase();
  return combined.includes('google') ? 'google' : 'meta';
};

export const inferHookType = (name: string): string => {
  const lowered = name.toLowerCase();
  const match = HOOK_PATTERNS.find((candidate) => candidate.matches.some((pattern) => pattern.test(lowered)));
  return match?.label || 'Direct';
};

export const analyzeCreative = (input: CreativeAnalysisInput) => {
  const ctr = input.ctr || 0;
  const roas = input.roas || 0;
  const spend = input.spend || 0;
  const leadCount = input.leadCount || 0;
  const wonLeadCount = input.wonLeadCount || 0;
  const hasPerformanceSignal = spend > 0 || ctr > 0 || roas > 0 || leadCount > 0 || wonLeadCount > 0;
  const lowerName = input.creativeName.toLowerCase();

  const hookKeywordBonus = /(stop|secret|before|after|mistake|why|how|sale|save|hook|boost|free)/i.test(lowerName) ? 8 : 0;
  const ctaKeywordBonus = CTA_KEYWORDS.some((keyword) => lowerName.includes(keyword)) ? 18 : 0;
  const mediaBonus = input.mediaType === 'video' ? 6 : 0;
  const leadBonus = clamp((leadCount * 3) + (wonLeadCount * 8), 0, 18);

  const hookStrength = clamp(38 + (ctr * 24) + hookKeywordBonus + mediaBonus + leadBonus, 18, 98);
  const messageClarity = clamp(40 + (roas * 12) + (ctr * 10) + (input.campaignName ? 6 : 0), 20, 97);
  const ctaPresence = clamp(34 + (roas * 9) + ctaKeywordBonus + (leadCount > 0 ? 8 : 0), 18, 99);

  let fatigue: CreativeData['fatigue'] = 'low';
  if ((spend > 1800 && ctr < 1.1) || (spend > 2500 && roas < 1.5)) {
    fatigue = 'high';
  } else if ((spend > 900 && ctr < 1.5) || (spend > 1500 && roas < 2)) {
    fatigue = 'medium';
  }

  const score = Math.round((hookStrength + messageClarity + ctaPresence) / 3);

  let status: CreativeData['status'] = 'TESTING';
  if (fatigue === 'high' || (roas > 0 && roas < 1)) {
    status = 'KILL';
  } else if (score >= 80 && ctr >= 1.5 && roas >= 2) {
    status = 'WINNING';
  } else if (hasPerformanceSignal && (fatigue === 'medium' || ctr < 1)) {
    status = 'FATIGUE DETECTED';
  } else if (score < 55 && roas <= 1.2) {
    status = 'COLD TEST';
  }

  const suggestions: string[] = [];
  if (hookStrength < 60) suggestions.push('Stronger first-3-second hook needed. Lead with the offer, pain point, or a sharper pattern interrupt.');
  if (messageClarity < 65) suggestions.push('Clarify the promise faster. Reduce competing messages and make the product outcome obvious immediately.');
  if (ctaPresence < 65) suggestions.push('CTA is weak. Add a direct action line like Buy Now, Book Demo, WhatsApp Us, or Claim Offer.');
  if (fatigue !== 'low') suggestions.push('Creative fatigue risk is rising. Test a fresh angle, new opening scene, or alternate headline before scaling further.');
  if (input.platform === 'meta' && input.mediaType === 'video') suggestions.push('For Meta video, front-load branding and the core offer in the first seconds to protect scroll-stop rate.');
  if (input.platform === 'google' && input.mediaType === 'image') suggestions.push('For Google image assets, simplify composition and make the headline readable without relying on small text.');
  if (suggestions.length === 0) suggestions.push('This asset is healthy. Keep monitoring CTR and ROAS before duplicating to a broader audience.');

  const summary = status === 'WINNING'
    ? 'Strong creative signal with healthy hook, message, and conversion intent.'
    : status === 'KILL'
      ? 'This creative is showing weak economics and should be replaced or heavily reworked.'
      : status === 'FATIGUE DETECTED'
        ? 'Performance is slipping and the asset likely needs a fresh angle or new opening.'
        : 'This creative still needs more testing before it is ready to scale.';

  return {
    hookType: inferHookType(input.creativeName),
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

export const evaluateWinningAd = ({
  creative,
  linkedLeads = [],
  targetCpl,
  maxCpl,
}: {
  creative: CreativeData;
  linkedLeads?: LeadData[];
  targetCpl?: number;
  maxCpl?: number;
}): WinningAdsEvaluation => {
  const normalizedTargetCpl = targetCpl && targetCpl > 0 ? targetCpl : 20;
  const normalizedMaxCpl = maxCpl && maxCpl > 0 ? maxCpl : defaultMaxCpl(normalizedTargetCpl);
  const linkedLeadCount = linkedLeads.length;
  const costPerResult = creative.costPerResult !== undefined
    ? creative.costPerResult
    : linkedLeadCount > 0
      ? (creative.spend || 0) / linkedLeadCount
      : undefined;
  const ctr = creative.CTR || 0;
  const linkCtr = creative.linkCTR ?? ctr;
  const hookStrength = creative.hook_strength || 0;
  const hookRate = creative.hookRate ?? 0;

  let verdict: WinningAdsVerdict = 'LEARNING';
  let rationale = 'Wait until the ad has enough delivery and at least a few tracked results before making a hard decision.';

  if (costPerResult !== undefined) {
    if (costPerResult <= normalizedTargetCpl) {
      verdict = 'WINNING';
      rationale = 'Cost per result is inside the target CPL, so this creative is ready to protect and scale.';
    } else if (costPerResult <= normalizedMaxCpl) {
      verdict = 'ADJUST';
      rationale = 'Cost per result is above target but still near the acceptable limit, so adjust before killing it.';
    } else {
      verdict = 'KILL';
      rationale = 'Cost per result is already above the max CPL, so this creative should be stopped or replaced.';
    }
  }

  const posterMetrics: WinningAdsMetric[] = [
    {
      label: 'CTR (All)',
      value: ctr,
      benchmark: '0.8% - 1.0%+',
      status: ctr >= 1 ? 'pass' : ctr >= 0.8 ? 'watch' : 'fail',
      note: 'Current sync exposes one CTR field, so this uses the available CTR signal.',
    },
    {
      label: 'CTR (Link)',
      value: linkCtr,
      benchmark: '1.3% - 1.5%+',
      status: linkCtr >= 1.5 ? 'pass' : linkCtr >= 1.3 ? 'watch' : 'fail',
      note: 'This is treated as the click-through benchmark until separate link CTR is synced.',
    },
    {
      label: 'Link Click',
      value: creative.linkClicks ?? linkedLeadCount,
      benchmark: 'Read with click volume',
      status: (creative.linkClicks ?? linkedLeadCount) >= 3 ? 'pass' : (creative.linkClicks ?? linkedLeadCount) > 0 ? 'watch' : 'pending',
      note: creative.linkClicks !== undefined ? 'Using synced Meta link click volume.' : 'Tracked lead count is being used as the current response proxy.',
    },
    {
      label: 'Cost Per Link Click',
      value: creative.costPerLinkClick ?? costPerResult,
      benchmark: 'RM2.00 or lower',
      status: (creative.costPerLinkClick ?? costPerResult) === undefined ? 'pending' : (creative.costPerLinkClick ?? costPerResult)! <= 2 ? 'pass' : (creative.costPerLinkClick ?? costPerResult)! <= 3 ? 'watch' : 'fail',
      note: creative.costPerLinkClick !== undefined ? 'Using synced Meta cost per link click.' : 'Until ad-level click data is synced, this uses spend divided by tracked results as the closest live proxy.',
    },
  ];

  const videoMetrics: WinningAdsMetric[] = [
    {
      label: 'Hook Rate',
      value: creative.hookRate !== undefined ? hookRate * 100 : hookStrength,
      benchmark: 'Strong 3-sec hold',
      status: creative.hookRate !== undefined
        ? hookRate >= 0.3 ? 'pass' : hookRate >= 0.2 ? 'watch' : 'fail'
        : hookStrength >= 75 ? 'pass' : hookStrength >= 60 ? 'watch' : 'fail',
      note: creative.hookRate !== undefined
        ? 'Using synced 3-second view rate from Meta.'
        : 'Current app uses Hook Strength as the video opening proxy until 3-sec view data is synced in.',
    },
    {
      label: 'Video View 3 Sec',
      value: creative.videoViews3s,
      benchmark: 'Check rising retention',
      status: creative.videoViews3s !== undefined ? 'watch' : 'pending',
      note: creative.videoViews3s !== undefined ? 'Using synced Meta 3-second video views.' : 'Awaiting ad-level video metrics from Meta sync.',
    },
    {
      label: 'Video View 25%',
      value: creative.videoViews25,
      benchmark: 'Check depth',
      status: creative.videoViews25 !== undefined ? 'watch' : 'pending',
      note: creative.videoViews25 !== undefined ? 'Using synced Meta 25% video views.' : 'Awaiting ad-level video metrics from Meta sync.',
    },
    {
      label: 'Video View 50%',
      value: creative.videoViews50,
      benchmark: 'Check depth',
      status: creative.videoViews50 !== undefined ? 'watch' : 'pending',
      note: creative.videoViews50 !== undefined ? 'Using synced Meta 50% video views.' : 'Awaiting ad-level video metrics from Meta sync.',
    },
    {
      label: 'Video View 75%',
      value: creative.videoViews75,
      benchmark: 'Check depth',
      status: creative.videoViews75 !== undefined ? 'watch' : 'pending',
      note: creative.videoViews75 !== undefined ? 'Using synced Meta 75% video views.' : 'Awaiting ad-level video metrics from Meta sync.',
    },
  ];

  return {
    verdict,
    rationale,
    targetCpl: normalizedTargetCpl,
    maxCpl: normalizedMaxCpl,
    costPerResult,
    linkedLeadCount,
    posterMetrics,
    videoMetrics,
  };
};

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

export const deriveCreativeFromCampaign = (campaign: AdsData, leads: LeadData[] = []): CreativeData => {
  const linkedLeads = leads.filter((lead) => normalizeName(lead.campaign).includes(normalizeName(campaign.campaign_name)));
  const leadCount = linkedLeads.length;
  const wonLeadCount = linkedLeads.filter((lead) => lead.status === 'won').length;
  const mediaType = inferCreativeMediaType(campaign.campaign_name, campaign.platform === 'meta' ? 'video' : 'image');
  const platform = campaign.platform || inferCreativePlatform(campaign.campaign_name);
  const analysis = analyzeCreative({
    creativeName: campaign.campaign_name,
    campaignName: campaign.campaign_name,
    platform,
    mediaType,
    ctr: campaign.CTR,
    roas: campaign.ROAS,
    spend: campaign.spend,
    leadCount,
    wonLeadCount,
  });

  return {
    id: `derived_${campaign.id}`,
    origin: 'synced',
    creative_name: campaign.campaign_name,
    campaign_name: campaign.campaign_name,
    campaign_external_id: campaign.id,
    platform,
    media_type: mediaType,
    hook_type: analysis.hookType,
    score: analysis.score,
    status: analysis.status,
    CTR: campaign.CTR,
    ROAS: campaign.ROAS,
    spend: campaign.spend,
    hook_strength: analysis.hookStrength,
    message_clarity: analysis.messageClarity,
    cta_presence: analysis.ctaPresence,
    fatigue: analysis.fatigue,
    suggestions: analysis.suggestions,
    analysis_summary: analysis.summary,
    snapshot_date: campaign.date,
  };
};
