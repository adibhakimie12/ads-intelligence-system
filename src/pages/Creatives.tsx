import React, { useMemo, useRef, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { requestCreativeSuggestions } from '../services/creativeAi';
import { evaluateWinningAd, type WinningAdsMetricStatus, type WinningAdsVerdict } from '../services/creativeAnalysis';
import { Sparkles, Trophy, ZapOff, MousePointer2, Filter, Plus, FileDown, RefreshCcw, Upload, X, Image as ImageIcon, Video, ChevronRight, CalendarDays, Wallet, MousePointerClick, BarChart3 } from 'lucide-react';

const CREATIVE_FALLBACK_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#f8f4ed" />
        <stop offset="100%" stop-color="#e7ddd0" />
      </linearGradient>
    </defs>
    <rect width="400" height="500" fill="url(#bg)" />
    <circle cx="200" cy="170" r="78" fill="#d6b690" opacity="0.45" />
    <rect x="92" y="300" width="216" height="18" rx="9" fill="#392f28" opacity="0.78" />
    <rect x="122" y="332" width="156" height="14" rx="7" fill="#6b5a4e" opacity="0.56" />
    <text x="200" y="390" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#221c16">
      Creative Preview
    </text>
  </svg>
`)}`;

const AIProgressBar = ({ label, value }: { label: string; value: number }) => {
  const tone = value >= 70 ? 'bg-blue-600 text-blue-600' : value >= 50 ? 'bg-amber-500 text-amber-600' : 'bg-red-500 text-red-600';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.16em]">
        <span className="text-on-surface-variant">{label}</span>
        <span className={tone.split(' ')[1]}>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div className={`h-full rounded-full transition-all duration-700 ${tone.split(' ')[0]}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

const getStatusStyles = (status: string) => {
  if (status === 'WINNING') return 'bg-emerald-100/90 text-emerald-800';
  if (status === 'FATIGUE DETECTED') return 'bg-orange-100/90 text-orange-800';
  if (status === 'KILL') return 'bg-red-100/90 text-red-800';
  if (status === 'COLD TEST') return 'bg-slate-200/90 text-slate-700';
  return 'bg-blue-100/90 text-blue-800';
};

const getPlatformStyles = (platform?: 'meta' | 'google') =>
  platform === 'google' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white';

const getFatigueStyles = (fatigue: 'low' | 'medium' | 'high') =>
  fatigue === 'low' ? 'bg-blue-500 text-blue-600' : fatigue === 'medium' ? 'bg-orange-500 text-orange-600' : 'bg-red-500 text-red-600';

const getVerdictStyles = (verdict: WinningAdsVerdict) => {
  if (verdict === 'WINNING') return 'bg-emerald-100/90 text-emerald-800';
  if (verdict === 'ADJUST') return 'bg-amber-100/90 text-amber-800';
  if (verdict === 'KILL') return 'bg-red-100/90 text-red-800';
  return 'bg-slate-200/90 text-slate-700';
};

const getMetricStatusStyles = (status: WinningAdsMetricStatus) => {
  if (status === 'pass') return 'text-emerald-500 bg-emerald-500';
  if (status === 'watch') return 'text-amber-500 bg-amber-500';
  if (status === 'fail') return 'text-red-500 bg-red-500';
  return 'text-slate-500 bg-slate-400';
};

const EXISTING_POST_PATTERN = /\s*\[Existing Post ([^\]]+)\]\s*$/i;
const LONG_TOKEN_PATTERN = /(?:^|\s)([a-f0-9]{24,}|[A-Za-z0-9_-]{28,})(?=\s|$)/g;

const cleanCreativeTitle = (value: string) =>
  value
    .replace(EXISTING_POST_PATTERN, '')
    .replace(LONG_TOKEN_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const extractExistingPostId = (value: string) => value.match(EXISTING_POST_PATTERN)?.[1] || null;

const compactId = (value: string) => (value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value);

const looksLikePlayableVideoUrl = (value?: string) =>
  typeof value === 'string'
  && value.trim().length > 0
  && !/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(value);

const isLikelyVideoCreative = (creative: { media_type?: 'image' | 'video'; imageUrl?: string; thumbnailUrl?: string; creative_name: string; ad_name?: string }) =>
  creative.media_type === 'video'
  || looksLikePlayableVideoUrl(creative.imageUrl)
  || looksLikePlayableVideoUrl(creative.thumbnailUrl)
  || /\b(video|reel|story|clip|ugc)\b/i.test(`${creative.creative_name} ${creative.ad_name || ''}`);

const stripExistingPostSentence = (value: string) =>
  value.replace(/\s*This ad is linked to an existing Meta post(?:\s*\([^)]+\))?\.?/i, '').trim();

const hasLiveCreativeDelivery = (creative: {
  spend?: number;
  impressions?: number;
  linkClicks?: number;
  costPerResult?: number;
  videoViews3s?: number;
  CTR?: number;
}) =>
  (creative.spend || 0) > 0
  || (creative.impressions || 0) > 0
  || (creative.linkClicks || 0) > 0
  || (creative.videoViews3s || 0) > 0
  || creative.costPerResult !== undefined
  || (creative.CTR || 0) > 0;

const isActiveCampaignDelivery = (delivery?: string) => {
  const normalized = String(delivery || '').trim().toLowerCase();
  return normalized === 'active' || normalized === 'in_process';
};

type PlatformFilter = 'all' | 'meta' | 'google' | 'uploaded';
type StatusFilter = 'all' | 'WINNING' | 'TESTING' | 'FATIGUE DETECTED' | 'KILL' | 'COLD TEST';
type SummaryView = 'today' | 'yesterday' | 'custom' | 'maximum';

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildCreativeRangeKey = (creative: { platform?: 'meta' | 'google'; creative_external_id?: string; creative_name: string; campaign_external_id?: string; campaign_name?: string; origin?: 'synced' | 'uploaded' }) =>
  [
    creative.origin || 'synced',
    creative.platform || 'meta',
    creative.creative_external_id || '',
    creative.campaign_external_id || '',
    creative.campaign_name || '',
    creative.creative_name,
  ].join('::');

const aggregateCreativeRange = (rows: any[]) => {
  const latest = [...rows].sort((left, right) => {
    const rightDate = new Date(right.snapshot_date || 0).getTime();
    const leftDate = new Date(left.snapshot_date || 0).getTime();
    return rightDate - leftDate;
  })[0];

  if (!latest) return null;

  const totals = rows.reduce((acc, row) => ({
    spend: acc.spend + Number(row.spend || 0),
    impressions: acc.impressions + Number(row.impressions || 0),
    linkClicks: acc.linkClicks + Number(row.linkClicks || 0),
    videoViews3s: acc.videoViews3s + Number(row.videoViews3s || 0),
    videoViews25: acc.videoViews25 + Number(row.videoViews25 || 0),
    videoViews50: acc.videoViews50 + Number(row.videoViews50 || 0),
    videoViews75: acc.videoViews75 + Number(row.videoViews75 || 0),
    ctr: acc.ctr + Number(row.CTR || 0),
    linkCtr: acc.linkCtr + Number(row.linkCTR || 0),
    roas: acc.roas + Number(row.ROAS || 0),
    costPerLinkClick: acc.costPerLinkClick + Number(row.costPerLinkClick || 0),
    costPerResult: acc.costPerResult + Number(row.costPerResult || 0),
    hookRate: acc.hookRate + Number(row.hookRate || 0),
    score: acc.score + Number(row.score || 0),
  }), {
    spend: 0,
    impressions: 0,
    linkClicks: 0,
    videoViews3s: 0,
    videoViews25: 0,
    videoViews50: 0,
    videoViews75: 0,
    ctr: 0,
    linkCtr: 0,
    roas: 0,
    costPerLinkClick: 0,
    costPerResult: 0,
    hookRate: 0,
    score: 0,
  });

  const count = rows.length;

  return {
    ...latest,
    spend: totals.spend,
    impressions: totals.impressions,
    linkClicks: totals.linkClicks,
    videoViews3s: totals.videoViews3s,
    videoViews25: totals.videoViews25,
    videoViews50: totals.videoViews50,
    videoViews75: totals.videoViews75,
    CTR: count > 0 ? totals.ctr / count : latest.CTR,
    linkCTR: count > 0 ? totals.linkCtr / count : latest.linkCTR,
    ROAS: count > 0 ? totals.roas / count : latest.ROAS,
    costPerLinkClick: count > 0 ? totals.costPerLinkClick / count : latest.costPerLinkClick,
    costPerResult: count > 0 ? totals.costPerResult / count : latest.costPerResult,
    hookRate: count > 0 ? totals.hookRate / count : latest.hookRate,
    score: count > 0 ? Math.round(totals.score / count) : latest.score,
    snapshot_date: latest.snapshot_date,
  };
};

export default function CreativesPage() {
  const { theme } = useTheme();
  const { adsData, creatives, creativeHistory, createCreative, syncAdsData, isFetching, formatCurrency, needsFirstSync, aiAssistantEnabled, creativeAnalysisEnabled, leads, profitData } = useDatabase();
  const { currentWorkspace } = useWorkspace();
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [summaryView, setSummaryView] = useState<SummaryView>('today');
  const [customFromDate, setCustomFromDate] = useState(formatDateInputValue(new Date()));
  const [customToDate, setCustomToDate] = useState(formatDateInputValue(new Date()));
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedCreativeId, setExpandedCreativeId] = useState<string | null>(null);
  const [expandedDetailId, setExpandedDetailId] = useState<string | null>(null);
  const [loadingSuggestionId, setLoadingSuggestionId] = useState<string | null>(null);
  const [liveSuggestions, setLiveSuggestions] = useState<Record<string, { provider: 'openai' | 'google' | 'rules'; summary: string; suggestions: string[] }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadForm, setUploadForm] = useState({
    creative_name: '',
    platform: 'meta' as 'meta' | 'google',
    media_type: 'image' as 'image' | 'video',
    preview_url: '',
    campaign_name: '',
    adset_name: '',
    ad_name: '',
  });

  const sortedCreatives = useMemo(
    () => [...creatives].sort((a, b) => ((b.score || 0) + (b.ROAS || 0) + (b.CTR || 0)) - ((a.score || 0) + (a.ROAS || 0) + (a.CTR || 0))),
    [creatives]
  );

  const todayKey = formatDateInputValue(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = formatDateInputValue(yesterdayDate);
  const normalizedFromDate = customFromDate <= customToDate ? customFromDate : customToDate;
  const normalizedToDate = customFromDate <= customToDate ? customToDate : customFromDate;

  const rangedCreatives = useMemo(() => {
    const historySource = creativeHistory.length > 0 ? creativeHistory : creatives;
    const uploadedCreatives = creatives.filter((creative) => creative.origin === 'uploaded');
    const syncedHistory = historySource.filter((creative) => creative.origin !== 'uploaded');

    const scopedSyncedRows = syncedHistory.filter((creative) => {
      if (!creative.snapshot_date) {
        return summaryView === 'maximum';
      }
      if (summaryView === 'today') return creative.snapshot_date === todayKey;
      if (summaryView === 'yesterday') return creative.snapshot_date === yesterdayKey;
      if (summaryView === 'custom') return creative.snapshot_date >= normalizedFromDate && creative.snapshot_date <= normalizedToDate;
      return true;
    });

    const grouped = new Map<string, typeof creatives[number][]>();
    scopedSyncedRows.forEach((creative) => {
      const key = buildCreativeRangeKey(creative);
      const current = grouped.get(key) || [];
      current.push(creative);
      grouped.set(key, current);
    });

    const aggregatedSynced = [...grouped.values()]
      .map((rows) => aggregateCreativeRange(rows))
      .filter(Boolean) as typeof creatives;

    return [...uploadedCreatives, ...aggregatedSynced].sort((a, b) => ((b.score || 0) + (b.ROAS || 0) + (b.CTR || 0)) - ((a.score || 0) + (a.ROAS || 0) + (a.CTR || 0)));
  }, [creativeHistory, creatives, normalizedFromDate, normalizedToDate, summaryView, todayKey, yesterdayKey]);

  const filteredCreatives = useMemo(() => {
    return rangedCreatives.filter((creative) => {
      const matchesPlatform = platformFilter === 'all'
        ? true
        : platformFilter === 'uploaded'
          ? creative.origin === 'uploaded'
          : creative.platform === platformFilter;
      const matchesStatus = statusFilter === 'all' ? true : creative.status === statusFilter;
      return matchesPlatform && matchesStatus;
    });
  }, [platformFilter, rangedCreatives, statusFilter]);

  const summaryViewLabel = summaryView === 'today'
    ? 'Today'
    : summaryView === 'yesterday'
    ? 'Yesterday'
    : summaryView === 'custom'
    ? `${new Date(normalizedFromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to ${new Date(normalizedToDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Maximum / Total';

  const creativeMetrics = useMemo(() => {
    const visibleSynced = filteredCreatives.filter((creative) => creative.origin !== 'uploaded');
    const totalSpend = visibleSynced.reduce((sum, creative) => sum + Number(creative.spend || 0), 0);
    const totalClicks = visibleSynced.reduce((sum, creative) => sum + Number(creative.linkClicks || 0), 0);
    const avgCtr = visibleSynced.length > 0
      ? visibleSynced.reduce((sum, creative) => sum + Number(creative.CTR || 0), 0) / visibleSynced.length
      : 0;
    const avgRoas = visibleSynced.length > 0
      ? visibleSynced.reduce((sum, creative) => sum + Number(creative.ROAS || 0), 0) / visibleSynced.length
      : 0;

    return {
      totalSpend,
      totalClicks,
      avgCtr,
      avgRoas,
      count: visibleSynced.length,
    };
  }, [filteredCreatives]);

  const summaryCards = useMemo(() => {
    const topPerformer = rangedCreatives[0];
    const fatigueCount = rangedCreatives.filter((creative) => creative.fatigue !== 'low').length;
    const weakHookCount = rangedCreatives.filter((creative) => creative.hook_strength < 60).length;
    const cleanedTopPerformerName = topPerformer ? cleanCreativeTitle(topPerformer.creative_name) : null;

    return [
      {
        id: 'top',
        title: 'Top Performer',
        description: cleanedTopPerformerName ? `${cleanedTopPerformerName} is currently leading the library.` : 'No winning creative has been detected yet.',
        icon: Trophy,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
      {
        id: 'fatigue',
        title: 'Creative Fatigue',
        description: fatigueCount > 0 ? `${fatigueCount} creatives are showing fatigue risk and need a refresh.` : 'No fatigue warning right now.',
        icon: ZapOff,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
      },
      {
        id: 'hooks',
        title: 'Weak Hooks',
        description: weakHookCount > 0 ? `${weakHookCount} creatives need a stronger first-scene hook.` : 'Hooks look healthy across the current library.',
        icon: MousePointer2,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
      },
    ];
  }, [rangedCreatives]);

  const targetCpl = profitData.CPL > 0 ? profitData.CPL : 20;
  const maxCpl = targetCpl * 1.5;

  const playbookCounts = useMemo(() => {
    return creatives.reduce(
      (totals, creative) => {
        const linkedLeads = leads.filter((lead) => lead.creative_name === creative.creative_name);
        const evaluation = evaluateWinningAd({ creative, linkedLeads, targetCpl, maxCpl });
        totals[evaluation.verdict] += 1;
        return totals;
      },
      { WINNING: 0, ADJUST: 0, KILL: 0, LEARNING: 0 } as Record<WinningAdsVerdict, number>
    );
  }, [creatives, leads, targetCpl, maxCpl]);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const preview_url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });

    setUploadForm((previous) => ({
      ...previous,
      creative_name: previous.creative_name || file.name.replace(/\.[^/.]+$/, ''),
      media_type: file.type.startsWith('video/') ? 'video' : 'image',
      preview_url,
    }));
  };

  const handleCreateCreative = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uploadForm.creative_name.trim()) {
      setUploadError('Creative name is required.');
      return;
    }

    setUploadError('');
    setIsSubmitting(true);
    const created = await createCreative(uploadForm);
    setIsSubmitting(false);

    if (!created) {
      setUploadError('Creative upload failed. Please try again.');
      return;
    }

    setExpandedCreativeId(created.id);
    setShowUploadModal(false);
    setUploadForm({
      creative_name: '',
      platform: 'meta',
      media_type: 'image',
      preview_url: '',
      campaign_name: '',
      adset_name: '',
      ad_name: '',
    });
  };

  const handleDownloadReport = () => {
    const blob = new Blob([JSON.stringify(filteredCreatives, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'creative-library-report.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadSuggestionsForCreative = async (creative: typeof creatives[number]) => {
    setExpandedCreativeId(creative.id);

    if (!aiAssistantEnabled || !creativeAnalysisEnabled) {
      setLiveSuggestions((previous) => ({
        ...previous,
        [creative.id]: {
          provider: 'rules',
          summary: !aiAssistantEnabled
            ? 'AI Assistant is disabled in Settings, so only the built-in creative guidance is available.'
            : 'Creative Analysis is disabled in Settings, so only the built-in creative guidance is available.',
          suggestions: creative.suggestions || [],
        },
      }));
      return;
    }

    if (liveSuggestions[creative.id] || loadingSuggestionId === creative.id) {
      return;
    }

    const workspaceId = currentWorkspace?.id;
    const storedKeys = workspaceId ? localStorage.getItem(`ads-intel-settings-api-keys:${workspaceId}`) : null;
    let openAiKey = '';
    let googleAiKey = '';

    if (storedKeys) {
      try {
        const parsed = JSON.parse(storedKeys) as { openAiKey?: string; googleAiKey?: string };
        openAiKey = parsed.openAiKey?.trim() || '';
        googleAiKey = parsed.googleAiKey?.trim() || '';
      } catch {
        openAiKey = '';
        googleAiKey = '';
      }
    }

    setLoadingSuggestionId(creative.id);
    const result = await requestCreativeSuggestions({ creative, openAiKey, googleAiKey });
    setLoadingSuggestionId(null);

    if (result.ok) {
      setLiveSuggestions((previous) => ({
        ...previous,
        [creative.id]: {
          provider: result.provider,
          summary: result.summary,
          suggestions: result.suggestions,
        },
      }));
      return;
    }

    setLiveSuggestions((previous) => ({
      ...previous,
      [creative.id]: {
        provider: 'rules',
        summary: creative.analysis_summary || 'Use the current creative metrics to decide the next iteration.',
        suggestions: creative.suggestions || [],
      },
    }));
  };

  return (
    <main className="mx-auto max-w-[1380px] px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Creative Intelligence</p>
          <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">Creatives Library</h1>
          <p className="mt-3 text-sm font-medium text-on-surface-variant">
            Review synced creatives from Meta Ads and Google Ads, upload draft assets before launch, and get hook, clarity, CTA, and fatigue signals in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setShowFilters((current) => !current)} className="flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
            <Filter size={18} />
            Filter
          </button>
          <button onClick={() => void syncAdsData('all')} className="flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
            <RefreshCcw size={18} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Syncing...' : 'Sync Library'}
          </button>
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary/90">
            <Plus size={18} />
            Upload Creative
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-outline-variant/10 bg-surface-container-low px-5 py-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-secondary">Creative Window</p>
          <h2 className="mt-2 text-xl font-black text-on-surface">Creative Spend by Date</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Use the same date controls here when Meta spend differs by day. Creative cards now follow the selected summary window too.
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
                  value={customFromDate}
                  onChange={(event) => setCustomFromDate(event.target.value)}
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3 text-sm font-semibold text-on-surface outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">To</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(event) => setCustomToDate(event.target.value)}
                  className="w-full rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3 text-sm font-semibold text-on-surface outline-none"
                />
              </label>
            </div>
          )}
          <p className="text-xs font-medium text-on-surface-variant">{summaryViewLabel}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel-surface rounded-[1.7rem] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary"><Wallet size={20} /></div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Total Spend</p>
              <p className="mt-2 text-2xl font-black text-on-surface">{formatCurrency(creativeMetrics.totalSpend)}</p>
              <p className="mt-2 text-xs text-on-surface-variant">{summaryViewLabel} across visible synced creatives</p>
            </div>
          </div>
        </div>
        <div className="panel-surface rounded-[1.7rem] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-secondary/10 p-3 text-secondary"><MousePointerClick size={20} /></div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Total Link Clicks</p>
              <p className="mt-2 text-2xl font-black text-on-surface">{creativeMetrics.totalClicks.toLocaleString()}</p>
              <p className="mt-2 text-xs text-on-surface-variant">{summaryViewLabel} click volume from visible creatives</p>
            </div>
          </div>
        </div>
        <div className="panel-surface rounded-[1.7rem] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500"><BarChart3 size={20} /></div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Avg CTR</p>
              <p className="mt-2 text-2xl font-black text-on-surface">{creativeMetrics.avgCtr.toFixed(2)}%</p>
              <p className="mt-2 text-xs text-on-surface-variant">{summaryViewLabel} average click-through rate</p>
            </div>
          </div>
        </div>
        <div className="panel-surface rounded-[1.7rem] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-500"><CalendarDays size={20} /></div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Visible Creatives</p>
              <p className="mt-2 text-2xl font-black text-on-surface">{creativeMetrics.count}</p>
              <p className="mt-2 text-xs text-on-surface-variant">{summaryViewLabel} creative set in the library</p>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="panel-surface mb-8 grid gap-4 rounded-[2rem] p-6 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm font-bold text-on-surface">
            Platform
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as PlatformFilter)} className="rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm font-medium outline-none">
              <option value="all">All Sources</option>
              <option value="meta">Meta Ads</option>
              <option value="google">Google Ads</option>
              <option value="uploaded">Uploaded Drafts</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-on-surface">
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm font-medium outline-none">
              <option value="all">All Statuses</option>
              <option value="WINNING">Winning</option>
              <option value="TESTING">Testing</option>
              <option value="FATIGUE DETECTED">Fatigue Detected</option>
              <option value="KILL">Kill</option>
              <option value="COLD TEST">Cold Test</option>
            </select>
          </label>
          <div className="rounded-[1.5rem] bg-surface-container-high p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Visible Creatives</p>
            <p className="mt-2 text-2xl font-black text-on-surface">{filteredCreatives.length}</p>
          </div>
          <div className="rounded-[1.5rem] bg-surface-container-high p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Draft Uploads</p>
            <p className="mt-2 text-2xl font-black text-on-surface">{creatives.filter((creative) => creative.origin === 'uploaded').length}</p>
          </div>
        </div>
      )}

      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="panel-surface flex items-start gap-4 rounded-[2rem] p-6">
              <div className={`rounded-xl p-3 ${item.bg} ${item.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-on-surface">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <section className="panel-surface mb-10 rounded-[2rem] p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Winning Ads Playbook</p>
            <h2 className="mt-2 text-2xl font-black text-on-surface">Poster and video decisions live where your creative data already lands.</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              This is the best home for your framework because winning ads are judged at the creative level. The app now maps your rules into each creative card and keeps the UI clean.
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-[1.4rem] bg-surface-container-high px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Winning</p>
              <p className="mt-2 text-2xl font-black text-emerald-500">{playbookCounts.WINNING}</p>
            </div>
            <div className="rounded-[1.4rem] bg-surface-container-high px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Adjust</p>
              <p className="mt-2 text-2xl font-black text-amber-500">{playbookCounts.ADJUST}</p>
            </div>
            <div className="rounded-[1.4rem] bg-surface-container-high px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Kill</p>
              <p className="mt-2 text-2xl font-black text-red-500">{playbookCounts.KILL}</p>
            </div>
            <div className="rounded-[1.4rem] bg-surface-container-high px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Learning</p>
              <p className="mt-2 text-2xl font-black text-slate-500">{playbookCounts.LEARNING}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div className="rounded-[1.6rem] border border-outline-variant/30 bg-surface px-5 py-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-on-surface">Decision Rules</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[1.2rem] bg-surface-container-high px-4 py-3">
                <p className="font-bold text-emerald-500">Winning</p>
                <p className="mt-1 text-sm text-on-surface-variant">Cost per result reaches target CPL.</p>
              </div>
              <div className="rounded-[1.2rem] bg-surface-container-high px-4 py-3">
                <p className="font-bold text-amber-500">Adjust</p>
                <p className="mt-1 text-sm text-on-surface-variant">Cost per result misses target CPL and is getting close to max CPL.</p>
              </div>
              <div className="rounded-[1.2rem] bg-surface-container-high px-4 py-3">
                <p className="font-bold text-red-500">Kill</p>
                <p className="mt-1 text-sm text-on-surface-variant">Cost per result is already above max CPL.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-outline-variant/30 bg-surface px-5 py-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-on-surface">Poster Checks</p>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <p>1. Judge after at least 1,000 impressions and before 2,000 impressions.</p>
              <p>2. CTR (All): 0.8% to 1.0% and above.</p>
              <p>3. CTR (Link): 1.3% to 1.5% and above.</p>
              <p>4. Read link clicks and keep cost per link click around RM2.00.</p>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-outline-variant/30 bg-surface px-5 py-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-on-surface">Video Checks</p>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <p>1. Start with hook rate: 3-sec video views divided by impressions.</p>
              <p>2. Then check 3 sec, 25%, 50%, and 75% video view depth.</p>
              <p>3. This page is ready for those checkpoints and shows placeholders until richer ad-level Meta video metrics are synced.</p>
            </div>
          </div>
        </div>
      </section>

      {needsFirstSync && (
        <div className="panel-surface mb-10 rounded-[2rem] p-8">
          <p className="text-lg font-black text-on-surface">Your creative library is ready for the first sync.</p>
          <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
            Connect Meta Ads or Google Ads in Settings, then sync the workspace. The system will start creating campaign-linked creative records here, and you can still upload drafts before they go live.
          </p>
        </div>
      )}

      {filteredCreatives.length === 0 ? (
        <div className="panel-surface mb-16 rounded-[2rem] p-12 text-center">
          <p className="text-2xl font-black text-on-surface">No creatives match this filter yet.</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-on-surface-variant">
            Upload a draft creative for pre-launch checking, or sync your Meta and Google campaigns to populate the live library automatically.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setShowUploadModal(true)} className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white">Upload Creative</button>
            <button onClick={() => void syncAdsData('all')} className="rounded-full border border-outline-variant/50 px-6 py-3 text-sm font-bold text-on-surface">Sync Ad Platforms</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredCreatives.map((creative) => {
            const linkedCampaign = adsData.find((campaign) =>
              (creative.campaign_external_id && campaign.id === creative.campaign_external_id)
              || (creative.campaign_name && campaign.campaign_name === creative.campaign_name)
            );
            const isCampaignLive = isActiveCampaignDelivery(linkedCampaign?.delivery);
            const hasLiveData = hasLiveCreativeDelivery(creative) || isCampaignLive;
            const presentationStatus = !hasLiveCreativeDelivery(creative) && isCampaignLive ? 'TESTING' : creative.status;
            const presentationFatigue = !hasLiveCreativeDelivery(creative) && isCampaignLive ? 'low' : creative.fatigue;
            const fatigueStyles = getFatigueStyles(presentationFatigue);
            const isExpanded = expandedCreativeId === creative.id;
            const resolvedSuggestions = liveSuggestions[creative.id]?.suggestions || creative.suggestions || [];
            const resolvedSummary = liveSuggestions[creative.id]?.summary
              || (!hasLiveCreativeDelivery(creative) && isCampaignLive
                ? 'This creative is already live in Meta and waiting for enough delivery data before fatigue or winner labels are applied.'
                : creative.analysis_summary)
              || 'Analysis pending';
            const fatigueSummary = stripExistingPostSentence(resolvedSummary);
            const suggestionProvider = liveSuggestions[creative.id]?.provider;
            const existingPostId = extractExistingPostId(creative.creative_name);
            const displayTitle = cleanCreativeTitle(creative.creative_name);
            const primaryMediaUrl = creative.imageUrl || creative.thumbnailUrl || CREATIVE_FALLBACK_IMAGE;
            const previewUrl = isLikelyVideoCreative(creative) && looksLikePlayableVideoUrl(creative.imageUrl)
              ? creative.imageUrl
              : primaryMediaUrl;
            const isVideo = isLikelyVideoCreative(creative);
            const canRenderVideo = isVideo && looksLikePlayableVideoUrl(previewUrl);
            const scoreLabel = hasLiveData ? 'Live Performance Score' : 'Rule-Based Prelaunch Score';
            const showDetails = expandedDetailId === creative.id;
            const linkedLeads = leads.filter((lead) => lead.creative_name === creative.creative_name);
            const winningEvaluation = evaluateWinningAd({ creative, linkedLeads, targetCpl, maxCpl });
            const activeChecklist = isVideo ? winningEvaluation.videoMetrics : winningEvaluation.posterMetrics;

            return (
              <article key={creative.id} className="panel-surface overflow-hidden rounded-[2rem]">
                <div className={`relative aspect-[4/5] overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-surface-container-low'}`}>
                  {canRenderVideo ? (
                    <video src={previewUrl} className="h-full w-full object-cover" muted controls playsInline />
                  ) : (
                    <img src={previewUrl} alt={displayTitle} className="h-full w-full object-cover" />
                  )}
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusStyles(presentationStatus)}`}>{presentationStatus}</span>
                    {creative.origin === 'uploaded' && <span className="rounded-full bg-black/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">Draft Upload</span>}
                  </div>
                  <div className="absolute right-4 top-4 flex gap-2">
                    <span className={`rounded-md px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] ${getPlatformStyles(creative.platform)}`}>{creative.platform || 'meta'}</span>
                    <span className={`rounded-md px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] ${
                      theme === 'dark' ? 'bg-slate-900/85 text-slate-200' : 'bg-white/85 text-slate-700'
                    }`}>{isVideo ? 'Video' : 'Image'}</span>
                  </div>
                  {isVideo && !canRenderVideo && (
                    <div className="absolute bottom-4 left-4 rounded-full bg-black/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                      Video poster only
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-6 p-7">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="line-clamp-3 break-words text-xl font-bold text-on-surface">{displayTitle}</h3>
                        <p className="mt-2 text-sm text-on-surface-variant">
                          {creative.campaign_name
                            ? `Linked to ${creative.campaign_name}${creative.adset_name ? ` / ${creative.adset_name}` : ''}${creative.ad_name ? ` / ${creative.ad_name}` : ''}`
                            : 'Uploaded draft for pre-launch creative review.'}
                        </p>
                        {existingPostId && (
                          <p className="mt-2 inline-flex max-w-full rounded-full bg-surface-container-high px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                            Existing Post {compactId(existingPostId)}
                          </p>
                        )}
                      </div>
                      <div className="min-w-[88px] rounded-[1.4rem] bg-surface-container-high px-3 py-3 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Score</p>
                        <p className="mt-1 text-2xl font-black leading-none text-on-surface">{creative.score || 0}</p>
                        <p className="mt-2 text-[10px] font-bold text-on-surface-variant">
                          {hasLiveData ? 'Live' : 'Prelaunch'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-[1.25rem] bg-surface-container-high px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">CTR</p>
                        <p className="mt-1 text-base font-black text-on-surface">{(creative.CTR || 0).toFixed(2)}%</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-surface-container-high px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">ROAS</p>
                        <p className="mt-1 text-base font-black text-on-surface">{(creative.ROAS || 0).toFixed(2)}x</p>
                      </div>
                      <div className="rounded-[1.25rem] bg-surface-container-high px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Spend</p>
                        <p className="mt-1 text-base font-black text-on-surface">{formatCurrency(creative.spend || 0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] bg-surface-container-high px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Creative Fatigue</p>
                        <p className="mt-1 text-sm font-medium text-on-surface-variant">{fatigueSummary}</p>
                        {existingPostId && (
                          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                            Linked Meta post {compactId(existingPostId)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 rounded-full bg-surface px-2.5 py-1.5">
                        <div className={`h-2.5 w-2.5 rounded-full ${fatigueStyles.split(' ')[0]}`} />
                        <span className={`text-xs font-bold capitalize ${fatigueStyles.split(' ')[1]}`}>{presentationFatigue} fatigue</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-outline-variant/30 bg-surface px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Winning Ads Verdict</p>
                        <p className="mt-1 text-sm font-medium text-on-surface-variant">{winningEvaluation.rationale}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getVerdictStyles(winningEvaluation.verdict)}`}>
                        {winningEvaluation.verdict}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-[1.2rem] bg-surface-container-high px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Cost / Result</p>
                        <p className="mt-1 text-sm font-black text-on-surface">
                          {winningEvaluation.costPerResult !== undefined ? formatCurrency(winningEvaluation.costPerResult) : 'Pending'}
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] bg-surface-container-high px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Target CPL</p>
                        <p className="mt-1 text-sm font-black text-on-surface">{formatCurrency(winningEvaluation.targetCpl)}</p>
                      </div>
                      <div className="rounded-[1.2rem] bg-surface-container-high px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Max CPL</p>
                        <p className="mt-1 text-sm font-black text-on-surface">{formatCurrency(winningEvaluation.maxCpl)}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedDetailId((current) => current === creative.id ? null : creative.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant/30 px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-on-surface transition-all hover:border-primary-container/30 hover:bg-surface-container-high"
                  >
                    <ChevronRight size={16} className={`transition-transform ${showDetails ? 'rotate-90' : ''}`} />
                    {showDetails ? 'Hide Details' : 'View Details'}
                  </button>

                  {showDetails && (
                    <div className="flex flex-col gap-6 rounded-[1.6rem] border border-outline-variant/30 bg-surface px-4 py-5">
                      <div className="flex flex-col gap-4">
                        <AIProgressBar label="Hook Strength" value={creative.hook_strength} />
                        <AIProgressBar label="Message Clarity" value={creative.message_clarity} />
                        <AIProgressBar label="CTA Presence" value={creative.cta_presence} />
                      </div>

                      <div className="grid gap-3">
                        {activeChecklist.slice(0, isVideo ? 3 : 4).map((metric) => {
                          const metricStyles = getMetricStatusStyles(metric.status);
                          return (
                            <div key={`${creative.id}-${metric.label}`} className="rounded-[1.2rem] bg-surface-container-high px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">{metric.label}</p>
                                  <p className="mt-1 text-sm font-bold text-on-surface">
                                    {metric.value !== undefined
                                      ? metric.label.toLowerCase().includes('ctr') || metric.label.toLowerCase().includes('rate')
                                        ? `${metric.value.toFixed(2)}%`
                                        : metric.label.toLowerCase().includes('cost')
                                          ? formatCurrency(metric.value)
                                          : Number.isInteger(metric.value)
                                            ? metric.value.toLocaleString()
                                            : metric.value.toFixed(2)
                                      : 'Pending sync'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className={`ml-auto h-2.5 w-2.5 rounded-full ${metricStyles.split(' ')[1]}`} />
                                  <p className={`mt-2 text-[11px] font-black uppercase tracking-[0.14em] ${metricStyles.split(' ')[0]}`}>{metric.status}</p>
                                </div>
                              </div>
                              <p className="mt-2 text-xs font-medium text-on-surface-variant">Target: {metric.benchmark}</p>
                              {metric.note && <p className="mt-1 text-xs text-on-surface-variant">{metric.note}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedCreativeId(null);
                        return;
                      }
                      void loadSuggestionsForCreative(creative);
                    }}
                    disabled={!creativeAnalysisEnabled}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant/30 px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-primary transition-all hover:border-primary-container/30 hover:bg-primary/5"
                  >
                    <Sparkles size={16} />
                    {!creativeAnalysisEnabled ? 'Creative Analysis Disabled' : loadingSuggestionId === creative.id ? 'Generating Suggestions...' : isExpanded ? 'Hide Suggestions' : 'Improve Suggestions'}
                  </button>

                  {isExpanded && (
                    <div className="rounded-[1.6rem] border border-outline-variant/30 bg-surface px-5 py-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                        <ChevronRight size={18} className="text-primary" />
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-on-surface">Optimization Suggestions</p>
                        </div>
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">
                          {suggestionProvider === 'openai' ? 'OpenAI' : suggestionProvider === 'google' ? 'Google AI' : 'Built-in'}
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {resolvedSuggestions.map((suggestion, index) => (
                          <div key={`${creative.id}-suggestion-${index}`} className="rounded-[1.2rem] bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">{suggestion}</div>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[1.2rem] bg-surface-container-high px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Hook Type</p>
                          <p className="mt-1 text-sm font-bold text-on-surface">{creative.hook_type || 'Direct'}</p>
                        </div>
                        <div className="rounded-[1.2rem] bg-surface-container-high px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Snapshot Date</p>
                          <p className="mt-1 text-sm font-bold text-on-surface">{creative.snapshot_date || 'Draft only'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="panel-surface my-20 flex flex-col items-center justify-between gap-6 rounded-[2rem] p-10 md:flex-row">
        <div className="max-w-2xl text-center md:text-left">
          <h2 className="font-headline text-3xl font-black text-on-surface">Creative ops should stay connected to live ad performance.</h2>
          <p className="mt-2 text-sm font-medium text-on-surface-variant">
            Use uploads to validate new ideas before launch, then sync Meta and Google to watch which creatives are winning, fading, or ready to kill.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <button onClick={handleDownloadReport} className="flex items-center justify-center gap-2 rounded-full border border-outline-variant/50 px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-on-surface transition-all hover:bg-surface-container-high">
            <FileDown size={20} />
            Download Report
          </button>
          <button onClick={() => void syncAdsData('all')} className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_8px_30px_rgb(25,28,29,0.12)] transition-all hover:bg-primary/90">
            <RefreshCcw size={20} className={isFetching ? 'animate-spin' : ''} />
            Sync Ad Creatives
          </button>
        </div>
      </div>

      {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10 backdrop-blur-sm">
          <div className={`w-full max-w-3xl rounded-[2rem] p-6 shadow-2xl ${
            theme === 'dark' ? 'border border-slate-700 bg-slate-950' : 'bg-[#f8f3ec]'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-secondary">Upload Draft Creative</p>
                <h3 className="mt-2 text-3xl font-black text-on-surface">Pre-check a creative before launch</h3>
                <p className="mt-2 text-sm text-on-surface-variant">Add an image or video, link it to a campaign if you want, and the library will score the hook, clarity, CTA, and fatigue risk.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="rounded-full border border-outline-variant/40 p-2 text-on-surface">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCreative} className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex min-h-[280px] w-full flex-col items-center justify-center rounded-[1.75rem] border border-dashed p-6 text-center ${
                  theme === 'dark' ? 'border-slate-700 bg-slate-900/70' : 'border-outline-variant/50 bg-white/60'
                }`}>
                  {uploadForm.preview_url ? (
                    uploadForm.media_type === 'video' ? (
                      <video src={uploadForm.preview_url} className="max-h-[260px] w-full rounded-[1.5rem] object-cover" controls muted playsInline />
                    ) : (
                      <img src={uploadForm.preview_url} alt="Creative preview" className="max-h-[260px] w-full rounded-[1.5rem] object-cover" />
                    )
                  ) : (
                    <>
                      <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                        <Upload size={28} />
                      </div>
                      <p className="text-base font-black text-on-surface">Drop a creative here or choose a file</p>
                      <p className="mt-2 text-sm text-on-surface-variant">Supports image and video previews for draft analysis.</p>
                    </>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelected} />

                <label className="flex flex-col gap-2 text-sm font-bold text-on-surface">
                  Creative Name
                  <input value={uploadForm.creative_name} onChange={(event) => setUploadForm((previous) => ({ ...previous, creative_name: event.target.value }))} placeholder="Meta Winter Offer Hook V2" className={`rounded-2xl border px-4 py-3 outline-none ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-outline-variant/40 bg-white/80'
                  }`} />
                </label>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                  <label className="flex flex-col gap-2 text-sm font-bold text-on-surface">
                    Platform
                    <select value={uploadForm.platform} onChange={(event) => setUploadForm((previous) => ({ ...previous, platform: event.target.value as 'meta' | 'google' }))} className={`rounded-2xl border px-4 py-3 outline-none ${
                      theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-outline-variant/40 bg-white/80'
                    }`}>
                      <option value="meta">Meta Ads</option>
                      <option value="google">Google Ads</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-bold text-on-surface">
                    Media Type
                    <select value={uploadForm.media_type} onChange={(event) => setUploadForm((previous) => ({ ...previous, media_type: event.target.value as 'image' | 'video' }))} className={`rounded-2xl border px-4 py-3 outline-none ${
                      theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-outline-variant/40 bg-white/80'
                    }`}>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm font-bold text-on-surface">
                  Campaign Name
                  <input value={uploadForm.campaign_name} onChange={(event) => setUploadForm((previous) => ({ ...previous, campaign_name: event.target.value }))} placeholder="Optional linked campaign" className={`rounded-2xl border px-4 py-3 outline-none ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-outline-variant/40 bg-white/80'
                  }`} />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold text-on-surface">
                  Ad Set Name
                  <input value={uploadForm.adset_name} onChange={(event) => setUploadForm((previous) => ({ ...previous, adset_name: event.target.value }))} placeholder="Optional ad set" className={`rounded-2xl border px-4 py-3 outline-none ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-outline-variant/40 bg-white/80'
                  }`} />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold text-on-surface">
                  Ad Name
                  <input value={uploadForm.ad_name} onChange={(event) => setUploadForm((previous) => ({ ...previous, ad_name: event.target.value }))} placeholder="Optional ad name" className={`rounded-2xl border px-4 py-3 outline-none ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-outline-variant/40 bg-white/80'
                  }`} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-[1.25rem] px-4 py-4 ${theme === 'dark' ? 'bg-slate-900/80' : 'bg-white/70'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Detected Type</p>
                    <div className="mt-2 flex items-center gap-2 text-sm font-bold text-on-surface">
                      {uploadForm.media_type === 'video' ? <Video size={16} /> : <ImageIcon size={16} />}
                      {uploadForm.media_type}
                    </div>
                  </div>
                  <div className={`rounded-[1.25rem] px-4 py-4 ${theme === 'dark' ? 'bg-slate-900/80' : 'bg-white/70'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant">Destination</p>
                    <p className="mt-2 text-sm font-bold capitalize text-on-surface">{uploadForm.platform} creative library</p>
                  </div>
                </div>

                {uploadError && <p className="text-sm font-medium text-red-600">{uploadError}</p>}

                <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-primary px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white disabled:opacity-60">
                  {isSubmitting ? 'Analyzing Creative...' : 'Add To Creative Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
