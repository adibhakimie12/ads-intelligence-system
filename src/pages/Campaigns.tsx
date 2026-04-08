import React, { useMemo, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import CampaignTable from '../components/CampaignTable';
import TrendChart from '../components/TrendChart';
import { AdsData } from '../types';
import { evaluateWinningAd } from '../services/creativeAnalysis';
import { Filter, FileDown, TrendingUp, TrendingDown, ArrowUpRight, Target, Zap, AlertCircle, PauseCircle, Calendar, Sparkles, CheckCircle2, RefreshCw, X, Clock3 } from 'lucide-react';

type TrendProvider = 'all' | 'meta' | 'google';
type TimeRange = '7D' | '30D' | '90D';
type SortOption = 'spend_desc' | 'roas_desc' | 'ctr_desc' | 'name_asc';
type RecommendationOption = 'all' | 'Scale Budget' | 'Improve Creative' | 'Adjust Audience' | 'Pause Campaign';
type SummaryView = 'today' | 'yesterday' | 'custom' | 'maximum';

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatWeekLabel = (date: Date) => `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

const aggregateTrendData = (
  history: Array<{ summary_date: string; provider: string; total_spend: number }>,
  timeRange: TimeRange,
  trendProvider: TrendProvider
) => {
  const filteredRows = history
    .filter((summary) => trendProvider === 'all' || summary.provider === trendProvider)
    .sort((left, right) => new Date(left.summary_date).getTime() - new Date(right.summary_date).getTime());

  if (filteredRows.length === 0) {
    return [];
  }

  if (timeRange === '7D') {
    return filteredRows.slice(-7).map((summary) => ({
      label: new Date(summary.summary_date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: summary.total_spend,
    }));
  }

  const grouped = new Map<string, { label: string; value: number; sortKey: number }>();
  const sourceRows = filteredRows.slice(-(timeRange === '30D' ? 30 : 90));

  sourceRows.forEach((summary) => {
    const date = new Date(summary.summary_date);
    const groupDate = timeRange === '30D'
      ? startOfWeek(date)
      : new Date(date.getFullYear(), date.getMonth(), 1);
    const groupKey = groupDate.toISOString().slice(0, 10);
    const current = grouped.get(groupKey);
    const label = timeRange === '30D'
      ? formatWeekLabel(groupDate)
      : groupDate.toLocaleDateString('en-US', { month: 'short' });

    grouped.set(groupKey, {
      label,
      value: (current?.value || 0) + summary.total_spend,
      sortKey: groupDate.getTime(),
    });
  });

  return [...grouped.values()]
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ label, value }) => ({ label, value }));
};

const fallbackTrendData = {
  '7D': [
    { label: 'Mon', value: 1200 },
    { label: 'Tue', value: 1500 },
    { label: 'Wed', value: 1100 },
    { label: 'Thu', value: 1800 },
    { label: 'Fri', value: 2200 },
    { label: 'Sat', value: 1900 },
    { label: 'Sun', value: 2400 },
  ],
  '30D': [
    { label: 'Week 1', value: 8500 },
    { label: 'Week 2', value: 10200 },
    { label: 'Week 3', value: 9800 },
    { label: 'Week 4', value: 12500 },
  ],
  '90D': [
    { label: 'Jan', value: 35000 },
    { label: 'Feb', value: 42000 },
    { label: 'Mar', value: 38000 },
  ]
};

const deriveStatus = (campaign: AdsData) => {
  if (campaign.delivery?.toLowerCase() === 'scheduled') return 'scheduled';
  if (campaign.status?.toLowerCase() === 'scheduled') return 'scheduled';
  if (campaign.status?.toLowerCase() === 'paused') return 'paused';
  if (campaign.ROAS > 3) return 'scaling';
  if (campaign.ROAS >= 1.5) return 'testing';
  return 'underperforming';
};

const deriveRecommendation = (campaign: AdsData) => {
  if (deriveStatus(campaign) === 'scheduled') return null;
  if (campaign.status?.toLowerCase() === 'paused') return null;
  if (campaign.ROAS < 1) return 'Pause Campaign';
  if (campaign.ROAS > 3) return 'Scale Budget';
  if (campaign.CTR < 1) return 'Improve Creative';
  if (campaign.CPM > 20) return 'Adjust Audience';
  return null;
};

const escapeCsvCell = (value: string | number | null | undefined) => {
  const normalized = String(value ?? '');
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
};

const formatDelta = (value: number, suffix = '%') => {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
  const sign = value > 0 ? '+' : '';
  return `${sign}${rounded}${suffix}`;
};

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const aggregateSummaryRows = (
  rows: Array<{ total_spend: number; total_revenue: number; total_conversions: number; average_ctr: number; average_cpm: number; roas: number; campaign_count: number }>
) => {
  if (rows.length === 0) {
    return {
      totalSpend: 0,
      totalRevenue: 0,
      totalResults: 0,
      avgCtr: 0,
      avgCpm: 0,
      avgRoas: 0,
      totalCampaignCount: 0,
    };
  }

  const totals = rows.reduce((acc, row) => ({
    totalSpend: acc.totalSpend + Number(row.total_spend || 0),
    totalRevenue: acc.totalRevenue + Number(row.total_revenue || 0),
    totalResults: acc.totalResults + Number(row.total_conversions || 0),
    totalCtr: acc.totalCtr + Number(row.average_ctr || 0),
    totalCpm: acc.totalCpm + Number(row.average_cpm || 0),
    totalRoas: acc.totalRoas + Number(row.roas || 0),
    totalCampaignCount: acc.totalCampaignCount + Number(row.campaign_count || 0),
  }), {
    totalSpend: 0,
    totalRevenue: 0,
    totalResults: 0,
    totalCtr: 0,
    totalCpm: 0,
    totalRoas: 0,
    totalCampaignCount: 0,
  });

  return {
    totalSpend: totals.totalSpend,
    totalRevenue: totals.totalRevenue,
    totalResults: totals.totalResults,
    avgCtr: totals.totalCtr / rows.length,
    avgCpm: totals.totalCpm / rows.length,
    avgRoas: totals.totalRoas / rows.length,
    totalCampaignCount: totals.totalCampaignCount,
  };
};

const KPITrend = ({ title, value, trend, isPositive }: { title: string; value: string; trend: string; isPositive: boolean }) => (
  <div className="panel-surface rounded-[2rem] p-6 transition-shadow group hover:shadow-md">
    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">{title}</p>
    <div className="flex items-end justify-between">
      <h3 className="font-headline text-2xl font-black text-on-surface">{value}</h3>
      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {trend}
      </div>
    </div>
  </div>
);

const MetricCard = ({ label, value, helper }: { label: string; value: string; helper: string }) => (
  <div className="panel-surface rounded-[2rem] p-6">
    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-on-surface-variant">{label}</p>
    <p className="mt-3 font-headline text-[2.2rem] font-black tracking-[-0.04em] text-on-surface">{value}</p>
    <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">{helper}</p>
  </div>
);

const SummaryCard = ({ title, count, desc, icon: Icon, color }: { title: string; count: number; desc: string; icon: React.ElementType; color: string }) => (
  <div className="panel-surface flex items-center gap-4 rounded-[2rem] p-5 transition-colors group hover:border-primary-container/30">
    <div className={`rounded-xl bg-surface-container-low p-3 ${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xl font-black text-on-surface">{count}</span>
        <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">{title}</span>
      </div>
      <p className="text-xs font-medium text-on-surface-variant/70">{desc}</p>
    </div>
  </div>
);

function CampaignModal({
  title,
  campaign,
  formatCurrency,
  onClose,
  onSave,
}: {
  title: string;
  campaign: AdsData | null;
  formatCurrency: (value: number) => string;
  onClose: () => void;
  onSave?: (updates: AdsData) => void;
}) {
  const [draft, setDraft] = useState<AdsData | null>(campaign);

  React.useEffect(() => {
    setDraft(campaign);
  }, [campaign]);

  if (!draft) return null;

  const readOnly = !onSave;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[2rem] border border-outline-variant/20 bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-secondary">Campaign Operations</p>
            <h3 className="mt-2 text-3xl font-black text-on-surface">{title}</h3>
            <p className="mt-2 text-sm text-on-surface-variant">{draft.campaign_name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-surface-container-high">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Campaign Name</span>
            <input
              value={draft.campaign_name}
              disabled={readOnly}
              onChange={(event) => setDraft((previous) => previous ? { ...previous, campaign_name: event.target.value } : previous)}
              className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Platform</span>
            <select
              value={draft.platform || 'meta'}
              disabled={readOnly}
              onChange={(event) => setDraft((previous) => previous ? { ...previous, platform: event.target.value as 'meta' | 'google' } : previous)}
              className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none"
            >
              <option value="meta">Meta</option>
              <option value="google">Google</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Spend</span>
            <input type="number" value={draft.spend} disabled={readOnly} onChange={(event) => setDraft((previous) => previous ? { ...previous, spend: Number(event.target.value) } : previous)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Revenue</span>
            <input type="number" value={draft.revenue} disabled={readOnly} onChange={(event) => setDraft((previous) => previous ? { ...previous, revenue: Number(event.target.value) } : previous)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">CTR</span>
            <input type="number" step="0.01" value={draft.CTR} disabled={readOnly} onChange={(event) => setDraft((previous) => previous ? { ...previous, CTR: Number(event.target.value) } : previous)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">CPM</span>
            <input type="number" step="0.01" value={draft.CPM} disabled={readOnly} onChange={(event) => setDraft((previous) => previous ? { ...previous, CPM: Number(event.target.value) } : previous)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">ROAS</span>
            <input type="number" step="0.01" value={draft.ROAS} disabled={readOnly} onChange={(event) => setDraft((previous) => previous ? { ...previous, ROAS: Number(event.target.value) } : previous)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Conversions</span>
            <input type="number" value={draft.conversions} disabled={readOnly} onChange={(event) => setDraft((previous) => previous ? { ...previous, conversions: Number(event.target.value) } : previous)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] bg-surface-container-low p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Delivery</p>
            <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <p>Status: <span className="font-bold text-on-surface">{draft.delivery || 'Unknown'}</span></p>
              <p>Budget: <span className="font-bold text-on-surface">{draft.budget !== undefined ? formatCurrency(draft.budget) : '-'}</span></p>
              <p>Reach: <span className="font-bold text-on-surface">{draft.reach !== undefined ? Math.round(draft.reach).toLocaleString() : '-'}</span></p>
              <p>Impressions: <span className="font-bold text-on-surface">{draft.impressions !== undefined ? Math.round(draft.impressions).toLocaleString() : '-'}</span></p>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-surface-container-low p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Cost Metrics</p>
            <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <p>Cost / Result: <span className="font-bold text-on-surface">{draft.costPerResult !== undefined ? formatCurrency(draft.costPerResult) : '-'}</span></p>
              <p>CPM: <span className="font-bold text-on-surface">{formatCurrency(draft.CPM)}</span></p>
              <p>CPC Link: <span className="font-bold text-on-surface">{draft.costPerLinkClick !== undefined ? formatCurrency(draft.costPerLinkClick) : '-'}</span></p>
              <p>Spend: <span className="font-bold text-on-surface">{formatCurrency(draft.spend)}</span></p>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-surface-container-low p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Click Quality</p>
            <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <p>CTR (All): <span className="font-bold text-on-surface">{draft.CTR.toFixed(2)}%</span></p>
              <p>CTR (Link): <span className="font-bold text-on-surface">{draft.linkCTR !== undefined ? `${draft.linkCTR.toFixed(2)}%` : '-'}</span></p>
              <p>Link Clicks: <span className="font-bold text-on-surface">{draft.linkClicks !== undefined ? Math.round(draft.linkClicks).toLocaleString() : '-'}</span></p>
              <p>Results: <span className="font-bold text-on-surface">{draft.conversions.toLocaleString()}</span></p>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-surface-container-low p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Video Quality</p>
            <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <p>3s Plays: <span className="font-bold text-on-surface">{draft.videoViews3s !== undefined ? Math.round(draft.videoViews3s).toLocaleString() : '-'}</span></p>
              <p>VV 25%: <span className="font-bold text-on-surface">{draft.videoViews25 !== undefined ? Math.round(draft.videoViews25).toLocaleString() : '-'}</span></p>
              <p>VV 50%: <span className="font-bold text-on-surface">{draft.videoViews50 !== undefined ? Math.round(draft.videoViews50).toLocaleString() : '-'}</span></p>
              <p>VV 75%: <span className="font-bold text-on-surface">{draft.videoViews75 !== undefined ? Math.round(draft.videoViews75).toLocaleString() : '-'}</span></p>
              <p>Rate 75% VV: <span className="font-bold text-on-surface">{draft.rate75VV !== undefined ? `${(draft.rate75VV * 100).toFixed(2)}%` : '-'}</span></p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Recommendation: <span className="font-bold text-on-surface">{deriveRecommendation(draft) || 'Monitoring'}</span>
          <span className="mx-2">|</span>
          Status: <span className="font-bold text-on-surface">{deriveStatus(draft)}</span>
          <span className="mx-2">|</span>
          Revenue formatted: <span className="font-bold text-on-surface">{formatCurrency(draft.revenue)}</span>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-outline-variant/30 px-5 py-3 text-sm font-bold text-on-surface">Close</button>
          {onSave && (
            <button type="button" onClick={() => onSave(draft)} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white">Save Campaign</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const { adsData, setAdsData, createCampaign, formatCurrency, needsFirstSync, workspaceSummary, workspaceSummaryHistory, syncAdsData, isFetching, creatives, leads, profitData } = useDatabase();
  const [activeFilter, setActiveFilter] = useState('All');
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');
  const [trendProvider, setTrendProvider] = useState<TrendProvider>('all');
  const [summaryView, setSummaryView] = useState<SummaryView>('today');
  const [customSummaryFromDate, setCustomSummaryFromDate] = useState(formatDateInputValue(new Date()));
  const [customSummaryToDate, setCustomSummaryToDate] = useState(formatDateInputValue(new Date()));
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'meta' | 'google'>('all');
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationOption>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('spend_desc');
  const [selectedCampaign, setSelectedCampaign] = useState<AdsData | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<AdsData | null>(null);
  const [pageFeedback, setPageFeedback] = useState<string | null>(null);

  const activeTrend = useMemo(() => {
    if (workspaceSummaryHistory.length === 0) {
      return fallbackTrendData[timeRange];
    }
    return aggregateTrendData(workspaceSummaryHistory, timeRange, trendProvider);
  }, [workspaceSummaryHistory, timeRange, trendProvider]);

  const todayKey = formatDateInputValue(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = formatDateInputValue(yesterdayDate);

  const summaryProvider = platformFilter === 'all' ? 'all' : platformFilter;
  const summaryHistoryRows = useMemo(
    () => workspaceSummaryHistory.filter((row) => summaryProvider === 'all' || row.provider === summaryProvider),
    [workspaceSummaryHistory, summaryProvider]
  );

  const normalizedRangeStart = customSummaryFromDate <= customSummaryToDate ? customSummaryFromDate : customSummaryToDate;
  const normalizedRangeEnd = customSummaryFromDate <= customSummaryToDate ? customSummaryToDate : customSummaryFromDate;

  const selectedSummaryRows = useMemo(() => {
    if (summaryView === 'maximum') {
      return summaryHistoryRows;
    }
    if (summaryView === 'custom') {
      return summaryHistoryRows.filter((row) => row.summary_date >= normalizedRangeStart && row.summary_date <= normalizedRangeEnd);
    }
    const selectedSummaryDate = summaryView === 'today' ? todayKey : yesterdayKey;
    return summaryHistoryRows.filter((row) => row.summary_date === selectedSummaryDate);
  }, [summaryHistoryRows, summaryView, normalizedRangeStart, normalizedRangeEnd, todayKey, yesterdayKey]);

  const selectedSummaryMetrics = useMemo(
    () => aggregateSummaryRows(selectedSummaryRows),
    [selectedSummaryRows]
  );

  const hasSelectedSummaryData = selectedSummaryRows.length > 0;
  const summaryViewLabel = summaryView === 'today'
    ? 'Today'
    : summaryView === 'yesterday'
    ? 'Yesterday'
    : summaryView === 'custom'
    ? `${new Date(normalizedRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to ${new Date(normalizedRangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Maximum / Total';

  const totalSpend = adsData.reduce((acc, ad) => acc + ad.spend, 0);
  const totalRevenue = adsData.reduce((acc, ad) => acc + ad.revenue, 0);
  const totalResults = adsData.reduce((acc, ad) => acc + ad.conversions, 0);
  const avgROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00';
  const avgCTR = adsData.length > 0 ? (adsData.reduce((acc, ad) => acc + ad.CTR, 0) / adsData.length).toFixed(2) : '0.00';
  const campaignsWithCostPerResult = adsData.filter((campaign) => campaign.costPerResult !== undefined);
  const campaignsWithLinkCtr = adsData.filter((campaign) => campaign.linkCTR !== undefined);
  const campaignsWithLinkCpc = adsData.filter((campaign) => campaign.costPerLinkClick !== undefined);
  const campaignsWithRate75VV = adsData.filter((campaign) => campaign.rate75VV !== undefined);
  const avgCostPerResult = campaignsWithCostPerResult.length > 0
    ? formatCurrency(campaignsWithCostPerResult.reduce((sum, campaign) => sum + (campaign.costPerResult || 0), 0) / campaignsWithCostPerResult.length)
    : formatCurrency(0);
  const avgLinkCtr = campaignsWithLinkCtr.length > 0
    ? `${(campaignsWithLinkCtr.reduce((sum, campaign) => sum + (campaign.linkCTR || 0), 0) / campaignsWithLinkCtr.length).toFixed(2)}%`
    : '0.00%';
  const avgLinkCpc = campaignsWithLinkCpc.length > 0
    ? formatCurrency(campaignsWithLinkCpc.reduce((sum, campaign) => sum + (campaign.costPerLinkClick || 0), 0) / campaignsWithLinkCpc.length)
    : formatCurrency(0);
  const avgRate75VV = campaignsWithRate75VV.length > 0
    ? `${((campaignsWithRate75VV.reduce((sum, campaign) => sum + (campaign.rate75VV || 0), 0) / campaignsWithRate75VV.length) * 100).toFixed(2)}%`
    : '0.00%';
  const avgRecommendationQuality = adsData.filter((ad) => deriveRecommendation(ad)).length;
  const targetCpl = profitData.CPL > 0 ? profitData.CPL : 20;
  const maxCpl = targetCpl * 1.5;

  const campaignCreativeMap = useMemo(() => {
    const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const map = new Map<string, { label: string; tone: string; detail?: string }>();

    adsData.forEach((campaign) => {
      const linkedCreative = creatives.find((creative) =>
        creative.campaign_external_id === campaign.id ||
        normalized(creative.campaign_name || '').includes(normalized(campaign.campaign_name)) ||
        normalized(campaign.campaign_name).includes(normalized(creative.campaign_name || ''))
      );

      if (!linkedCreative) {
        map.set(campaign.id, null as never);
        return;
      }

      const linkedLeads = leads.filter((lead) => lead.creative_name === linkedCreative.creative_name);
      const evaluation = evaluateWinningAd({ creative: linkedCreative, linkedLeads, targetCpl, maxCpl });
      const mediaLabel = linkedCreative.media_type === 'video' ? 'Video' : 'Poster';
      const tone = evaluation.verdict === 'WINNING'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : evaluation.verdict === 'ADJUST'
          ? 'bg-amber-100 text-amber-700 border-amber-200'
          : evaluation.verdict === 'KILL'
            ? 'bg-rose-100 text-rose-700 border-rose-200'
            : 'bg-slate-100 text-slate-600 border-slate-200';

      map.set(campaign.id, {
        label: `${evaluation.verdict} ${mediaLabel}`,
        tone,
        detail: linkedCreative.creative_name,
      });
    });

    return map;
  }, [adsData, creatives, leads, targetCpl, maxCpl]);

  const campaignCreativeSummary = useMemo(() => {
    const winners = adsData.filter((campaign) => {
      const driver = campaignCreativeMap.get(campaign.id);
      return driver?.label.startsWith('WINNING');
    });

    return {
      poster: winners.filter((campaign) => campaignCreativeMap.get(campaign.id)?.label.includes('Poster')).slice(0, 3),
      video: winners.filter((campaign) => campaignCreativeMap.get(campaign.id)?.label.includes('Video')).slice(0, 3),
    };
  }, [adsData, campaignCreativeMap]);

  const counts = {
    scaling: adsData.filter((ad) => deriveStatus(ad) === 'scaling').length,
    scheduled: adsData.filter((ad) => deriveStatus(ad) === 'scheduled').length,
    testing: adsData.filter((ad) => deriveStatus(ad) === 'testing').length,
    underperforming: adsData.filter((ad) => deriveStatus(ad) === 'underperforming').length,
    paused: adsData.filter((ad) => deriveStatus(ad) === 'paused').length,
  };

  const filteredCampaigns = useMemo(() => {
    const scoped = adsData.filter((campaign) => {
      const status = deriveStatus(campaign);
      const recommendation = deriveRecommendation(campaign);
      const matchesStatus = activeFilter === 'All' ? true : status === activeFilter.toLowerCase();
      const matchesPlatform = platformFilter === 'all' ? true : campaign.platform === platformFilter;
      const matchesRecommendation = recommendationFilter === 'all' ? true : recommendation === recommendationFilter;
      const matchesSearch = searchTerm.trim()
        ? campaign.campaign_name.toLowerCase().includes(searchTerm.trim().toLowerCase())
        : true;
      return matchesStatus && matchesPlatform && matchesRecommendation && matchesSearch;
    });

    const sorted = [...scoped];
    sorted.sort((left, right) => {
      if (sortOption === 'roas_desc') return right.ROAS - left.ROAS;
      if (sortOption === 'ctr_desc') return right.CTR - left.CTR;
      if (sortOption === 'name_asc') return left.campaign_name.localeCompare(right.campaign_name);
      return right.spend - left.spend;
    });
    return sorted;
  }, [adsData, activeFilter, platformFilter, recommendationFilter, searchTerm, sortOption]);

  const growthOpportunities = useMemo(
    () => adsData.filter((ad) => Boolean(deriveRecommendation(ad))).sort((a, b) => b.ROAS - a.ROAS).slice(0, 3),
    [adsData]
  );

  const filterCount = [platformFilter !== 'all', recommendationFilter !== 'all', searchTerm.trim().length > 0, sortOption !== 'spend_desc'].filter(Boolean).length;

  const kpiTrends = useMemo(() => {
    const [currentSummary, previousSummary] = workspaceSummaryHistory;

    if (currentSummary && previousSummary) {
      return {
        spend: calculateChange(Number(currentSummary.total_spend || 0), Number(previousSummary.total_spend || 0)),
        revenue: calculateChange(Number(currentSummary.total_revenue || 0), Number(previousSummary.total_revenue || 0)),
        roas: Number(currentSummary.roas || 0) - Number(previousSummary.roas || 0),
        ctr: Number(currentSummary.average_ctr || 0) - Number(previousSummary.average_ctr || 0),
      };
    }

    const scalingCount = counts.scaling;
    const pausedCount = counts.paused;

    return {
      spend: adsData.length > 0 ? 12 : 0,
      revenue: adsData.length > 0 ? 24 : 0,
      roas: scalingCount - pausedCount * 0.15,
      ctr: avgRecommendationQuality > 0 ? 0.2 : -0.2,
    };
  }, [workspaceSummaryHistory, counts.scaling, counts.paused, adsData.length, avgRecommendationQuality]);

  const lastSyncLabel = workspaceSummary?.updated_at
    ? new Date(workspaceSummary.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'No sync yet';

  const periodMetricCards = [
    {
      label: 'Total Spend',
      value: formatCurrency(hasSelectedSummaryData ? selectedSummaryMetrics.totalSpend : totalSpend),
      helper: hasSelectedSummaryData
        ? `${summaryViewLabel} spend from synced daily summaries`
        : 'Showing latest synced campaign snapshot because no summary exists for this date',
    },
    {
      label: 'Total Results',
      value: (hasSelectedSummaryData ? selectedSummaryMetrics.totalResults : totalResults).toLocaleString(),
      helper: hasSelectedSummaryData
        ? `${summaryViewLabel} result total from synced campaign summaries`
        : 'Showing latest synced campaign result totals because no summary exists for this date',
    },
    {
      label: 'Avg CTR (All)',
      value: `${(hasSelectedSummaryData ? selectedSummaryMetrics.avgCtr : Number(avgCTR)).toFixed(2)}%`,
      helper: hasSelectedSummaryData
        ? `${summaryViewLabel} average CTR across synced summaries`
        : 'Showing latest synced campaign CTR because no summary exists for this date',
    },
    {
      label: 'ROAS',
      value: `${(hasSelectedSummaryData ? selectedSummaryMetrics.avgRoas : Number(avgROAS)).toFixed(2)}x`,
      helper: hasSelectedSummaryData
        ? `${summaryViewLabel} return on ad spend from synced summaries`
        : 'Showing latest synced campaign ROAS because no summary exists for this date',
    },
  ];

  const snapshotMetricCards = [
    {
      label: 'Avg Cost / Result',
      value: avgCostPerResult,
      helper: 'Latest campaign snapshot cost efficiency for WhatsApp lead campaigns',
    },
    {
      label: 'Avg CTR (Link)',
      value: avgLinkCtr,
      helper: 'Latest click-quality signal for WhatsApp lead campaigns',
    },
    {
      label: 'Total Link Clicks',
      value: adsData.reduce((sum, campaign) => sum + (campaign.linkClicks || 0), 0).toLocaleString(),
      helper: 'Latest synced traffic volume across visible campaigns',
    },
    {
      label: 'Avg CPC Link',
      value: avgLinkCpc,
      helper: 'Latest average cost per link click before the lead step',
    },
    {
      label: 'Avg Rate 75% VV',
      value: avgRate75VV,
      helper: '75% video plays divided by 25% video plays',
    },
  ];

  const exportReport = () => {
    const headers = ['Campaign Name', 'Platform', 'Status', 'Spend', 'CTR', 'CPM', 'ROAS', 'Conversions', 'Recommendation'];
    const rows = filteredCampaigns.map((campaign) => [
      campaign.campaign_name,
      campaign.platform || 'meta',
      deriveStatus(campaign),
      campaign.spend,
      campaign.CTR,
      campaign.CPM,
      campaign.ROAS,
      campaign.conversions,
      deriveRecommendation(campaign) || 'Monitoring',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campaign-report.csv';
    link.click();
    URL.revokeObjectURL(url);
    setPageFeedback('Campaign report exported.');
  };

  const updateCampaignRecord = (updated: AdsData) => {
    setAdsData((previous) => previous.map((campaign) => (campaign.id === updated.id ? updated : campaign)));
    setEditingCampaign(null);
    setSelectedCampaign(updated);
    setPageFeedback(`${updated.campaign_name} updated.`);
  };

  const duplicateCampaign = (campaign: AdsData) => {
    createCampaign({
      campaign_name: `${campaign.campaign_name}_Copy`,
      platform: campaign.platform || 'meta',
      spend: campaign.spend,
      CTR: campaign.CTR,
      CPM: campaign.CPM,
      ROAS: campaign.ROAS,
      conversions: campaign.conversions,
    });
    setPageFeedback(`${campaign.campaign_name} duplicated.`);
  };

  const pauseCampaign = (campaign: AdsData) => {
    setAdsData((previous) => previous.map((item) => item.id === campaign.id ? { ...item, status: 'paused' } : item));
    setPageFeedback(`${campaign.campaign_name} paused.`);
  };

  const applyAllInsights = () => {
    if (growthOpportunities.length === 0) {
      setPageFeedback('No actionable campaign insights to apply yet.');
      return;
    }

    setAdsData((previous) => previous.map((campaign) => {
      const recommendation = deriveRecommendation(campaign);
      if (recommendation === 'Pause Campaign') {
        return { ...campaign, status: 'paused' };
      }
      if (recommendation === 'Scale Budget') {
        return { ...campaign, status: 'scaling', spend: Number((campaign.spend * 1.15).toFixed(2)) };
      }
      if (recommendation === 'Improve Creative' || recommendation === 'Adjust Audience') {
        return { ...campaign, status: 'testing' };
      }
      return campaign;
    }));

    setPageFeedback('Growth opportunities applied to campaign statuses.');
  };

  const resetFilters = () => {
    setPlatformFilter('all');
    setRecommendationFilter('all');
    setSearchTerm('');
    setSortOption('spend_desc');
    setPageFeedback('Campaign filters cleared.');
  };

  const handleSyncCampaigns = async () => {
    await syncAdsData('all');
    setPageFeedback('Campaign sync completed.');
  };

  const filters = ['All', 'Scaling', 'Scheduled', 'Testing', 'Underperforming', 'Paused'];

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-20 lg:px-8">
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">
            <Target size={14} />
            Operations
          </div>
          <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">Campaign Performance</h1>
          <p className="mt-2 font-medium text-on-surface-variant">Monitor, prioritize, and optimize all active campaigns.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilterPanel((current) => !current)} className="flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
            <Filter size={18} />
            Filter {filterCount > 0 ? `(${filterCount})` : ''}
          </button>
          <button onClick={exportReport} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-90">
            <FileDown size={18} />
            Export Report
          </button>
        </div>
      </div>

      {pageFeedback && (
        <div className="mb-6 flex items-start gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5" />
          <div className="flex-1">{pageFeedback}</div>
          <button onClick={() => setPageFeedback(null)} className="text-emerald-800"><X size={16} /></button>
        </div>
      )}

      {showFilterPanel && (
        <div className="panel-surface mb-8 grid gap-4 rounded-[2rem] p-6 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Search Campaign</span>
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Meta Winter Sale..." className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Platform</span>
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as 'all' | 'meta' | 'google')} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none">
              <option value="all">All</option>
              <option value="meta">Meta</option>
              <option value="google">Google</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Recommendation</span>
            <select value={recommendationFilter} onChange={(event) => setRecommendationFilter(event.target.value as RecommendationOption)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none">
              <option value="all">All</option>
              <option value="Scale Budget">Scale Budget</option>
              <option value="Improve Creative">Improve Creative</option>
              <option value="Adjust Audience">Adjust Audience</option>
              <option value="Pause Campaign">Pause Campaign</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Sort By</span>
            <select value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none">
              <option value="spend_desc">Highest Spend</option>
              <option value="roas_desc">Highest ROAS</option>
              <option value="ctr_desc">Highest CTR</option>
              <option value="name_asc">Campaign Name</option>
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={resetFilters} type="button" className="w-full rounded-2xl border border-outline-variant/30 px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-secondary">Summary Window</p>
          <h2 className="mt-2 text-xl font-black text-on-surface">Campaign Totals by Date</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Switch between today, yesterday, a custom date, or maximum total to compare your Meta results more clearly.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-container-high p-1.5">
            {([
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'custom', label: 'Custom Range' },
              { id: 'maximum', label: 'Maximum / Total' },
            ] as Array<{ id: SummaryView; label: string }>).map((option) => (
              <button
                key={option.id}
                onClick={() => setSummaryView(option.id)}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                  summaryView === option.id ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {summaryView === 'custom' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">From</span>
                <input
                  type="date"
                  value={customSummaryFromDate}
                  onChange={(event) => setCustomSummaryFromDate(event.target.value)}
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">To</span>
                <input
                  type="date"
                  value={customSummaryToDate}
                  onChange={(event) => setCustomSummaryToDate(event.target.value)}
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface outline-none"
                />
              </label>
            </div>
          )}
          <p className="text-xs font-medium text-on-surface-variant">
            {hasSelectedSummaryData
              ? `${summaryViewLabel} summary loaded${summaryProvider === 'all' ? '' : ` for ${summaryProvider}`}.`
              : `No synced summary found for ${summaryViewLabel.toLowerCase()}, so the cards fall back to the latest snapshot.`}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {periodMetricCards.map((card) => (
          <div key={card.label}>
            <MetricCard label={card.label} value={card.value} helper={card.helper} />
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {snapshotMetricCards.map((card) => (
          <div key={card.label}>
            <MetricCard label={card.label} value={card.value} helper={card.helper} />
          </div>
        ))}
      </div>

      <div className="mb-12 rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
        The first four cards follow your selected date window. The second row stays on the latest synced campaign snapshot for traffic and video diagnostics.
      </div>

      <div className="panel-surface mb-12 rounded-[2rem] p-8 lg:p-10">
        <div className="mb-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-headline text-xl font-black text-on-surface">Weekly Trend Analysis</h3>
              <p className="text-xs font-medium text-on-surface-variant">{workspaceSummaryHistory.length === 0 ? 'Performance visualization for the selected period.' : 'Summary history grouped by the selected time range and provider.'}</p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 md:items-end">
            <div className="flex items-center gap-1 rounded-xl bg-surface-container-high p-1">
              {(['7D', '30D', '90D'] as TimeRange[]).map((range) => (
                <button key={range} onClick={() => setTimeRange(range)} className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>{range}</button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-surface-container-high p-1">
              {(['all', 'meta', 'google'] as TrendProvider[]).map((provider) => (
                <button key={provider} onClick={() => setTrendProvider(provider)} className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${trendProvider === provider ? 'bg-secondary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>{provider === 'all' ? 'All' : provider}</button>
              ))}
            </div>
          </div>
        </div>
        {activeTrend.length > 0 ? <TrendChart data={activeTrend} /> : <div className="rounded-[1.5rem] border border-dashed border-outline-variant/30 bg-surface-container-low p-8"><p className="text-sm font-bold text-on-surface">No summary history for this provider yet</p><p className="mt-2 text-sm text-on-surface-variant">Once this provider starts syncing into workspace summaries, its grouped trend history will appear here.</p></div>}
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard title="Scaling" count={counts.scaling} desc="High ROI / Ready to increase" icon={ArrowUpRight} color="text-secondary" />
            <SummaryCard title="Scheduled" count={counts.scheduled} desc="Approved / Waiting for publish time" icon={Clock3} color="text-sky-600" />
            <SummaryCard title="Testing" count={counts.testing} desc="Early phase / Performance pending" icon={Zap} color="text-slate-600" />
            <SummaryCard title="Underperforming" count={counts.underperforming} desc="Below target / Attention needed" icon={AlertCircle} color="text-orange-600" />
            <SummaryCard title="Paused" count={counts.paused} desc="Stopped / Historical data" icon={PauseCircle} color="text-red-600" />
          </div>

          <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-4">
            {filters.map((filter) => (
              <button key={filter} onClick={() => setActiveFilter(filter)} className={`rounded-full px-6 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeFilter === filter ? 'bg-primary text-white shadow-lg shadow-black/15' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>{filter}</button>
            ))}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {needsFirstSync ? (
              <div className="panel-surface rounded-[2rem] p-10">
                <p className="text-lg font-bold text-on-surface">No campaign snapshots yet</p>
                <p className="mt-2 text-sm text-on-surface-variant">Run your first live Meta sync from Settings after selecting the workspace's primary ad account.</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="panel-surface rounded-[2rem] p-10">
                <p className="text-lg font-bold text-on-surface">No campaigns match these filters</p>
                <p className="mt-2 text-sm text-on-surface-variant">Try clearing the current filters or syncing campaign data again to refresh the list.</p>
                <button onClick={resetFilters} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white">
                  Reset Filters
                </button>
              </div>
            ) : (
              <CampaignTable
                campaigns={filteredCampaigns}
                getCreativeDriver={(campaign) => campaignCreativeMap.get(campaign.id) || null}
                onView={(campaign) => setSelectedCampaign(campaign)}
                onEdit={(campaign) => setEditingCampaign(campaign)}
                onDuplicate={duplicateCampaign}
                onPause={pauseCampaign}
              />
            )}
          </div>
        </div>

        <div className="sticky top-8 space-y-6 lg:col-span-4">
          <div className="dark-panel relative overflow-hidden rounded-[2rem] p-8 text-white group">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-container/15 blur-3xl transition-all duration-700 group-hover:bg-primary-container/25" />
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-primary shadow-lg shadow-black/20">
                <Sparkles size={20} />
              </div>
              <h3 className="font-headline text-xl font-black text-white">Growth Opportunities</h3>
            </div>
            <div className="mb-10 space-y-6">
              {growthOpportunities.length > 0 ? growthOpportunities.map((campaign) => (
                <button key={campaign.id} type="button" onClick={() => setSelectedCampaign(campaign)} className="flex w-full gap-4 rounded-2xl text-left transition-colors hover:bg-white/5">
                  <CheckCircle2 size={18} className="mt-1 shrink-0 text-primary-container" />
                  <div>
                    <p className="mb-1 text-sm font-bold text-white">{deriveRecommendation(campaign)}</p>
                    <p className="text-xs leading-relaxed text-white/72">{campaign.campaign_name} is at {campaign.ROAS.toFixed(2)}x ROAS with {campaign.CTR.toFixed(2)}% CTR.</p>
                  </div>
                </button>
              )) : <div className="text-sm text-white/72">Run a sync to generate live growth opportunities from campaign performance.</div>}
            </div>
            <button onClick={applyAllInsights} disabled={growthOpportunities.length === 0} className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-[0.16em] transition-all ${growthOpportunities.length === 0 ? 'bg-white/10 text-white/40' : 'bg-primary-container text-primary hover:brightness-105'}`}>
              Apply All Insights
              <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="panel-surface rounded-[2rem] p-8">
            <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-on-surface">Winning Creative Drivers</h4>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-secondary">Poster-led Campaigns</p>
                <div className="mt-3 space-y-3">
                  {campaignCreativeSummary.poster.length > 0 ? campaignCreativeSummary.poster.map((campaign) => (
                    <button key={`poster-${campaign.id}`} onClick={() => setSelectedCampaign(campaign)} className="block w-full rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-left">
                      <p className="text-sm font-bold text-on-surface">{campaign.campaign_name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{campaignCreativeMap.get(campaign.id)?.detail || 'Winning poster creative linked'}</p>
                    </button>
                  )) : <p className="text-sm text-on-surface-variant">No winning poster-driven campaigns yet.</p>}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-secondary">Video-led Campaigns</p>
                <div className="mt-3 space-y-3">
                  {campaignCreativeSummary.video.length > 0 ? campaignCreativeSummary.video.map((campaign) => (
                    <button key={`video-${campaign.id}`} onClick={() => setSelectedCampaign(campaign)} className="block w-full rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-left">
                      <p className="text-sm font-bold text-on-surface">{campaign.campaign_name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{campaignCreativeMap.get(campaign.id)?.detail || 'Winning video creative linked'}</p>
                    </button>
                  )) : <p className="text-sm text-on-surface-variant">No winning video-driven campaigns yet.</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="panel-surface rounded-[2rem] p-8">
            <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-on-surface">System Status</h4>
            <div className="flex items-center justify-between border-b border-outline-variant/5 py-3">
              <span className="text-xs font-medium text-on-surface-variant">Auto-Optimization</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600">{adsData.length > 0 ? 'Data Ready' : 'Waiting'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/5 py-3">
              <span className="text-xs font-medium text-on-surface-variant">Last Sync</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{lastSyncLabel}</span>
            </div>
            <div className="mt-4">
              <button onClick={() => void handleSyncCampaigns()} disabled={isFetching} className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold ${isFetching ? 'bg-surface-container-high text-on-surface-variant' : 'bg-primary text-white'}`}>
                <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                {isFetching ? 'Syncing...' : 'Sync Campaign Data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <CampaignModal title="Campaign Details" campaign={selectedCampaign} formatCurrency={formatCurrency} onClose={() => setSelectedCampaign(null)} />
      <CampaignModal title="Edit Campaign" campaign={editingCampaign} formatCurrency={formatCurrency} onClose={() => setEditingCampaign(null)} onSave={updateCampaignRecord} />
    </main>
  );
}
