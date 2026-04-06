import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdsData, CreativeData, InsightData, ProfitData, RoutePage, CurrencyCode, LeadData, WorkspaceDailySummary, CreateLeadInput, CreateCreativeInput, WorkspaceSettings } from '../types';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { supabase } from '../services/supabase';
import { syncPrimaryMetaAccount, syncWorkspaceGoogleAds } from '../services/metaIntegration';
import { analyzeCreative, deriveCreativeFromCampaign, inferCreativeMediaType, inferHookType } from '../services/creativeAnalysis';
import { buildDefaultWorkspaceSettings, getWorkspaceSettings } from '../services/workspaceSettings';

interface DatabaseContextType {
  currentPage: RoutePage;
  setCurrentPage: (page: RoutePage) => void;
  adsData: AdsData[];
  setAdsData: React.Dispatch<React.SetStateAction<AdsData[]>>;
  creatives: CreativeData[];
  setCreatives: React.Dispatch<React.SetStateAction<CreativeData[]>>;
  insights: InsightData[];
  setInsights: React.Dispatch<React.SetStateAction<InsightData[]>>;
  profitData: ProfitData;
  setProfitData: React.Dispatch<React.SetStateAction<ProfitData>>;
  isFetching: boolean;
  syncAdsData: (source: 'meta' | 'google' | 'all') => Promise<void>;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatCurrency: (value: number) => string;
  leads: LeadData[];
  setLeads: React.Dispatch<React.SetStateAction<LeadData[]>>;
  createCreative: (creative: CreateCreativeInput) => Promise<CreativeData | null>;
  createLead: (lead: CreateLeadInput) => Promise<LeadData | null>;
  updateLead: (id: string, updates: Partial<LeadData>) => void;
  pipelineAlerts: { id: string; message: string; severity: 'warning' | 'info' | 'success' }[];
  getSmartRecommendation: (lead: LeadData) => string;
  hasCampaignData: boolean;
  isRealWorkspace: boolean;
  needsFirstSync: boolean;
  workspaceSummary: WorkspaceDailySummary | null;
  workspaceSummaryHistory: WorkspaceDailySummary[];
  workspaceSettings: WorkspaceSettings | null;
  aiAssistantEnabled: boolean;
  creativeAnalysisEnabled: boolean;
  leadGenerationEnabled: boolean;
  createCampaign: (campaign: {
    campaign_name: string;
    platform: 'meta' | 'google';
    spend: number;
    CTR: number;
    CPM: number;
    ROAS: number;
    conversions: number;
  }) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);
const CUSTOM_CAMPAIGNS_STORAGE_PREFIX = 'ads-intel-custom-campaigns';
const CUSTOM_CREATIVES_STORAGE_PREFIX = 'ads-intel-custom-creatives';
const isMissingRelationError = (message?: string | null) =>
  typeof message === 'string' && (
    message.includes("Could not find the table") ||
    message.includes('does not exist')
  );
const buildCustomCampaignsKey = (workspaceId?: string | null) =>
  `${CUSTOM_CAMPAIGNS_STORAGE_PREFIX}:${workspaceId || 'demo'}`;
const buildCustomCreativesKey = (workspaceId?: string | null) =>
  `${CUSTOM_CREATIVES_STORAGE_PREFIX}:${workspaceId || 'demo'}`;

// Initial Test Data
const initialAdsData: AdsData[] = [
  { id: '1', campaign_name: 'Meta_Winter_Sale_Broad', spend: 2450, CTR: 0.85, CPM: 12.50, ROAS: 1.2, conversions: 12, revenue: 2940, date: '2024-11-20', platform: 'meta', status: 'underperforming', recommendation: 'Improve Creative' },
  { id: '2', campaign_name: 'Google_Retargeting_Hot', spend: 1200, CTR: 2.50, CPM: 26.00, ROAS: 4.1, conversions: 45, revenue: 4920, date: '2024-11-20', platform: 'google', status: 'scaling', recommendation: 'Scale Budget' },
  { id: '3', campaign_name: 'Meta_LAL_Purchases_1%', spend: 850, CTR: 1.20, CPM: 18.00, ROAS: 2.5, conversions: 22, revenue: 2125, date: '2024-11-20', platform: 'meta', status: 'active', recommendation: 'Adjust Audience' },
  { id: '4', campaign_name: 'Google_Search_Brand_Core_Image', spend: 500, CTR: 4.50, CPM: 45.00, ROAS: 5.2, conversions: 30, revenue: 2600, date: '2024-11-20', platform: 'google', status: 'active' },
  { id: '5', campaign_name: 'Meta_Advantage_Plus_Catalog', spend: 3200, CTR: 1.80, CPM: 14.50, ROAS: 3.8, conversions: 88, revenue: 12160, date: '2024-11-20', platform: 'meta', status: 'scaling', recommendation: 'Scale Budget' },
  { id: '6', campaign_name: 'Google_Display_Prospecting', spend: 400, CTR: 0.40, CPM: 4.20, ROAS: 0.8, conversions: 5, revenue: 320, date: '2024-11-20', platform: 'google', status: 'paused', recommendation: 'Pause Campaign' },
  { id: '7', campaign_name: 'Meta_Video_Views_Cold', spend: 1500, CTR: 0.65, CPM: 8.50, ROAS: 1.1, conversions: 8, revenue: 1650, date: '2024-11-20', platform: 'meta', status: 'testing', recommendation: 'Improve Creative' },
  { id: '8', campaign_name: 'Google_PMax_Shopping_All', spend: 4500, CTR: 1.45, CPM: 19.20, ROAS: 3.2, conversions: 112, revenue: 14400, date: '2024-11-20', platform: 'google', status: 'scaling', recommendation: 'Scale Budget' },
];

const initialCreatives: CreativeData[] = [
  {
    id: '1',
    origin: 'synced',
    platform: 'meta',
    creative_name: 'Meta_Winter_Sale_Broad_Video',
    campaign_name: 'Meta_Winter_Sale_Broad',
    media_type: 'video',
    hook_type: 'Question',
    score: 85,
    status: 'WINNING',
    CTR: 2.1,
    ROAS: 3.5,
    spend: 2450,
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=100&h=100',
    hook_strength: 92,
    message_clarity: 85,
    cta_presence: 78,
    fatigue: 'low',
    analysis_summary: 'Strong creative signal with healthy hook and commercial intent.',
    suggestions: ['Healthy creative signal. Keep monitoring before broadening spend.'],
    snapshot_date: '2024-11-20',
  },
  {
    id: '2',
    origin: 'synced',
    platform: 'google',
    creative_name: 'Google_Retargeting_Hot_Image',
    campaign_name: 'Google_Retargeting_Hot',
    media_type: 'image',
    hook_type: 'Benefit',
    score: 45,
    status: 'TESTING',
    CTR: 0.8,
    ROAS: 1.1,
    spend: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=100&h=100',
    hook_strength: 45,
    message_clarity: 62,
    cta_presence: 81,
    fatigue: 'medium',
    analysis_summary: 'Retargeting asset needs a stronger opening and fresher angle.',
    suggestions: ['Lead harder in the first seconds with the offer, pain point, or pattern interrupt.'],
    snapshot_date: '2024-11-20',
  },
];

const initialProfitData: ProfitData = {
  id: '1',
  product_price: 150,
  cost: 50, // Base Cost
  closing_rate: 0.2, // 20%
  CPL: 20,
  cogs: 45,
  operational_costs: 2500
};

const initialLeads: LeadData[] = [
  { id: 'l1', name: 'Ahmad Rafiq', source: 'meta', campaign: 'Meta_Winter_Sale_Broad', value: 450, status: 'new', date: '2024-11-21', score: 'medium', insight: 'High interest detected', recommendedAction: 'Send brochure', creative_name: 'Winter_Offer_V1', creative_type: 'video', quality_score: 'medium', ctr: 1.8, cpl: 12.5, conversionRate: 4.2 },
  { id: 'l2', name: 'Sarah Jenkins', source: 'google', campaign: 'Google_Search_Brand_Core_Image', value: 1200, status: 'new', date: '2024-11-21', score: 'high', insight: 'High value opportunity', recommendedAction: 'Follow up immediately', creative_name: 'Search_Brand_Core', creative_type: 'image', quality_score: 'high', ctr: 4.5, cpl: 8.2, conversionRate: 12.5 },
  { id: 'l3', name: 'Lim Wei Kang', source: 'meta', campaign: 'Meta_LAL_Purchases_1%', value: 300, status: 'contacted', date: '2024-11-20', score: 'low', insight: 'Returning visitor', recommendedAction: 'Low priority', creative_name: 'Product_Catalog_LAL', creative_type: 'image', quality_score: 'low', ctr: 0.9, cpl: 25.0, conversionRate: 1.5 },
  { id: 'l4', name: 'John Doe', source: 'google', campaign: 'Google_Retargeting_Hot', value: 850, status: 'contacted', date: '2024-11-20', score: 'medium', insight: 'Retargeting lead', recommendedAction: 'Send follow-up WhatsApp', creative_name: 'Retargeting_Dynamic', creative_type: 'video', quality_score: 'medium', ctr: 2.1, cpl: 15.5, conversionRate: 5.8 },
  { id: 'l5', name: 'Nurul Huda', source: 'meta', campaign: 'Meta_Advantage_Plus_Catalog', value: 2500, status: 'qualified', date: '2024-11-19', score: 'high', insight: 'High converting campaign', recommendedAction: 'Schedule Demo', creative_name: 'Smart_Catalog_V2', creative_type: 'image', quality_score: 'high', ctr: 3.2, cpl: 6.5, conversionRate: 18.2 },
  { id: 'l6', name: 'Michael Chen', source: 'google', campaign: 'Google_PMax_Shopping_All', value: 150, status: 'qualified', date: '2024-11-19', score: 'medium', insight: 'Price sensitive', recommendedAction: 'Send Offer', creative_name: 'PMax_Asset_Group_1', creative_type: 'image', quality_score: 'medium', ctr: 1.5, cpl: 18.0, conversionRate: 3.5 },
  { id: 'l7', name: 'Siti Aminah', source: 'meta', campaign: 'Meta_Winter_Sale_Broad', value: 1800, status: 'won', date: '2024-11-18', score: 'high', insight: 'Loyal customer', recommendedAction: 'Upsell opportunity', creative_name: 'Winter_Offer_V1', creative_type: 'video', quality_score: 'high', ctr: 2.4, cpl: 9.0, conversionRate: 22.0 },
  { id: 'l8', name: 'Robert Smith', source: 'google', campaign: 'Google_Search_Brand_Core_Image', value: 900, status: 'won', date: '2024-11-17', score: 'medium', insight: 'Standard conversion', recommendedAction: 'Nurture', creative_name: 'Search_Brand_Core', creative_type: 'image', quality_score: 'medium', ctr: 3.8, cpl: 11.2, conversionRate: 8.5 },
  { id: 'l9', name: 'David Lee', source: 'meta', campaign: 'Meta_LAL_Purchases_1%', value: 500, status: 'lost', date: '2024-11-16', score: 'low', insight: 'Low engagement source', recommendedAction: 'Archive', creative_name: 'Product_Catalog_LAL', creative_type: 'image', quality_score: 'low', ctr: 0.7, cpl: 32.0, conversionRate: 0.8 },
  { id: 'l10', name: 'Ali Bakar', source: 'meta', campaign: 'Meta_Winter_Sale_Broad', value: 400, status: 'contacted', date: '2024-11-20', score: 'medium', insight: 'Clicked link twice', recommendedAction: 'Call now', creative_name: 'Winter_Offer_V1', creative_type: 'video', quality_score: 'medium', ctr: 1.8, cpl: 12.5, conversionRate: 4.2 },
  { id: 'l11', name: 'Grace Ho', source: 'google', campaign: 'Google_Retargeting_Hot', value: 600, status: 'contacted', date: '2024-11-20', score: 'medium', insight: 'Requested more info', recommendedAction: 'Send WhatsApp', creative_name: 'Retargeting_Dynamic', creative_type: 'video', quality_score: 'medium', ctr: 2.1, cpl: 15.5, conversionRate: 5.8 },
  { id: 'l12', name: 'Siva Kumar', source: 'meta', campaign: 'Meta_Advantage_Plus_Catalog', value: 1100, status: 'contacted', date: '2024-11-20', score: 'high', insight: 'High value interest', recommendedAction: 'Face-to-face meeting', creative_name: 'Smart_Catalog_V2', creative_type: 'image', quality_score: 'high', ctr: 3.2, cpl: 6.5, conversionRate: 18.2 },
];

import { fetchMetaAds, fetchGoogleAds } from '../services/api';

const deriveCampaignStatus = (campaign: Pick<AdsData, 'ROAS' | 'CTR' | 'CPM'>): AdsData['status'] => {
  if (campaign.ROAS >= 3) return 'scaling';
  if (campaign.ROAS < 1.5) return 'underperforming';
  if (campaign.CTR < 1) return 'testing';
  if (campaign.CPM > 25) return 'testing';
  return 'active';
};

const deriveCampaignRecommendation = (campaign: Pick<AdsData, 'ROAS' | 'CTR' | 'CPM'>): AdsData['recommendation'] => {
  if (campaign.ROAS < 1) return 'Pause Campaign';
  if (campaign.ROAS >= 3) return 'Scale Budget';
  if (campaign.CTR < 1) return 'Improve Creative';
  if (campaign.CPM > 25) return 'Adjust Audience';
  return undefined;
};

const enrichAdsRecord = (campaign: AdsData): AdsData => ({
  ...campaign,
  status: campaign.status || deriveCampaignStatus(campaign),
  recommendation: campaign.recommendation || deriveCampaignRecommendation(campaign),
});

const readStoredCustomCampaigns = (workspaceId?: string | null): AdsData[] => {
  try {
    const rawValue = localStorage.getItem(buildCustomCampaignsKey(workspaceId));
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed as AdsData[] : [];
  } catch {
    return [];
  }
};

const persistCustomCampaigns = (workspaceId: string | null | undefined, campaigns: AdsData[]) => {
  localStorage.setItem(buildCustomCampaignsKey(workspaceId), JSON.stringify(campaigns));
};

const readStoredCustomCreatives = (workspaceId?: string | null): CreativeData[] => {
  try {
    const rawValue = localStorage.getItem(buildCustomCreativesKey(workspaceId));
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed as CreativeData[] : [];
  } catch {
    return [];
  }
};

const persistCustomCreatives = (workspaceId: string | null | undefined, creatives: CreativeData[]) => {
  localStorage.setItem(buildCustomCreativesKey(workspaceId), JSON.stringify(creatives));
};

const mergeCampaignCollections = (baseCampaigns: AdsData[], customCampaigns: AdsData[]) => {
  const nextMap = new Map<string, AdsData>();

  [...baseCampaigns, ...customCampaigns].forEach((campaign) => {
    nextMap.set(campaign.id, enrichAdsRecord(campaign));
  });

  return [...nextMap.values()];
};

const mergeCreativeCollections = (baseCreatives: CreativeData[], customCreatives: CreativeData[]) => {
  const nextMap = new Map<string, CreativeData>();

  [...baseCreatives, ...customCreatives].forEach((creative) => {
    nextMap.set(creative.id, creative);
  });

  return [...nextMap.values()].sort((left, right) => {
    const leftScore = (left.score || 0) + (left.CTR || 0) + (left.ROAS || 0);
    const rightScore = (right.score || 0) + (right.CTR || 0) + (right.ROAS || 0);
    return rightScore - leftScore;
  });
};

const mapLeadRowsToLeadData = (rows: any[]): LeadData[] => rows.map((row) => ({
  id: row.id,
  workspace_id: row.workspace_id,
  name: row.name,
  source: row.source,
  campaign: row.campaign,
  value: Number(row.value || 0),
  status: row.status,
  date: row.lead_date,
  score: row.lead_score,
  insight: row.insight,
  recommendedAction: row.recommended_action,
  notes: row.notes || undefined,
  creative_name: row.creative_name,
  creative_type: row.creative_type,
  hook_tag: row.hook_tag || undefined,
  adset_name: row.adset_name || undefined,
  quality_score: row.quality_score,
  ctr: Number(row.ctr || 0),
  cpl: Number(row.cpl || 0),
  conversionRate: Number(row.conversion_rate || 0),
}));

const mapSnapshotRowsToAdsData = (rows: any[]): AdsData[] => rows.map((row) => enrichAdsRecord({
  id: row.campaign_external_id,
  campaign_name: row.campaign_name,
  delivery: row.delivery || undefined,
  resultsLabel: row.results_label || undefined,
  budget: row.budget != null ? Number(row.budget) : undefined,
  spend: Number(row.spend || 0),
  reach: row.reach != null ? Number(row.reach) : undefined,
  impressions: row.impressions != null ? Number(row.impressions) : undefined,
  costPerResult: row.cost_per_result != null ? Number(row.cost_per_result) : undefined,
  CTR: Number(row.ctr || 0),
  linkCTR: row.link_ctr != null ? Number(row.link_ctr) : undefined,
  linkClicks: row.link_clicks != null ? Number(row.link_clicks) : undefined,
  costPerLinkClick: row.cost_per_link_click != null ? Number(row.cost_per_link_click) : undefined,
  videoViews3s: row.video_views_3s != null ? Number(row.video_views_3s) : undefined,
  hookRate: row.hook_rate != null ? Number(row.hook_rate) : undefined,
  videoViews25: row.video_views_25 != null ? Number(row.video_views_25) : undefined,
  videoViews50: row.video_views_50 != null ? Number(row.video_views_50) : undefined,
  videoViews75: row.video_views_75 != null ? Number(row.video_views_75) : undefined,
  rate75VV: row.rate_75_vv != null ? Number(row.rate_75_vv) : undefined,
  CPM: Number(row.cpm || 0),
  ROAS: Number(row.roas || 0),
  conversions: Number(row.conversions || 0),
  revenue: Number(row.revenue || 0),
  date: row.snapshot_date,
  platform: 'meta',
}));

const mapCreativeRowsToCreativeData = (rows: any[]): CreativeData[] => rows.map((row) => ({
  id: row.id || row.creative_external_id || `${row.source_platform}_${row.campaign_external_id || row.creative_name}`,
  workspace_id: row.workspace_id,
  origin: row.origin || 'synced',
  platform: row.source_platform || undefined,
  creative_name: row.creative_name,
  campaign_name: row.campaign_name || undefined,
  campaign_external_id: row.campaign_external_id || undefined,
  adset_name: row.adset_name || undefined,
  ad_name: row.ad_name || undefined,
  creative_external_id: row.creative_external_id || undefined,
  media_type: row.media_type || 'image',
  hook_type: row.hook_type || undefined,
  score: Number(row.score || 0),
  status: row.status,
  CTR: Number(row.ctr || 0),
  linkCTR: row.link_ctr != null ? Number(row.link_ctr) : undefined,
  ROAS: Number(row.roas || 0),
  spend: Number(row.spend || 0),
  impressions: row.impressions != null ? Number(row.impressions) : undefined,
  linkClicks: row.link_clicks != null ? Number(row.link_clicks) : undefined,
  costPerLinkClick: row.cost_per_link_click != null ? Number(row.cost_per_link_click) : undefined,
  costPerResult: row.cost_per_result != null ? Number(row.cost_per_result) : undefined,
  targetCpl: row.target_cpl != null ? Number(row.target_cpl) : undefined,
  maxCpl: row.max_cpl != null ? Number(row.max_cpl) : undefined,
  hookRate: row.hook_rate != null ? Number(row.hook_rate) : undefined,
  videoViews3s: row.video_views_3s != null ? Number(row.video_views_3s) : undefined,
  videoViews25: row.video_views_25 != null ? Number(row.video_views_25) : undefined,
  videoViews50: row.video_views_50 != null ? Number(row.video_views_50) : undefined,
  videoViews75: row.video_views_75 != null ? Number(row.video_views_75) : undefined,
  imageUrl: row.preview_url || row.thumbnail_url || undefined,
  thumbnailUrl: row.thumbnail_url || row.preview_url || undefined,
  hook_strength: Number(row.hook_strength || 0),
  message_clarity: Number(row.message_clarity || 0),
  cta_presence: Number(row.cta_presence || 0),
  fatigue: row.fatigue,
  analysis_summary: row.analysis_summary || undefined,
  suggestions: Array.isArray(row.suggestions) ? row.suggestions : [],
  snapshot_date: row.snapshot_date || undefined,
}));

const deriveCreativeCollection = (campaigns: AdsData[], leads: LeadData[], customCreatives: CreativeData[] = []) =>
  mergeCreativeCollections(campaigns.map((campaign) => deriveCreativeFromCampaign(campaign, leads)), customCreatives);

const generateDemoInsightsFromAds = (campaigns: AdsData[]): InsightData[] => {
  const generatedInsights: InsightData[] = [];

  campaigns.forEach((ad) => {
    const computedPlatform = ad.platform || (ad.campaign_name.toLowerCase().includes('meta') ? 'meta' : ad.campaign_name.toLowerCase().includes('google') ? 'google' : undefined);

    if (ad.CTR < 1.0) {
      generatedInsights.push({
        id: `ins_ctr_low_${ad.id}`,
        type: 'creative',
        severity: 'attention',
        message: `Change creative for ${ad.campaign_name}`,
        reasoning: `CTR is ${ad.CTR}%, indicating weak creative hook`,
        priority: 'high',
        action: `Change creative for ${ad.campaign_name}`,
        actionLabel: 'Improve Creative',
        platform: computedPlatform,
      });
    }

    if (ad.CPM > 25) {
      generatedInsights.push({
        id: `ins_cpm_high_${ad.id}`,
        type: 'ads',
        severity: 'efficiency',
        message: `Adjust audience for ${ad.campaign_name}`,
        reasoning: `CPM is above $25 benchmark, suggesting audience mismatch or high competition`,
        priority: 'medium',
        action: `Adjust audience for ${ad.campaign_name}`,
        actionLabel: 'Adjust Audience',
        platform: computedPlatform,
      });
    }

    if (ad.ROAS > 3.0) {
      generatedInsights.push({
        id: `ins_scale_${ad.id}`,
        type: 'sales',
        severity: 'performance',
        message: `Scale campaign: ${ad.campaign_name}`,
        reasoning: `ROAS is ${ad.ROAS}x (above target threshold), indicating campaign is highly scalable`,
        priority: 'high',
        action: `Scale campaign: ${ad.campaign_name}`,
        actionLabel: 'Scale Budget',
        platform: computedPlatform,
      });
    }

    if (ad.ROAS < 1.5) {
      generatedInsights.push({
        id: `ins_pause_${ad.id}`,
        type: 'ads',
        severity: 'attention',
        message: `Pause campaign: ${ad.campaign_name}`,
        reasoning: `ROAS is ${ad.ROAS}x, which is below breakeven threshold. Immediate action required.`,
        priority: 'high',
        action: `Pause campaign: ${ad.campaign_name}`,
        actionLabel: 'Pause Campaign',
        platform: computedPlatform,
      });
    }
  });

  return generatedInsights;
};

const mapInsightRowsToInsightData = (rows: any[]): InsightData[] => rows.map((row) => ({
  id: row.id,
  type: row.type,
  severity: row.severity,
  message: row.message,
  reasoning: row.reasoning,
  priority: row.priority,
  action: row.action || '',
  actionLabel: row.action_label || 'Review',
  platform: row.platform || undefined,
  campaignExternalId: row.campaign_external_id || undefined,
  campaignName: row.campaign_name || undefined,
}));

const aggregateSummaryRows = (rows: WorkspaceDailySummary[]): WorkspaceDailySummary | null => {
  if (rows.length === 0) {
    return null;
  }

  const totalSpend = rows.reduce((sum, row) => sum + Number(row.total_spend || 0), 0);
  const totalRevenue = rows.reduce((sum, row) => sum + Number(row.total_revenue || 0), 0);
  const totalConversions = rows.reduce((sum, row) => sum + Number(row.total_conversions || 0), 0);
  const totalCampaignCount = rows.reduce((sum, row) => sum + Number(row.campaign_count || 0), 0);
  const averageCtr = totalCampaignCount > 0
    ? rows.reduce((sum, row) => sum + (Number(row.average_ctr || 0) * Number(row.campaign_count || 0)), 0) / totalCampaignCount
    : 0;
  const averageCpm = totalCampaignCount > 0
    ? rows.reduce((sum, row) => sum + (Number(row.average_cpm || 0) * Number(row.campaign_count || 0)), 0) / totalCampaignCount
    : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0;
  const latestUpdatedAt = [...rows]
    .map((row) => row.updated_at || row.created_at || row.summary_date)
    .sort()
    .at(-1) || rows[0].summary_date;

  return {
    ...rows[0],
    provider: rows.length > 1 ? 'all' : rows[0].provider,
    total_spend: totalSpend,
    total_revenue: totalRevenue,
    total_conversions: totalConversions,
    average_ctr: averageCtr,
    average_cpm: averageCpm,
    roas,
    profit_margin: profitMargin,
    campaign_count: totalCampaignCount,
    updated_at: latestUpdatedAt,
  };
};

const aggregateSummaryHistoryByDate = (rows: WorkspaceDailySummary[]): WorkspaceDailySummary[] => {
  const grouped = new Map<string, WorkspaceDailySummary[]>();

  rows.forEach((row) => {
    const current = grouped.get(row.summary_date) || [];
    current.push(row);
    grouped.set(row.summary_date, current);
  });

  return [...grouped.entries()]
    .sort((left, right) => new Date(right[0]).getTime() - new Date(left[0]).getTime())
    .map(([, groupRows]) => aggregateSummaryRows(groupRows))
    .filter((row): row is WorkspaceDailySummary => Boolean(row));
};

const mergeSummaryRowsIntoHistory = (
  existingHistory: WorkspaceDailySummary[],
  incomingRows: Array<WorkspaceDailySummary | null | undefined>
) => {
  const nextMap = new Map<string, WorkspaceDailySummary>();

  existingHistory.forEach((row) => {
    nextMap.set(`${row.summary_date}:${row.provider}`, row);
  });

  incomingRows.forEach((row) => {
    if (!row) {
      return;
    }

    nextMap.set(`${row.summary_date}:${row.provider}`, row);
  });

  return aggregateSummaryHistoryByDate([...nextMap.values()]);
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConfigured, isDemoMode } = useAuth();
  const { currentWorkspace, refreshWorkspaceData } = useWorkspace();
  const [currentPage, setCurrentPage] = useState<RoutePage>('Dashboard');
  const [adsData, setAdsData] = useState<AdsData[]>(initialAdsData);
  const [creatives, setCreatives] = useState<CreativeData[]>(initialCreatives);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [profitData, setProfitData] = useState<ProfitData>(initialProfitData);
  const [workspaceSummary, setWorkspaceSummary] = useState<WorkspaceDailySummary | null>(null);
  const [workspaceSummaryHistory, setWorkspaceSummaryHistory] = useState<WorkspaceDailySummary[]>([]);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings | null>(null);
  const [leads, setLeads] = useState<LeadData[]>(initialLeads);
  const [customCampaigns, setCustomCampaigns] = useState<AdsData[]>([]);
  const [customCreatives, setCustomCreatives] = useState<CreativeData[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [currency, setCurrency] = useState<CurrencyCode>('MYR');
  const isRealWorkspace = !isDemoMode && isConfigured && Boolean(currentWorkspace);
  const hasCampaignData = adsData.length > 0;
  const needsFirstSync = isRealWorkspace && !hasCampaignData;
  const aiAssistantEnabled = workspaceSettings?.ai_assistant_enabled ?? true;
  const creativeAnalysisEnabled = workspaceSettings?.creative_analysis_enabled ?? true;
  const leadGenerationEnabled = workspaceSettings?.lead_generation_enabled ?? true;

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

    switch (currency) {
      case 'USD': return `$${formatted}`;
      case 'GBP': return `GBP ${formatted}`;
      case 'MYR': return `RM ${formatted}`;
      default: return `RM ${formatted}`;
    }
  };

  const syncAdsData = async (source: 'meta' | 'google' | 'all') => {
    setIsFetching(true);
    try {
      let newData: AdsData[] = [];
      let newCreatives: CreativeData[] = [];
      let shouldRefreshWorkspace = false;
      const nextSummaryRows: WorkspaceDailySummary[] = [];
      if (source === 'meta' || source === 'all') {
        if (!isDemoMode && isConfigured && currentWorkspace) {
          const metaResult = await syncPrimaryMetaAccount(currentWorkspace.id);
          if (metaResult.ok) {
            newData = [...newData, ...metaResult.campaigns.map(enrichAdsRecord)];
            newCreatives = [...newCreatives, ...metaResult.creatives];
            setInsights(metaResult.insights);
            if (metaResult.summary) {
              nextSummaryRows.push(metaResult.summary as WorkspaceDailySummary);
            }
            shouldRefreshWorkspace = true;
          }
        } else {
          const metaData = await fetchMetaAds();
          newData = [...newData, ...metaData.map(ad => enrichAdsRecord({...ad, platform: 'meta' as const}))];
        }
      }
      if (source === 'google' || source === 'all') {
        if (!isDemoMode && isConfigured && currentWorkspace) {
          const googleResult = await syncWorkspaceGoogleAds(currentWorkspace.id);
          if (googleResult.ok) {
            newData = [...newData, ...googleResult.campaigns.map(enrichAdsRecord)];
            newCreatives = [...newCreatives, ...googleResult.creatives];
            if (googleResult.summary) {
              nextSummaryRows.push(googleResult.summary as WorkspaceDailySummary);
            }
            shouldRefreshWorkspace = true;
          }
        } else {
          const googleData = await fetchGoogleAds();
          newData = [...newData, ...googleData.map(ad => enrichAdsRecord({...ad, platform: 'google' as const}))];
        }
      }

      if (shouldRefreshWorkspace) {
        await refreshWorkspaceData();
      }

      if (nextSummaryRows.length > 0) {
        const mergedHistory = mergeSummaryRowsIntoHistory(workspaceSummaryHistory, nextSummaryRows);
        setWorkspaceSummaryHistory(mergedHistory);
        setWorkspaceSummary(mergedHistory[0] || null);
      }

      // Update ads data, but prevent wiping if API fails completely
      if (newData.length > 0) {
        setAdsData(mergeCampaignCollections(newData, customCampaigns));
        if (isDemoMode) {
          setCreatives(deriveCreativeCollection(newData, leads, customCreatives));
        }
      }

      if (newCreatives.length > 0) {
        setCreatives(mergeCreativeCollections(newCreatives, customCreatives));
      }
    } catch (error) {
      console.error('Failed to sync ads data:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    setCustomCampaigns(readStoredCustomCampaigns(currentWorkspace?.id));
  }, [currentWorkspace?.id]);

  useEffect(() => {
    setCustomCreatives(readStoredCustomCreatives(currentWorkspace?.id));
  }, [currentWorkspace?.id]);

  useEffect(() => {
    const nextManualCampaigns = adsData.filter((campaign) => campaign.id.startsWith('manual_'));
    const currentSerialized = JSON.stringify(customCampaigns);
    const nextSerialized = JSON.stringify(nextManualCampaigns);

    if (currentSerialized === nextSerialized) {
      return;
    }

    setCustomCampaigns(nextManualCampaigns);
    persistCustomCampaigns(currentWorkspace?.id, nextManualCampaigns);
  }, [adsData, currentWorkspace?.id, customCampaigns]);

  useEffect(() => {
    const loadWorkspaceCampaignSnapshots = async () => {
      if (isDemoMode) {
        await syncAdsData('all');
        return;
      }

      if (!isConfigured || !currentWorkspace || !supabase) {
        setAdsData(mergeCampaignCollections([], customCampaigns));
        setWorkspaceSummary(null);
        return;
      }

      const { data: snapshotRows, error } = await supabase
        .from('campaign_snapshots')
        .select(`
          campaign_external_id,
          campaign_name,
          delivery,
          results_label,
          budget,
          spend,
          reach,
          impressions,
          cost_per_result,
          ctr,
          link_ctr,
          link_clicks,
          cost_per_link_click,
          video_views_3s,
          hook_rate,
          video_views_25,
          video_views_50,
          video_views_75,
          rate_75_vv,
          cpm,
          roas,
          conversions,
          revenue,
          snapshot_date
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('snapshot_date', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Failed to load campaign snapshots:', error.message);
        setAdsData(mergeCampaignCollections([], customCampaigns));
        return;
      }

      if (!snapshotRows || snapshotRows.length === 0) {
        setAdsData(mergeCampaignCollections([], customCampaigns));
        return;
      }

      const latestSnapshotDate = snapshotRows[0].snapshot_date;
      const latestRows = snapshotRows.filter((row) => row.snapshot_date === latestSnapshotDate);
      setAdsData(mergeCampaignCollections(mapSnapshotRowsToAdsData(latestRows), customCampaigns));
    };

    void loadWorkspaceCampaignSnapshots();
  }, [currentWorkspace?.id, isConfigured, isDemoMode, customCampaigns]);

  useEffect(() => {
    const loadWorkspaceSummary = async () => {
      if (isDemoMode) {
        setWorkspaceSummary(null);
        setWorkspaceSummaryHistory([]);
        return;
      }

      if (!isConfigured || !currentWorkspace || !supabase) {
        setWorkspaceSummary(null);
        setWorkspaceSummaryHistory([]);
        return;
      }

      const { data: summaryRows, error } = await supabase
        .from('workspace_daily_summaries')
        .select('id, workspace_id, summary_date, provider, total_spend, total_revenue, total_conversions, average_ctr, average_cpm, roas, profit_margin, campaign_count, created_at, updated_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('summary_date', { ascending: false })
        .order('provider', { ascending: true })
        .limit(120);

      if (error) {
        if (!isMissingRelationError(error.message)) {
          console.error('Failed to load workspace daily summaries:', error.message);
        }
        setWorkspaceSummary(null);
        setWorkspaceSummaryHistory([]);
        return;
      }

      const nextRows = (summaryRows || []) as WorkspaceDailySummary[];
      const aggregatedHistory = aggregateSummaryHistoryByDate(nextRows);
      setWorkspaceSummaryHistory(aggregatedHistory);
      setWorkspaceSummary(aggregatedHistory[0] || null);
    };

    void loadWorkspaceSummary();
  }, [currentWorkspace?.id, isConfigured, isDemoMode]);

  useEffect(() => {
    const loadWorkspaceSettings = async () => {
      if (isDemoMode) {
        setWorkspaceSettings(buildDefaultWorkspaceSettings(currentWorkspace?.id || 'demo', currentWorkspace?.name));
        return;
      }

      if (!currentWorkspace) {
        setWorkspaceSettings(null);
        return;
      }

      const { data } = await getWorkspaceSettings(currentWorkspace.id, currentWorkspace.name);
      setWorkspaceSettings(data);
    };

    void loadWorkspaceSettings();
  }, [currentWorkspace?.id, currentWorkspace?.name, isDemoMode]);

  useEffect(() => {
    const loadLeads = async () => {
      if (isDemoMode) {
        setLeads(initialLeads);
        return;
      }

      if (!isConfigured || !currentWorkspace || !supabase) {
        setLeads([]);
        return;
      }

      const { data: leadRows, error } = await supabase
        .from('leads')
        .select(`
          id,
          workspace_id,
          name,
          source,
          campaign,
          value,
          status,
          lead_score,
          insight,
          recommended_action,
          notes,
          creative_name,
          creative_type,
          hook_tag,
          adset_name,
          quality_score,
          ctr,
          cpl,
          conversion_rate,
          lead_date
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('lead_date', { ascending: false })
        .limit(500);

      if (error) {
        if (!isMissingRelationError(error.message)) {
          console.error('Failed to load leads:', error.message);
        }
        setLeads([]);
        return;
      }

      setLeads(mapLeadRowsToLeadData(leadRows || []));
    };

    void loadLeads();
  }, [currentWorkspace?.id, isConfigured, isDemoMode]);

  useEffect(() => {
    if (!isDemoMode) {
      return;
    }

    setCreatives(deriveCreativeCollection(mergeCampaignCollections(adsData, []), leads, customCreatives.length > 0 ? customCreatives : initialCreatives));
  }, [adsData, leads, customCreatives, isDemoMode]);

  useEffect(() => {
    const loadCreatives = async () => {
      if (isDemoMode) {
        return;
      }

      if (!isConfigured || !currentWorkspace || !supabase) {
        setCreatives([]);
        return;
      }

      const { data: creativeRows, error } = await supabase
        .from('creative_snapshots')
        .select(`
          id,
          workspace_id,
          source_platform,
          origin,
          creative_name,
          campaign_name,
          campaign_external_id,
          adset_name,
          ad_name,
          creative_external_id,
          media_type,
          preview_url,
          thumbnail_url,
          hook_type,
          status,
          score,
          ctr,
          link_ctr,
          roas,
          spend,
          impressions,
          link_clicks,
          cost_per_link_click,
          cost_per_result,
          target_cpl,
          max_cpl,
          hook_rate,
          video_views_3s,
          video_views_25,
          video_views_50,
          video_views_75,
          hook_strength,
          message_clarity,
          cta_presence,
          fatigue,
          analysis_summary,
          suggestions,
          snapshot_date,
          created_at,
          updated_at
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('origin', { ascending: false })
        .order('snapshot_date', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(300);

      if (error) {
        if (!isMissingRelationError(error.message)) {
          console.error('Failed to load creative snapshots:', error.message);
        }
        setCreatives(deriveCreativeCollection(adsData, leads, []));
        return;
      }

      if (!creativeRows || creativeRows.length === 0) {
        setCreatives(deriveCreativeCollection(adsData, leads, []));
        return;
      }

      const latestSnapshotByPlatform = new Map<string, string>();
      creativeRows.forEach((row) => {
        if (row.origin !== 'synced' || !row.source_platform || latestSnapshotByPlatform.has(row.source_platform)) {
          return;
        }
        latestSnapshotByPlatform.set(row.source_platform, row.snapshot_date);
      });

      const latestRows = creativeRows.filter((row) =>
        row.origin === 'uploaded' ||
        latestSnapshotByPlatform.get(row.source_platform) === row.snapshot_date
      );

      setCreatives(mapCreativeRowsToCreativeData(latestRows));
    };

    void loadCreatives();
  }, [adsData, leads, currentWorkspace?.id, isConfigured, isDemoMode]);

  useEffect(() => {
    const loadInsights = async () => {
      if (isDemoMode) {
        setInsights(generateDemoInsightsFromAds(adsData));
        return;
      }

      if (!isConfigured || !currentWorkspace || !supabase) {
        setInsights([]);
        return;
      }

      const { data: insightRows, error } = await supabase
        .from('insight_snapshots')
        .select('id, type, severity, message, reasoning, priority, action, action_label, platform, campaign_external_id, campaign_name, created_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to load insight snapshots:', error.message);
        setInsights([]);
        return;
      }

      setInsights(mapInsightRowsToInsightData(insightRows || []));
    };

    void loadInsights();
  }, [adsData, currentWorkspace?.id, isConfigured, isDemoMode]);

  const [pipelineAlerts, setPipelineAlerts] = useState<{ id: string; message: string; severity: 'warning' | 'info' | 'success' }[]>([]);

  useEffect(() => {
    const alerts: { id: string; message: string; severity: 'warning' | 'info' | 'success' }[] = [];
    
    // 1. High-Value Uncontacted Alert
    const highValueNew = leads.filter(l => l.status === 'new' && l.score === 'high');
    if (highValueNew.length > 0) {
      alerts.push({ 
        id: 'alert_high_value_new', 
        message: `Urgent: ${highValueNew.length} high-value leads uncontacted`, 
        severity: 'info' 
      });
    }

    // 2. Pipeline Stagnant Alert
    const stagnantLeads = leads.filter(l => l.status === 'contacted');
    if (stagnantLeads.length > 3) {
      alerts.push({ 
        id: 'alert_bottleneck_contacted', 
        message: `${stagnantLeads.length} leads stuck in Contacted > 3 days`, 
        severity: 'warning' 
      });
    }

    // 3. Winning Source Insight
    const topLead = [...leads].sort((a, b) => b.value - a.value)[0];
    if (topLead) {
      alerts.push({ 
        id: 'alert_top_source', 
        message: `Top campaign "${topLead.campaign}" generating high-quality leads`, 
        severity: 'success' 
      });
    }

    setPipelineAlerts(alerts.slice(0, 2)); // Keep it clean, show only top 2
  }, [leads]);

  const getSmartRecommendation = (lead: LeadData) => {
    if (lead.value >= 1000 && lead.conversionRate >= 10) {
      return 'High Intensity: Call Now';
    }
    if (lead.value >= 500 || lead.quality_score === 'high') {
      return 'Priority Follow-up Recommended';
    }
    if (lead.conversionRate < 3) {
      return 'Monitor lead (low priority)';
    }
    return 'Standard Follow-up: WhatsApp';
  };

  const createCreative = async (creativeInput: CreateCreativeInput) => {
    const analysis = analyzeCreative({
      creativeName: creativeInput.creative_name,
      campaignName: creativeInput.campaign_name,
      platform: creativeInput.platform,
      mediaType: creativeInput.media_type || inferCreativeMediaType(creativeInput.creative_name),
      ctr: 0,
      roas: 0,
      spend: 0,
    });

    const nextCreative: CreativeData = {
      id: `creative_${Date.now()}`,
      workspace_id: currentWorkspace?.id,
      origin: 'uploaded',
      platform: creativeInput.platform,
      creative_name: creativeInput.creative_name.trim(),
      campaign_name: creativeInput.campaign_name?.trim() || undefined,
      adset_name: creativeInput.adset_name?.trim() || undefined,
      ad_name: creativeInput.ad_name?.trim() || undefined,
      media_type: creativeInput.media_type,
      hook_type: inferHookType(creativeInput.creative_name),
      score: analysis.score,
      status: analysis.status,
      CTR: 0,
      ROAS: 0,
      spend: 0,
      imageUrl: creativeInput.preview_url,
      thumbnailUrl: creativeInput.preview_url,
      hook_strength: analysis.hookStrength,
      message_clarity: analysis.messageClarity,
      cta_presence: analysis.ctaPresence,
      fatigue: analysis.fatigue,
      analysis_summary: analysis.summary,
      suggestions: analysis.suggestions,
      snapshot_date: new Date().toISOString().slice(0, 10),
    };

    setCreatives((previous) => mergeCreativeCollections(previous, [nextCreative]));

    if (isDemoMode || !isConfigured || !currentWorkspace || !supabase) {
      setCustomCreatives((previous) => {
        const nextItems = [...previous, nextCreative];
        persistCustomCreatives(currentWorkspace?.id, nextItems);
        return nextItems;
      });
      return nextCreative;
    }

    const payload = {
      workspace_id: currentWorkspace.id,
      source_platform: nextCreative.platform,
      origin: 'uploaded',
      creative_name: nextCreative.creative_name,
      campaign_name: nextCreative.campaign_name || null,
      adset_name: nextCreative.adset_name || null,
      ad_name: nextCreative.ad_name || null,
      media_type: nextCreative.media_type || 'image',
      preview_url: nextCreative.imageUrl || null,
      thumbnail_url: nextCreative.thumbnailUrl || null,
      hook_type: nextCreative.hook_type || null,
      status: nextCreative.status,
      score: nextCreative.score || 0,
      ctr: nextCreative.CTR || 0,
      link_ctr: nextCreative.linkCTR ?? null,
      roas: nextCreative.ROAS || 0,
      spend: nextCreative.spend || 0,
      impressions: nextCreative.impressions ?? null,
      link_clicks: nextCreative.linkClicks ?? null,
      cost_per_link_click: nextCreative.costPerLinkClick ?? null,
      cost_per_result: nextCreative.costPerResult ?? null,
      target_cpl: nextCreative.targetCpl ?? null,
      max_cpl: nextCreative.maxCpl ?? null,
      hook_rate: nextCreative.hookRate ?? null,
      video_views_3s: nextCreative.videoViews3s ?? null,
      video_views_25: nextCreative.videoViews25 ?? null,
      video_views_50: nextCreative.videoViews50 ?? null,
      video_views_75: nextCreative.videoViews75 ?? null,
      hook_strength: nextCreative.hook_strength,
      message_clarity: nextCreative.message_clarity,
      cta_presence: nextCreative.cta_presence,
      fatigue: nextCreative.fatigue,
      analysis_summary: nextCreative.analysis_summary || '',
      ai_verdict: nextCreative.analysis_summary || '',
      suggestions: nextCreative.suggestions || [],
      snapshot_date: nextCreative.snapshot_date,
    };

    const { data, error } = await supabase
      .from('creative_snapshots')
      .insert(payload)
      .select(`
        id,
        workspace_id,
        source_platform,
        origin,
        creative_name,
        campaign_name,
        campaign_external_id,
        adset_name,
        ad_name,
        creative_external_id,
        media_type,
        preview_url,
        thumbnail_url,
        hook_type,
        status,
        score,
        ctr,
        link_ctr,
        roas,
        spend,
        impressions,
        link_clicks,
        cost_per_link_click,
        cost_per_result,
        target_cpl,
        max_cpl,
        hook_rate,
        video_views_3s,
        video_views_25,
        video_views_50,
        video_views_75,
        hook_strength,
        message_clarity,
        cta_presence,
        fatigue,
        analysis_summary,
        suggestions,
        snapshot_date
      `)
      .single();

    if (error) {
      console.error('Failed to create creative:', error.message);
      setCreatives((previous) => previous.filter((creative) => creative.id !== nextCreative.id));
      return null;
    }

    const [persistedCreative] = mapCreativeRowsToCreativeData(data ? [data] : []);
    if (persistedCreative) {
      setCreatives((previous) => mergeCreativeCollections(previous.filter((creative) => creative.id !== nextCreative.id), [persistedCreative]));
    }

    return persistedCreative || nextCreative;
  };

  const createLead = async (leadInput: CreateLeadInput) => {
    const nextLead: LeadData = {
      id: `lead_${Date.now()}`,
      workspace_id: currentWorkspace?.id,
      name: leadInput.name.trim(),
      source: leadInput.source,
      campaign: leadInput.campaign.trim(),
      value: leadInput.value,
      status: leadInput.status || 'new',
      date: new Date().toISOString().slice(0, 10),
      score: leadInput.score,
      insight: leadInput.insight.trim(),
      recommendedAction: leadInput.recommendedAction.trim(),
      notes: leadInput.notes?.trim() || undefined,
      creative_name: leadInput.creative_name.trim(),
      creative_type: leadInput.creative_type,
      hook_tag: leadInput.hook_tag?.trim() || undefined,
      adset_name: leadInput.adset_name?.trim() || undefined,
      quality_score: leadInput.quality_score,
      ctr: leadInput.ctr,
      cpl: leadInput.cpl,
      conversionRate: leadInput.conversionRate,
    };

    setLeads((previous) => [nextLead, ...previous]);

    if (isDemoMode || !isConfigured || !currentWorkspace || !supabase) {
      return nextLead;
    }

    const payload = {
      workspace_id: currentWorkspace.id,
      name: nextLead.name,
      source: nextLead.source,
      campaign: nextLead.campaign,
      value: nextLead.value,
      status: nextLead.status,
      lead_score: nextLead.score,
      insight: nextLead.insight,
      recommended_action: nextLead.recommendedAction,
      notes: nextLead.notes || null,
      creative_name: nextLead.creative_name,
      creative_type: nextLead.creative_type,
      hook_tag: nextLead.hook_tag || null,
      adset_name: nextLead.adset_name || null,
      quality_score: nextLead.quality_score,
      ctr: nextLead.ctr,
      cpl: nextLead.cpl,
      conversion_rate: nextLead.conversionRate,
      lead_date: nextLead.date,
    };

    const { data, error } = await supabase
      .from('leads')
      .insert(payload)
      .select(`
        id,
        workspace_id,
        name,
        source,
        campaign,
        value,
        status,
        lead_score,
        insight,
        recommended_action,
        notes,
        creative_name,
        creative_type,
        hook_tag,
        adset_name,
        quality_score,
        ctr,
        cpl,
        conversion_rate,
        lead_date
      `)
      .single();

    if (error) {
      console.error('Failed to create lead:', error.message);
      setLeads((previous) => previous.filter((lead) => lead.id !== nextLead.id));
      return null;
    }

    const [persistedLead] = mapLeadRowsToLeadData(data ? [data] : []);

    if (persistedLead) {
      setLeads((previous) => [persistedLead, ...previous.filter((lead) => lead.id !== nextLead.id)]);

      void supabase
        .from('lead_activities')
        .insert({
          lead_id: persistedLead.id,
          workspace_id: currentWorkspace.id,
          activity_type: 'created',
          description: `Lead created in ${persistedLead.status} stage`,
          metadata: {
            source: persistedLead.source,
            campaign: persistedLead.campaign,
          },
        })
        .then(({ error: activityError }) => {
          if (activityError) {
            console.error('Failed to log lead activity:', activityError.message);
          }
        });
    }

    return persistedLead || nextLead;
  };

  const updateLead = (id: string, updates: Partial<LeadData>) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, ...updates } : lead
    ));

    if (isDemoMode || !isConfigured || !currentWorkspace || !supabase) {
      return;
    }

    const payload: Record<string, unknown> = {};
    if (updates.status) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.score) payload.lead_score = updates.score;
    if (updates.insight) payload.insight = updates.insight;
    if (updates.recommendedAction) payload.recommended_action = updates.recommendedAction;
    if (updates.quality_score) payload.quality_score = updates.quality_score;
    if (updates.ctr !== undefined) payload.ctr = updates.ctr;
    if (updates.cpl !== undefined) payload.cpl = updates.cpl;
    if (updates.conversionRate !== undefined) payload.conversion_rate = updates.conversionRate;

    if (Object.keys(payload).length === 0) {
      return;
    }

    void supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .eq('workspace_id', currentWorkspace.id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update lead:', error.message);
        }
      });
  };

  const createCampaign = (campaign: {
    campaign_name: string;
    platform: 'meta' | 'google';
    spend: number;
    CTR: number;
    CPM: number;
    ROAS: number;
    conversions: number;
  }) => {
    const nextCampaign = enrichAdsRecord({
      id: `manual_${Date.now()}`,
      campaign_name: campaign.campaign_name,
      spend: campaign.spend,
      CTR: campaign.CTR,
      CPM: campaign.CPM,
      ROAS: campaign.ROAS,
      conversions: campaign.conversions,
      revenue: campaign.spend * campaign.ROAS,
      date: new Date().toISOString(),
      platform: campaign.platform,
    });

    setCustomCampaigns((previous) => {
      const nextCustomCampaigns = [...previous, nextCampaign];
      persistCustomCampaigns(currentWorkspace?.id, nextCustomCampaigns);
      return nextCustomCampaigns;
    });

    setAdsData((previous) => mergeCampaignCollections(previous, [nextCampaign]));
    setCreatives((previous) => mergeCreativeCollections(previous, [deriveCreativeFromCampaign(nextCampaign, leads)]));
  };

  return (
    <DatabaseContext.Provider value={{ 
      currentPage, 
      setCurrentPage, 
      adsData, 
      setAdsData, 
      creatives, 
      setCreatives, 
      insights, 
      setInsights, 
      profitData, 
      setProfitData, 
      isFetching, 
      syncAdsData,
      currency,
      setCurrency,
      formatCurrency,
      leads,
      setLeads,
      createCreative,
      createLead,
      updateLead,
      pipelineAlerts,
      getSmartRecommendation,
      hasCampaignData,
      isRealWorkspace,
      needsFirstSync,
      workspaceSummary,
      workspaceSummaryHistory,
      workspaceSettings,
      aiAssistantEnabled,
      creativeAnalysisEnabled,
      leadGenerationEnabled,
      createCampaign,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
