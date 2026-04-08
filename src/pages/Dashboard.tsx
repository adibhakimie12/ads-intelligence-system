import React, { useMemo, useState } from 'react';
import {
  Plus,
  AlertTriangle,
  Rocket,
  PauseCircle,
  SquareSlash,
  BadgeCheck,
  BrainCircuit,
  X,
} from 'lucide-react';
import InsightCard from '../components/InsightCard';
import MetricCard from '../components/MetricCard';
import CampaignTable from '../components/CampaignTable';
import ProfitChart from '../components/ProfitChart';
import { useDatabase } from '../context/DatabaseContext';
import { useTheme } from '../context/ThemeContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { getMetaSyncRangeLabel, getStoredMetaSyncRange, isAggregateMetaSyncRange } from '../utils/metaSyncRange';

const FORECAST_DATA = [
  { day: 'Mon', profit: 40 },
  { day: 'Tue', profit: 55 },
  { day: 'Wed', profit: 45 },
  { day: 'Thu', profit: 70 },
  { day: 'Fri', profit: 85 },
  { day: 'Sat', profit: 75 },
  { day: 'Sun', profit: 95, isCurrent: true },
];

const inferCreativeLabel = (campaignName: string) => {
  const normalized = campaignName
    .replace(/meta|google|campaign|retargeting|shopping|search/gi, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  return normalized || campaignName;
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const ACTION_STYLES = {
  scale: {
    icon: Rocket,
    badge: 'Scale',
    tone: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  pause: {
    icon: PauseCircle,
    badge: 'Pause',
    tone: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  stop: {
    icon: SquareSlash,
    badge: 'Stop',
    tone: 'bg-rose-100 text-rose-700 border-rose-200',
  },
} as const;

function CreateCampaignModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: {
    campaign_name: string;
    platform: 'meta' | 'google';
    spend: number;
    CTR: number;
    CPM: number;
    ROAS: number;
    conversions: number;
  }) => void;
}) {
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState<'meta' | 'google'>('meta');
  const [spend, setSpend] = useState('1200');
  const [ctr, setCtr] = useState('1.8');
  const [cpm, setCpm] = useState('14');
  const [roas, setRoas] = useState('2.4');
  const [conversions, setConversions] = useState('18');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onCreate({
      campaign_name: campaignName.trim(),
      platform,
      spend: Number(spend),
      CTR: Number(ctr),
      CPM: Number(cpm),
      ROAS: Number(roas),
      conversions: Number(conversions),
    });

    setCampaignName('');
    setPlatform('meta');
    setSpend('1200');
    setCtr('1.8');
    setCpm('14');
    setRoas('2.4');
    setConversions('18');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Campaign Builder</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Create Managed Campaign</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a campaign to the workspace so your operators can monitor it alongside live Meta sync data.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Campaign Name</span>
              <input
                type="text"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="Meta_Prospecting_Q2_Scale"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Platform</span>
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value as 'meta' | 'google')}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              >
                <option value="meta">Meta Ads</option>
                <option value="google">Google Ads</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Spend</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={spend}
                onChange={(event) => setSpend(event.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">CTR (%)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ctr}
                onChange={(event) => setCtr(event.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">CPM</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cpm}
                onChange={(event) => setCpm(event.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">ROAS</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={roas}
                onChange={(event) => setRoas(event.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900">Conversions / Quality Leads</span>
            <input
              type="number"
              min="0"
              step="1"
              value={conversions}
              onChange={(event) => setConversions(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            />
          </label>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900">
            This creates a managed workspace campaign inside the app. Your live Meta campaign performance still comes from the real sync pipeline in Settings.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!campaignName.trim()}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const { currentWorkspace } = useWorkspace();
  const {
    adsData,
    insights,
    formatCurrency,
    needsFirstSync,
    workspaceSummary,
    workspaceSummaryHistory,
    leads,
    createCampaign,
  } = useDatabase();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creationMessage, setCreationMessage] = useState<string | null>(null);
  const activeMetaSyncRange = getStoredMetaSyncRange(currentWorkspace?.id);
  const activeMetaSyncRangeLabel = getMetaSyncRangeLabel(activeMetaSyncRange);
  const prefersSnapshotMetrics = isAggregateMetaSyncRange(activeMetaSyncRange) || !workspaceSummary;

  const snapshotTotals = useMemo(() => ({
    spend: adsData.reduce((acc, curr) => acc + curr.spend, 0),
    revenue: adsData.reduce((acc, curr) => acc + curr.revenue, 0),
    avgCtr: adsData.length > 0 ? adsData.reduce((acc, curr) => acc + curr.CTR, 0) / adsData.length : 0,
    avgCpm: adsData.length > 0 ? adsData.reduce((acc, curr) => acc + curr.CPM, 0) / adsData.length : 0,
  }), [adsData]);

  const totalSpend = prefersSnapshotMetrics ? snapshotTotals.spend : (workspaceSummary?.total_spend ?? snapshotTotals.spend);
  const totalRevenue = prefersSnapshotMetrics ? snapshotTotals.revenue : (workspaceSummary?.total_revenue ?? snapshotTotals.revenue);
  const globalROAS = prefersSnapshotMetrics
    ? (totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0')
    : workspaceSummary
      ? workspaceSummary.roas.toFixed(2)
      : (totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0');
  const avgCTR = prefersSnapshotMetrics
    ? snapshotTotals.avgCtr.toFixed(2)
    : workspaceSummary
      ? workspaceSummary.average_ctr.toFixed(2)
      : snapshotTotals.avgCtr.toFixed(2);
  const avgCPM = prefersSnapshotMetrics
    ? snapshotTotals.avgCpm.toFixed(2)
    : workspaceSummary
      ? workspaceSummary.average_cpm.toFixed(2)
      : snapshotTotals.avgCpm.toFixed(2);

  const forecastData = workspaceSummaryHistory.length > 0
    ? [...workspaceSummaryHistory]
        .slice(0, 7)
        .reverse()
        .map((summary, index, items) => ({
          day: new Date(summary.summary_date).toLocaleDateString('en-US', { weekday: 'short' }),
          profit: Math.max(0, summary.total_revenue - summary.total_spend),
          isCurrent: index === items.length - 1,
        }))
    : FORECAST_DATA;
  const estimatedProfit = forecastData.reduce((sum, item) => sum + item.profit, 0);

  const campaignsToScale = useMemo(
    () => adsData
      .filter((campaign) => campaign.ROAS >= 3 && campaign.CTR >= 1.5 && campaign.CPM <= 20)
      .sort((left, right) => right.ROAS - left.ROAS)
      .slice(0, 3),
    [adsData]
  );
  const campaignsToPause = useMemo(
    () => adsData
      .filter((campaign) => campaign.ROAS < 1.5 || campaign.CTR < 1)
      .sort((left, right) => left.ROAS - right.ROAS)
      .slice(0, 3),
    [adsData]
  );
  const campaignsToStop = useMemo(
    () => adsData
      .filter((campaign) => campaign.ROAS < 0.8 || (campaign.spend >= 1000 && campaign.conversions === 0))
      .sort((left, right) => left.ROAS - right.ROAS)
      .slice(0, 3),
    [adsData]
  );

  const bestCreativeSignal = useMemo(
    () => [...adsData]
      .sort((left, right) => {
        const leftScore = (left.ROAS * 100) + (left.CTR * 25) - left.CPM;
        const rightScore = (right.ROAS * 100) + (right.CTR * 25) - right.CPM;
        return rightScore - leftScore;
      })[0],
    [adsData]
  );

  const weakCreativeSignal = useMemo(
    () => [...adsData]
      .sort((left, right) => (left.CTR + left.ROAS) - (right.CTR + right.ROAS))[0],
    [adsData]
  );

  const leadByCampaign = useMemo(() => {
    const nextMap = new Map<string, { total: number; high: number; value: number }>();

    leads.forEach((lead) => {
      const current = nextMap.get(lead.campaign) || { total: 0, high: 0, value: 0 };
      current.total += 1;
      if (lead.quality_score === 'high') {
        current.high += 1;
      }
      current.value += lead.value;
      nextMap.set(lead.campaign, current);
    });

    return nextMap;
  }, [leads]);

  const bestQualityLeadCampaign = useMemo(
    () => [...adsData]
      .map((campaign) => {
        const leadStats = leadByCampaign.get(campaign.campaign_name) || { total: 0, high: 0, value: 0 };
        const qualityRate = leadStats.total > 0 ? leadStats.high / leadStats.total : 0;
        const cpl = leadStats.total > 0 ? campaign.spend / leadStats.total : campaign.spend;

        return {
          ...campaign,
          leadCount: leadStats.total,
          highLeadCount: leadStats.high,
          qualityRate,
          leadValue: leadStats.value,
          cpl,
        };
      })
      .sort((left, right) => {
        const leftScore = (left.qualityRate * 100) + (left.ROAS * 10) - left.cpl;
        const rightScore = (right.qualityRate * 100) + (right.ROAS * 10) - right.cpl;
        return rightScore - leftScore;
      })[0],
    [adsData, leadByCampaign]
  );

  const bestCampaign = [...adsData].sort((left, right) => right.ROAS - left.ROAS)[0];

  const metrics = [
    { label: 'Spend', value: formatCurrency(totalSpend), trend: -2.4, trendLabel: '-2.4% vs last week', isPrimary: false },
    { label: 'Revenue', value: formatCurrency(totalRevenue), trend: 12.5, trendLabel: '+12.5% vs last week', isPrimary: false },
    { label: 'ROAS', value: `${globalROAS}x`, trend: 4.2, trendLabel: '+4.2% vs last week', isPrimary: true },
    { label: 'CTR', value: `${avgCTR}%`, trend: -0.2, trendLabel: '-0.2% vs last week', isPrimary: false },
  ];

  const creativeMetrics = [
    {
      label: 'Creative Win Rate',
      value: `${adsData.length > 0 ? Math.round((campaignsToScale.length / adsData.length) * 100) : 0}%`,
      detail: `${campaignsToScale.length} campaigns ready to scale from creative performance`,
    },
    {
      label: 'Average Creative CPM',
      value: formatCurrency(average(adsData.map((campaign) => campaign.CPM))),
      detail: 'Lower CPM usually means cheaper reach and healthier auction fit',
    },
    {
      label: 'Quality Lead Engine',
      value: bestQualityLeadCampaign ? `${Math.round(bestQualityLeadCampaign.qualityRate * 100)}%` : '0%',
      detail: bestQualityLeadCampaign
        ? `${bestQualityLeadCampaign.campaign_name} is sending the strongest lead quality right now`
        : 'Connect or create campaigns to calculate quality lead efficiency',
    },
  ];

  const commandSections = [
    { key: 'scale', title: 'Scale Now', campaigns: campaignsToScale },
    { key: 'pause', title: 'Pause & Repair', campaigns: campaignsToPause },
    { key: 'stop', title: 'Stop Spending', campaigns: campaignsToStop },
  ] as const;

  return (
    <main className="mx-auto max-w-[1360px] px-6 lg:px-8">
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={(input) => {
          createCampaign(input);
          setCreationMessage(`${input.campaign_name} was added to the workspace command center.`);
        }}
      />

      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Executive Snapshot</p>
          <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">
            Intelligence Overview
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium text-on-surface-variant">
            Manage campaigns, read live Meta Ads performance, surface creative winners, and decide which campaigns should scale, pause, or stop.
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Active Meta sync window: {activeMetaSyncRangeLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white shadow-lg shadow-black/15 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus size={20} />
          New Campaign
        </button>
      </div>

      {creationMessage && (
        <div className="mb-8 flex items-start gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
          <BadgeCheck size={18} className="mt-0.5" />
          <div className="flex-1">
            <p>{creationMessage}</p>
            <p className="mt-1 text-emerald-700/80">
              It is now visible inside the dashboard and campaign table. Live Meta performance will keep syncing from Settings.
            </p>
          </div>
          <button type="button" onClick={() => setCreationMessage(null)} className="text-emerald-700 transition hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="mb-16">
        <div className="panel-surface rounded-[2rem] p-8 lg:p-10">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-secondary">Priority Queue</p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface">Critical Insights & Actions</h2>
            </div>
            <p className="text-sm font-medium text-on-surface-variant">High-signal recommendations ranked for immediate operator attention.</p>
          </div>
          {needsFirstSync ? (
            <div className="rounded-[1.5rem] border border-dashed border-outline-variant/30 bg-surface-container-low p-8">
              <p className="text-sm font-bold text-on-surface">No synced campaign data yet</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Connect Meta, choose a primary ad account, and run your first live sync from Settings to generate insights here.
              </p>
            </div>
          ) : insights.length === 0 ? (
            <p className="text-on-surface-variant">No critical insights at this time.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {insights.slice(0, 3).map((insight) => (
                <InsightCard
                  key={insight.id}
                  severity={insight.severity}
                  title={insight.message}
                  reasoning={insight.reasoning}
                  actionLabel={insight.actionLabel}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-16">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            label={metric.label}
            value={metric.value}
            trend={metric.trend}
            trendLabel={metric.trendLabel}
            isPrimary={metric.isPrimary}
          />
        ))}
      </div>

      {prefersSnapshotMetrics && (
        <div className="mb-12 rounded-[1.5rem] border border-outline-variant/25 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
          Dashboard totals are following the latest synced Meta snapshot for <span className="font-bold text-on-surface">{activeMetaSyncRangeLabel}</span>, so they stay aligned with your broader Campaigns totals.
        </div>
      )}

      <section className="mb-16">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="panel-surface rounded-[2rem] p-8 lg:p-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BrainCircuit size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Ad Ops</p>
                <h2 className="mt-1 font-headline text-2xl font-bold text-on-surface">Campaign Command Center</h2>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {commandSections.map((section) => {
                const config = ACTION_STYLES[section.key];
                const Icon = config.icon;

                return (
                  <div key={section.key} className={`rounded-[1.5rem] border px-4 py-5 sm:px-5 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${config.tone}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold leading-snug ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{section.title}</p>
                          <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {section.campaigns.length} campaign{section.campaigns.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {section.campaigns.length > 0 ? section.campaigns.map((campaign) => (
                        <div key={campaign.id} className={`overflow-hidden rounded-2xl border px-4 py-4 shadow-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-white bg-white'}`}>
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className={`min-w-0 flex-1 line-clamp-3 text-sm font-semibold leading-snug ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                {campaign.campaign_name}
                              </p>
                              <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${config.tone}`}>
                                {config.badge}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`grid grid-cols-1 gap-2 sm:grid-cols-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                <div className={`rounded-xl px-3 py-2 ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-slate-50'}`}>
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em]">ROAS</p>
                                  <p className={`mt-1 text-sm font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{campaign.ROAS.toFixed(2)}x</p>
                                </div>
                                <div className={`rounded-xl px-3 py-2 ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-slate-50'}`}>
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em]">CTR</p>
                                  <p className={`mt-1 text-sm font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{campaign.CTR.toFixed(2)}%</p>
                                </div>
                                <div className={`rounded-xl px-3 py-2 ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-slate-50'}`}>
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em]">CPM</p>
                                  <p className={`mt-1 text-sm font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(campaign.CPM)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className={`rounded-2xl border border-dashed px-4 py-5 text-sm ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
                          No campaigns in this bucket yet.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel-surface rounded-[2rem] p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Winning Creative</p>
              <h3 className="mt-3 text-2xl font-black font-headline text-on-surface">
                {bestCreativeSignal ? inferCreativeLabel(bestCreativeSignal.campaign_name) : 'Waiting for creative data'}
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">
                {bestCreativeSignal
                  ? `Best creative signal is coming from ${bestCreativeSignal.campaign_name} with ${bestCreativeSignal.ROAS.toFixed(2)}x ROAS, ${bestCreativeSignal.CTR.toFixed(2)}% CTR, and ${formatCurrency(bestCreativeSignal.CPM)} CPM.`
                  : 'Sync a Meta account or create a campaign to analyze creative quality.'}
              </p>
            </div>

            <div className="panel-surface rounded-[2rem] p-8">
              <div className="flex items-center gap-2 text-secondary">
                <AlertTriangle size={18} strokeWidth={2.5} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Creative Risk</p>
              </div>
              <h3 className="mt-3 text-2xl font-black font-headline text-on-surface">
                {weakCreativeSignal ? inferCreativeLabel(weakCreativeSignal.campaign_name) : 'No weak creative signal'}
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">
                {weakCreativeSignal
                  ? `${weakCreativeSignal.campaign_name} is the weakest creative signal right now with ${weakCreativeSignal.CTR.toFixed(2)}% CTR and ${weakCreativeSignal.ROAS.toFixed(2)}x ROAS.`
                  : 'Low-engagement creatives will show here once campaign data is available.'}
              </p>
            </div>

            <div className="panel-surface rounded-[2rem] p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Quality Lead Winner</p>
              <h3 className="mt-3 text-2xl font-black font-headline text-on-surface">
                {bestQualityLeadCampaign ? bestQualityLeadCampaign.campaign_name : 'No lead quality signal yet'}
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">
                {bestQualityLeadCampaign
                  ? `${bestQualityLeadCampaign.highLeadCount}/${bestQualityLeadCampaign.leadCount} tracked leads are high quality, with an estimated CPL of ${formatCurrency(bestQualityLeadCampaign.cpl)}.`
                  : 'When leads are attributed to campaigns, the strongest quality-lead source will show here.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {creativeMetrics.map((item) => (
            <div key={item.label} className="panel-surface rounded-[2rem] p-7">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-on-surface-variant">{item.label}</p>
              <p className="mt-3 font-headline text-[2.8rem] font-black tracking-[-0.04em] text-on-surface">{item.value}</p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Active Campaigns</h3>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Plus size={18} />
            Add Managed Campaign
          </button>
        </div>
        {needsFirstSync ? (
          <div className="panel-surface rounded-[2rem] p-10">
            <p className="text-lg font-bold text-on-surface">Campaigns will appear after the first sync</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              This workspace is connected, but it does not have any stored campaign snapshots yet.
            </p>
          </div>
        ) : (
          <CampaignTable campaigns={adsData} />
        )}
      </section>

      <section className="grid grid-cols-12 gap-8 items-start mb-20">
        <div className="panel-surface col-span-12 rounded-[2rem] p-8 lg:col-span-8 lg:p-10">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h4 className="text-2xl font-bold font-headline text-on-surface">Profit Forecast</h4>
                <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                  {workspaceSummaryHistory.length > 0 ? 'Live Summary Trend' : 'Demo Forecast'}
                </span>
              </div>
              <p className="text-sm font-medium text-on-surface-variant mt-2">Based on last 7 days performance trend</p>
            </div>
            <div className="text-right">
              <p className="text-on-surface-variant text-sm font-medium uppercase tracking-widest mb-1">Estimated 7-Day Profit</p>
              <span className="font-headline text-3xl font-black text-secondary">+{formatCurrency(estimatedProfit)}</span>
            </div>
          </div>

          <div className="mt-6 mb-2">
            <ProfitChart data={forecastData} />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="panel-surface rounded-[2rem] p-8">
            <h5 className="font-bold text-sm uppercase tracking-widest mb-4 text-on-surface-variant">Top Revenue Driver</h5>
            <p className="text-2xl font-black font-headline text-on-surface">
              {bestCampaign ? bestCampaign.campaign_name : 'Waiting for campaign data'}
            </p>
            <p className="text-on-surface-variant text-sm mt-2">
              {bestCampaign
                ? `ROAS: ${bestCampaign.ROAS.toFixed(2)}x | Spend: ${formatCurrency(bestCampaign.spend)}`
                : 'Run a sync to surface your best-performing campaign here.'}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-secondary/15 bg-secondary/10 p-8 transition-all group hover:shadow-md">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-secondary" />
            <div className="mb-4 flex items-center gap-2 text-secondary">
              <AlertTriangle size={18} strokeWidth={2.5} />
              <h5 className="font-bold text-sm uppercase tracking-widest">Creative Efficiency Watch</h5>
            </div>
            <p className="font-headline text-xl font-black text-on-surface">
              {bestCreativeSignal ? inferCreativeLabel(bestCreativeSignal.campaign_name) : 'No creative leader yet'}
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-on-surface-variant">
              {bestCreativeSignal
                ? `This creative is winning with CPM ${formatCurrency(bestCreativeSignal.CPM)} and CTR ${bestCreativeSignal.CTR.toFixed(2)}%, making it the strongest current ad-quality signal.`
                : 'Once campaign data is available, the strongest creative efficiency signal will appear here.'}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

