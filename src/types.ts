export type RoutePage = 'Dashboard' | 'Insights' | 'Creatives' | 'Campaigns' | 'Profit' | 'Leads' | 'Settings';
export type CurrencyCode = 'MYR' | 'USD' | 'GBP';

export interface AdsData {
  id: string;
  campaign_name: string;
  spend: number;
  CTR: number;
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
  creative_name: string;
  hook_type?: string;
  score?: number;
  status: 'WINNING' | 'TESTING' | 'FATIGUE DETECTED' | 'KILL' | 'COLD TEST';
  CTR?: number;
  ROAS?: number;
  imageUrl?: string;
  metrics?: { label: string; value: number; isPrimary?: boolean }[];
  hook_strength: number;
  message_clarity: number;
  cta_presence: number;
  fatigue: 'low' | 'medium' | 'high';
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
