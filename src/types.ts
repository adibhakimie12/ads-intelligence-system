export type RoutePage = 'Dashboard' | 'Insights' | 'Creatives' | 'Campaigns' | 'Profit' | 'Leads' | 'Settings';
export type CurrencyCode = 'MYR' | 'USD' | 'GBP';
export type PlanTier = 'free' | 'pro';
export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type MetaConnectionStatus = 'not_connected' | 'connected' | 'expired' | 'error';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan_tier: PlanTier;
  owner_user_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface MetaConnection {
  id: string;
  workspace_id: string;
  meta_user_id?: string | null;
  status: MetaConnectionStatus;
  connected_account_name?: string | null;
  connected_account_id?: string | null;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAdAccount {
  id: string;
  workspace_id: string;
  meta_connection_id: string;
  meta_ad_account_id: string;
  ad_account_name: string;
  account_status?: string | null;
  account_currency?: string | null;
  available_funds?: number | null;
  amount_spent?: number | null;
  daily_spending_limit?: number | null;
  manual_available_funds?: number | null;
  is_primary: boolean;
  created_at: string;
}

export interface WorkspaceDailySummary {
  id: string;
  workspace_id: string;
  summary_date: string;
  provider: string;
  total_spend: number;
  total_revenue: number;
  total_conversions: number;
  average_ctr: number;
  average_cpm: number;
  roas: number;
  profit_margin: number;
  campaign_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSettings {
  workspace_id: string;
  system_name: string;
  currency: CurrencyCode;
  timezone: string;
  attribution_window: string;
  meta_pixel_enabled: boolean;
  meta_conversions_enabled: boolean;
  google_analytics_enabled: boolean;
  google_tag_manager_enabled: boolean;
  ai_assistant_enabled: boolean;
  creative_analysis_enabled: boolean;
  lead_generation_enabled: boolean;
  warning_alerts_enabled: boolean;
  low_ctr_alert_enabled: boolean;
  high_cpm_alert_enabled: boolean;
  roas_drop_alert_enabled: boolean;
  daily_summary_alert_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdsData {
  id: string;
  campaign_name: string;
  delivery?: string;
  resultsLabel?: string;
  spend: number;
  budget?: number;
  reach?: number;
  impressions?: number;
  costPerResult?: number;
  CTR: number;
  linkCTR?: number;
  linkClicks?: number;
  costPerLinkClick?: number;
  videoViews3s?: number;
  hookRate?: number;
  videoViews25?: number;
  videoViews50?: number;
  videoViews75?: number;
  rate75VV?: number;
  CPM: number;
  ROAS: number;
  conversions: number;
  revenue: number;
  date: string;
  platform?: 'meta' | 'google';
  status?: 'active' | 'paused' | 'testing' | 'scaling' | 'underperforming';
  recommendation?: 'Scale Budget' | 'Improve Creative' | 'Adjust Audience' | 'Pause Campaign';
}

export interface CreativeData {
  id: string;
  workspace_id?: string;
  origin?: 'synced' | 'uploaded';
  platform?: 'meta' | 'google';
  creative_name: string;
  campaign_name?: string;
  campaign_external_id?: string;
  adset_name?: string;
  ad_name?: string;
  creative_external_id?: string;
  media_type?: 'video' | 'image';
  hook_type?: string;
  score?: number;
  status: 'WINNING' | 'TESTING' | 'FATIGUE DETECTED' | 'KILL' | 'COLD TEST';
  CTR?: number;
  linkCTR?: number;
  ROAS?: number;
  spend?: number;
  impressions?: number;
  linkClicks?: number;
  costPerLinkClick?: number;
  costPerResult?: number;
  targetCpl?: number;
  maxCpl?: number;
  hookRate?: number;
  videoViews3s?: number;
  videoViews25?: number;
  videoViews50?: number;
  videoViews75?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  metrics?: { label: string; value: number; isPrimary?: boolean }[];
  hook_strength: number;
  message_clarity: number;
  cta_presence: number;
  fatigue: 'low' | 'medium' | 'high';
  analysis_summary?: string;
  suggestions?: string[];
  snapshot_date?: string;
}

export interface CreateCreativeInput {
  creative_name: string;
  platform: 'meta' | 'google';
  media_type: 'video' | 'image';
  preview_url?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
}

export type InsightType = 'attention' | 'efficiency' | 'performance' | 'ads' | 'creative' | 'funnel' | 'sales';
export type InsightPriority = 'high' | 'medium' | 'low';

export type InsightSeverity = 'attention' | 'efficiency' | 'performance';

export interface InsightData {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  message: string;
  reasoning: string;
  priority: InsightPriority;
  action: string;
  actionLabel: string;
  platform?: 'meta' | 'google';
  campaignExternalId?: string;
  campaignName?: string;
}

export interface ProfitData {
  id: string;
  product_price: number;
  cost: number;
  closing_rate: number;
  CPL: number;
  cogs?: number;
  operational_costs?: number;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

export interface LeadData {
  id: string;
  workspace_id?: string;
  name: string;
  source: 'meta' | 'google';
  campaign: string;
  value: number;
  status: LeadStatus;
  date: string;
  score: 'high' | 'medium' | 'low';
  insight: string;
  recommendedAction: string;
  notes?: string;
  creative_name: string;
  creative_type: 'video' | 'image';
  hook_tag?: string;
  adset_name?: string;
  quality_score: 'high' | 'medium' | 'low';
  ctr: number;
  cpl: number;
  conversionRate: number;
}

export interface CreateLeadInput {
  name: string;
  source: 'meta' | 'google';
  campaign: string;
  value: number;
  status?: LeadStatus;
  score: 'high' | 'medium' | 'low';
  insight: string;
  recommendedAction: string;
  notes?: string;
  creative_name: string;
  creative_type: 'video' | 'image';
  hook_tag?: string;
  adset_name?: string;
  quality_score: 'high' | 'medium' | 'low';
  ctr: number;
  cpl: number;
  conversionRate: number;
}
