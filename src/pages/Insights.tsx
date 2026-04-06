import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  MessageCircle,
  MonitorPlay,
  MousePointerClick,
  Target,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { useTheme } from '../context/ThemeContext';
import type { AdsData, InsightData } from '../types';
import { evaluateWinningAd } from '../services/creativeAnalysis';

type InsightCategoryId = 'all' | 'ads' | 'creative' | 'funnel' | 'sales';

const categories = [
  { id: 'all', title: 'All', desc: 'Every active recommendation in one view' },
  { id: 'ads', title: 'Ads', desc: 'Performance, budget, bidding, and targeting' },
  { id: 'creative', title: 'Creative', desc: 'Hooks, messaging, CTR, and fatigue' },
  { id: 'funnel', title: 'Funnel', desc: 'Landing page or conversion path issues' },
  { id: 'sales', title: 'Sales', desc: 'Lead quality and close-rate opportunities' },
] as const;

const quickSignalIconMap = {
  ads: Target,
  creative: MonitorPlay,
  funnel: MousePointerClick,
  sales: MessageCircle,
} as const;

const priorityWeight = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

const severityWeight = {
  attention: 3,
  efficiency: 2,
  performance: 1,
} as const;

const EXISTING_POST_PATTERN = /\s*\[Existing Post ([^\]]+)\]\s*$/i;
const LONG_TOKEN_PATTERN = /(?:^|\s)([a-f0-9]{24,}|[A-Za-z0-9_-]{28,})(?=\s|$)/g;

const cleanCreativeTitle = (value: string) =>
  value
    .replace(EXISTING_POST_PATTERN, '')
    .replace(LONG_TOKEN_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const looksLikePlayableVideoUrl = (value?: string) =>
  typeof value === 'string'
  && value.trim().length > 0
  && !/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(value);

const isLikelyVideoCreative = (creative: { media_type?: 'image' | 'video'; imageUrl?: string; thumbnailUrl?: string; creative_name: string; ad_name?: string }) =>
  creative.media_type === 'video'
  || looksLikePlayableVideoUrl(creative.imageUrl)
  || looksLikePlayableVideoUrl(creative.thumbnailUrl)
  || /\b(video|reel|story|clip|ugc)\b/i.test(`${creative.creative_name} ${creative.ad_name || ''}`);

const getPlatformStyles = (platform?: 'meta' | 'google') =>
  platform === 'meta'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-orange-100 text-orange-700';

const getPriorityStyles = (priority: InsightData['priority']) =>
  priority === 'high'
    ? 'bg-rose-100 text-rose-700'
    : priority === 'medium'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-600';

const getSeverityStyles = (severity: InsightData['severity']) =>
  severity === 'attention'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : severity === 'efficiency'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const buildEvidenceForInsight = (
  insight: InsightData,
  adsData: AdsData[],
  creatives: ReturnType<typeof useDatabase>['creatives'],
  leads: ReturnType<typeof useDatabase>['leads']
) => {
  const normalizedMessage = normalize(insight.message);
  const linkedCampaign = adsData.find((campaign) =>
    insight.campaignExternalId ? campaign.id === insight.campaignExternalId : false
  ) || adsData.find((campaign) =>
    insight.campaignName ? campaign.campaign_name === insight.campaignName : false
  ) || adsData.find((campaign) => {
    const normalizedCampaign = normalize(campaign.campaign_name);
    return normalizedMessage.includes(normalizedCampaign) || normalizedCampaign.includes(normalizedMessage);
  }) || adsData.find((campaign) => normalize(insight.reasoning).includes(normalize(campaign.campaign_name)));

  const linkedCreative = linkedCampaign
    ? creatives.find((creative) => normalize(creative.creative_name).includes(normalize(linkedCampaign.campaign_name)))
    : creatives.find((creative) => normalizedMessage.includes(normalize(creative.creative_name)));

  const relatedLeads = linkedCampaign
    ? leads.filter((lead) => lead.campaign === linkedCampaign.campaign_name)
    : [];

  const highQualityLeads = relatedLeads.filter((lead) => lead.quality_score === 'high').length;
  const averageConversionRate = relatedLeads.length > 0
    ? relatedLeads.reduce((sum, lead) => sum + lead.conversionRate, 0) / relatedLeads.length
    : 0;

  return {
    linkedCampaign,
    linkedCreative,
    relatedLeads,
    highQualityLeads,
    averageConversionRate,
  };
};

export default function InsightsPage() {
  const { theme } = useTheme();
  const { insights, adsData, creatives, leads, formatCurrency, needsFirstSync, profitData } = useDatabase();
  const [activeCategory, setActiveCategory] = useState<InsightCategoryId>('all');
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);

  const winningAdsSummary = useMemo(() => {
    const targetCpl = profitData.CPL > 0 ? profitData.CPL : 20;
    const maxCpl = targetCpl * 1.5;

    const evaluated = creatives.map((creative) => {
      const linkedLeads = leads.filter((lead) => lead.creative_name === creative.creative_name);
      const evaluation = evaluateWinningAd({ creative, linkedLeads, targetCpl, maxCpl });
      return { creative, evaluation };
    });

    const posters = evaluated.filter((item) => !isLikelyVideoCreative(item.creative));
    const videos = evaluated.filter((item) => isLikelyVideoCreative(item.creative));

    const topPoster = posters
      .filter((item) => item.evaluation.verdict === 'WINNING')
      .sort((left, right) => (right.creative.score || 0) - (left.creative.score || 0))[0] || posters[0] || null;

    const topVideo = videos
      .filter((item) => item.evaluation.verdict === 'WINNING')
      .sort((left, right) => (right.creative.score || 0) - (left.creative.score || 0))[0] || videos[0] || null;

    const needsAdjust = evaluated.filter((item) => item.evaluation.verdict === 'ADJUST').slice(0, 3);
    const needsKill = evaluated.filter((item) => item.evaluation.verdict === 'KILL').slice(0, 3);

    return {
      targetCpl,
      maxCpl,
      topPoster,
      topVideo,
      needsAdjust,
      needsKill,
    };
  }, [creatives, leads, profitData.CPL]);

  const quickSignals = useMemo(() => ([
    {
      id: 'ads-signal',
      category: 'ads' as const,
      title: 'Ads Cost Health',
      label: adsData.some((campaign) => campaign.CPM > 25) ? 'Needs Attention' : 'Healthy',
      status: adsData.some((campaign) => campaign.CPM > 25) ? 'alert' : 'good',
      description: adsData.some((campaign) => campaign.CPM > 25)
        ? 'At least one campaign is running with expensive delivery and may need audience, placement, or budget adjustment.'
        : 'Current campaign cost levels are still inside the expected working range.',
      action: 'Review campaign costs',
    },
    {
      id: 'creative-signal',
      category: 'creative' as const,
      title: 'Creative Hook Health',
      label: adsData.some((campaign) => campaign.CTR < 1) ? 'Needs Attention' : 'Healthy',
      status: adsData.some((campaign) => campaign.CTR < 1) ? 'warning' : 'good',
      description: adsData.some((campaign) => campaign.CTR < 1)
        ? 'Some campaigns are under 1% CTR, which usually means the hook, angle, or creative fatigue needs work.'
        : 'CTR signals look healthy across the current campaign set.',
      action: 'Check creatives',
    },
    {
      id: 'funnel-signal',
      category: 'funnel' as const,
      title: 'Landing Page Health',
      label: insights.some((insight) => insight.type === 'funnel') ? 'Needs Attention' : 'Healthy',
      status: insights.some((insight) => insight.type === 'funnel') ? 'warning' : 'good',
      description: insights.some((insight) => insight.type === 'funnel')
        ? 'The system detected a possible landing-page or conversion-path issue that should be reviewed before scaling.'
        : 'No active landing-page or funnel issues are being surfaced right now.',
      action: 'Inspect landing page',
    },
    {
      id: 'sales-signal',
      category: 'sales' as const,
      title: 'Sales Follow-up Health',
      label: insights.some((insight) => insight.type === 'sales') ? 'Needs Attention' : 'Healthy',
      status: insights.some((insight) => insight.type === 'sales') ? 'alert' : 'good',
      description: insights.some((insight) => insight.type === 'sales')
        ? 'Sales-side signals suggest lead quality, response speed, or closing efficiency needs attention.'
        : 'No urgent sales-side issues are being highlighted right now.',
      action: 'Review sales flow',
    },
  ]), [adsData, insights]);

  const sortedInsights = useMemo(
    () => [...insights].sort((left, right) => {
      const rightScore = priorityWeight[right.priority] * 10 + severityWeight[right.severity];
      const leftScore = priorityWeight[left.priority] * 10 + severityWeight[left.severity];
      return rightScore - leftScore;
    }),
    [insights]
  );

  const filteredInsights = useMemo(
    () => activeCategory === 'all'
      ? sortedInsights
      : sortedInsights.filter((insight) => insight.type === activeCategory),
    [activeCategory, sortedInsights]
  );

  const selectedInsight = filteredInsights.find((insight) => insight.id === selectedInsightId)
    || filteredInsights[0]
    || sortedInsights[0]
    || null;

  const selectedEvidence = selectedInsight
    ? buildEvidenceForInsight(selectedInsight, adsData, creatives, leads)
    : null;

  const summaryCards = [
    {
      label: 'Action Queue',
      value: `${sortedInsights.length}`,
      helper: `${sortedInsights.filter((insight) => insight.priority === 'high').length} high priority items`,
    },
    {
      label: 'Scale Opportunities',
      value: `${adsData.filter((campaign) => campaign.recommendation === 'Scale Budget').length}`,
      helper: 'Campaigns showing the strongest growth signal',
    },
    {
      label: 'Creative Issues',
      value: `${sortedInsights.filter((insight) => insight.type === 'creative').length}`,
      helper: 'Hook, fatigue, and message-quality warnings',
    },
    {
      label: 'Lead Quality Warnings',
      value: `${leads.filter((lead) => lead.quality_score === 'low').length}`,
      helper: 'Tracked leads currently showing weak quality',
    },
  ];

  return (
    <main className="mx-auto max-w-[1320px] px-6 pb-20 lg:px-8">
      <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Decision Layer</p>
          <h1 className="mt-3 text-[3.4rem] font-extrabold tracking-tight font-headline text-on-surface leading-tight">
            System Insights
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium text-on-surface-variant">
            This tab should help operators decide what to do next: which campaign to scale, which creative is weak, and where lead quality is breaking down.
          </p>
        </div>

        <div className={`rounded-full border border-outline-variant/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant ${
          theme === 'dark' ? 'bg-slate-900/80' : 'bg-white/80'
        }`}>
          {sortedInsights.length} live insight{sortedInsights.length === 1 ? '' : 's'}
        </div>
      </div>

      {needsFirstSync ? (
        <div className="rounded-[2rem] border border-dashed border-outline-variant/30 bg-surface-container-low px-8 py-10">
          <p className="text-lg font-bold text-on-surface">No synced campaign data yet</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Connect Meta, choose the primary ad account, and run a live sync from Settings so the Insights tab can generate action recommendations.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="panel-surface rounded-[2rem] p-6">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-on-surface-variant">{card.label}</p>
                <p className="mt-3 font-headline text-[2.8rem] font-black tracking-[-0.04em] text-on-surface">{card.value}</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">{card.helper}</p>
              </div>
            ))}
          </section>

          <section className="mb-12 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="panel-surface rounded-[2rem] p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Winning Ads Summary</p>
                  <h2 className="mt-1 font-headline text-2xl font-bold text-on-surface">What to keep, adjust, and kill</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className={`rounded-[1.5rem] border p-5 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Winning Poster</p>
                  {winningAdsSummary.topPoster ? (
                    <>
                      <p className="mt-3 text-lg font-bold text-on-surface">{cleanCreativeTitle(winningAdsSummary.topPoster.creative.creative_name)}</p>
                      <p className="mt-2 text-sm text-on-surface-variant">{winningAdsSummary.topPoster.evaluation.rationale}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-on-surface-variant">
                        <span>{winningAdsSummary.topPoster.evaluation.verdict}</span>
                        <span>CTR {Number(winningAdsSummary.topPoster.creative.CTR || 0).toFixed(2)}%</span>
                        <span>ROAS {Number(winningAdsSummary.topPoster.creative.ROAS || 0).toFixed(2)}x</span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-on-surface-variant">No poster creative has been synced yet.</p>
                  )}
                </div>

                <div className={`rounded-[1.5rem] border p-5 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Winning Video</p>
                  {winningAdsSummary.topVideo ? (
                    <>
                      <p className="mt-3 text-lg font-bold text-on-surface">{cleanCreativeTitle(winningAdsSummary.topVideo.creative.creative_name)}</p>
                      <p className="mt-2 text-sm text-on-surface-variant">{winningAdsSummary.topVideo.evaluation.rationale}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-on-surface-variant">
                        <span>{winningAdsSummary.topVideo.evaluation.verdict}</span>
                        <span>Hook {winningAdsSummary.topVideo.creative.hookRate !== undefined ? `${(winningAdsSummary.topVideo.creative.hookRate * 100).toFixed(2)}%` : `${winningAdsSummary.topVideo.creative.hook_strength}%`}</span>
                        <span>ROAS {Number(winningAdsSummary.topVideo.creative.ROAS || 0).toFixed(2)}x</span>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-on-surface-variant">No video creative has been synced yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="panel-surface rounded-[2rem] p-8">
                <h2 className="text-xl font-bold font-headline text-on-surface">Verdict Queue</h2>
                <div className="mt-5 grid gap-4">
                  <div className={`rounded-[1.5rem] border p-5 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">Adjust First</p>
                    {winningAdsSummary.needsAdjust.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {winningAdsSummary.needsAdjust.map((item) => (
                          <div key={`adjust-${item.creative.id}`} className="text-sm text-on-surface-variant">
                            <p className="font-bold text-on-surface">{cleanCreativeTitle(item.creative.creative_name)}</p>
                            <p>{item.evaluation.rationale}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-on-surface-variant">No creatives are sitting in the adjust zone right now.</p>
                    )}
                  </div>

                  <div className={`rounded-[1.5rem] border p-5 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">Kill First</p>
                    {winningAdsSummary.needsKill.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {winningAdsSummary.needsKill.map((item) => (
                          <div key={`kill-${item.creative.id}`} className="text-sm text-on-surface-variant">
                            <p className="font-bold text-on-surface">{cleanCreativeTitle(item.creative.creative_name)}</p>
                            <p>{item.evaluation.rationale}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-on-surface-variant">No creatives are over max CPL right now.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="panel-surface rounded-[2rem] p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Priority Queue</p>
                  <h2 className="mt-1 font-headline text-2xl font-bold text-on-surface">Top Actions To Take</h2>
                </div>
              </div>

              {sortedInsights.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-outline-variant/30 bg-surface-container-low p-8 text-sm text-on-surface-variant">
                  No active insights yet. Once synced campaigns or demo campaigns are available, the system will prioritize what to scale, pause, or repair.
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedInsights.slice(0, 5).map((insight, index) => {
                    const evidence = buildEvidenceForInsight(insight, adsData, creatives, leads);
                    const linkedCampaign = evidence.linkedCampaign;

                    return (
                      <button
                        key={insight.id}
                        type="button"
                        onClick={() => setSelectedInsightId(insight.id)}
                        className={`w-full rounded-[1.5rem] border p-5 text-left transition ${
                          selectedInsight?.id === insight.id
                            ? 'border-primary/30 bg-primary/5 shadow-sm'
                            : theme === 'dark'
                              ? 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                                #{index + 1}
                              </span>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getPriorityStyles(insight.priority)}`}>
                                {insight.priority}
                              </span>
                              <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getSeverityStyles(insight.severity)}`}>
                                {insight.severity}
                              </span>
                              {insight.platform && (
                                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getPlatformStyles(insight.platform)}`}>
                                  {insight.platform}
                                </span>
                              )}
                            </div>

                            <h3 className="mt-3 text-lg font-bold font-headline leading-tight text-on-surface">{insight.message}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{insight.reasoning}</p>

                            {linkedCampaign && (
                              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-on-surface-variant">
                                <span>{linkedCampaign.campaign_name}</span>
                                <span>ROAS {linkedCampaign.ROAS.toFixed(2)}x</span>
                                <span>CTR {linkedCampaign.CTR.toFixed(2)}%</span>
                                <span>CPM {formatCurrency(linkedCampaign.CPM)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-center text-sm font-bold text-primary">
                            {insight.actionLabel || 'Review'}
                            <ArrowRight size={14} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="panel-surface rounded-[2rem] p-8">
                <h2 className="text-xl font-bold font-headline text-on-surface">Evidence Panel</h2>
                {!selectedInsight || !selectedEvidence ? (
                  <p className="mt-4 text-sm text-on-surface-variant">Select an insight to see the supporting campaign, creative, and lead-quality evidence.</p>
                ) : (
                  <>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getPriorityStyles(selectedInsight.priority)}`}>
                        {selectedInsight.priority} priority
                      </span>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getSeverityStyles(selectedInsight.severity)}`}>
                        {selectedInsight.severity}
                      </span>
                      {selectedInsight.platform && (
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getPlatformStyles(selectedInsight.platform)}`}>
                          {selectedInsight.platform}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-2xl font-black font-headline text-on-surface">{selectedInsight.message}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{selectedInsight.reasoning}</p>

                    <div className="mt-6 grid gap-4">
                      <div className={`rounded-[1.5rem] border p-5 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Campaign Evidence</p>
                        {selectedEvidence.linkedCampaign ? (
                          <div className={`mt-3 grid gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            <p className={`font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{selectedEvidence.linkedCampaign.campaign_name}</p>
                            <p>Spend: {formatCurrency(selectedEvidence.linkedCampaign.spend)}</p>
                            <p>CTR: {selectedEvidence.linkedCampaign.CTR.toFixed(2)}%</p>
                            <p>CPM: {formatCurrency(selectedEvidence.linkedCampaign.CPM)}</p>
                            <p>ROAS: {selectedEvidence.linkedCampaign.ROAS.toFixed(2)}x</p>
                            <p>Conversions: {selectedEvidence.linkedCampaign.conversions}</p>
                          </div>
                        ) : (
                          <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>No direct campaign match found yet for this insight.</p>
                        )}
                      </div>

                      <div className={`rounded-[1.5rem] border p-5 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Creative Evidence</p>
                        {selectedEvidence.linkedCreative ? (
                          <div className={`mt-3 grid gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            <p className={`font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{cleanCreativeTitle(selectedEvidence.linkedCreative.creative_name)}</p>
                            <p>Status: {selectedEvidence.linkedCreative.status}</p>
                            <p>Hook Strength: {selectedEvidence.linkedCreative.hook_strength}%</p>
                            <p>Message Clarity: {selectedEvidence.linkedCreative.message_clarity}%</p>
                            <p>CTA Presence: {selectedEvidence.linkedCreative.cta_presence}%</p>
                            <p>Fatigue: {selectedEvidence.linkedCreative.fatigue}</p>
                          </div>
                        ) : (
                          <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>No creative record is linked yet. The campaign metrics are still enough to take action.</p>
                        )}
                      </div>

                      <div className={`rounded-[1.5rem] border p-5 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Lead Quality Evidence</p>
                        {selectedEvidence.relatedLeads.length > 0 ? (
                          <div className={`mt-3 grid gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            <p>Total leads: {selectedEvidence.relatedLeads.length}</p>
                            <p>High-quality leads: {selectedEvidence.highQualityLeads}</p>
                            <p>Average conversion rate: {selectedEvidence.averageConversionRate.toFixed(2)}%</p>
                            <p>Top value lead: {formatCurrency(Math.max(...selectedEvidence.relatedLeads.map((lead) => lead.value)))}</p>
                          </div>
                        ) : (
                          <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>No lead records are attached to this campaign yet.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="panel-surface rounded-[2rem] p-8">
                <h2 className="text-xl font-bold font-headline text-on-surface">Quick Health Check</h2>
                <div className="mt-5 space-y-4">
                  {quickSignals.map((signal) => {
                    const Icon = quickSignalIconMap[signal.category];
                    const tone = signal.status === 'alert'
                      ? 'bg-rose-100 text-rose-700'
                      : signal.status === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700';

                    return (
                      <div key={signal.id} className={`rounded-[1.5rem] border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{signal.title}</p>
                              <p className={`mt-1 text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{signal.description}</p>
                              <p className={`mt-2 text-[11px] font-bold uppercase tracking-[0.14em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{signal.action}</p>
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${tone}`}>
                            {signal.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-6 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition ${
                    activeCategory === category.id
                      ? 'bg-primary text-white shadow-lg shadow-black/10'
                      : theme === 'dark'
                        ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {category.title}
                </button>
              ))}
            </div>

            <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm">
              <div className="mb-8 border-b border-outline-variant/10 pb-6">
                <h2 className="text-2xl font-black font-headline uppercase tracking-[0.08em] text-on-surface">
                  {categories.find((category) => category.id === activeCategory)?.title || 'All'}
                </h2>
                <p className="mt-3 text-on-surface-variant font-medium">
                  {categories.find((category) => category.id === activeCategory)?.desc}
                </p>
              </div>

              {filteredInsights.length === 0 ? (
                <div className={`rounded-[1.5rem] border border-dashed border-outline-variant/25 px-6 py-8 text-sm italic text-on-surface-variant ${
                  theme === 'dark' ? 'bg-slate-900' : 'bg-white'
                }`}>
                  No active insights for this category right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {filteredInsights.map((insight) => {
                    const evidence = buildEvidenceForInsight(insight, adsData, creatives, leads);

                    return (
                      <button
                        key={insight.id}
                        type="button"
                        onClick={() => setSelectedInsightId(insight.id)}
                        className="flex h-full flex-col rounded-[1.5rem] border border-outline-variant/5 bg-surface-container-low p-6 text-left transition-shadow hover:shadow-md"
                      >
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getPriorityStyles(insight.priority)}`}>
                            {insight.priority}
                          </span>
                          {insight.platform && (
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getPlatformStyles(insight.platform)}`}>
                              {insight.platform}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex-grow">
                          <h3 className="text-lg font-bold mb-2 font-headline leading-tight text-on-surface">{insight.message}</h3>
                          <p className="text-on-surface-variant text-sm leading-relaxed">{insight.reasoning}</p>
                        </div>

                        <div className="mt-5 space-y-2 text-xs font-semibold text-on-surface-variant">
                          <p>Campaign: {evidence.linkedCampaign?.campaign_name || 'Not linked yet'}</p>
                          <p>Creative: {evidence.linkedCreative ? cleanCreativeTitle(evidence.linkedCreative.creative_name) : 'Not linked yet'}</p>
                          <p>Lead quality: {evidence.relatedLeads.length > 0 ? `${evidence.highQualityLeads}/${evidence.relatedLeads.length} high quality` : 'No lead data'}</p>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getSeverityStyles(insight.severity)}`}>
                            {insight.severity}
                          </span>
                          <span className="flex items-center gap-2 text-xs font-bold text-primary">
                            {insight.actionLabel || 'Review'}
                            <ArrowRight size={14} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
