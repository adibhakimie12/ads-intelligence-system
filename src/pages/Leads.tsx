import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useWorkspace } from '../context/WorkspaceContext';
import LeadCard from '../components/LeadCard';
import LeadDetailsDrawer from '../components/LeadDetailsDrawer';
import { createLeadCapture, consumeLeadCapture, fetchPendingLeadCaptures, LeadCaptureApiError, type LeadCaptureEvent } from '../services/leadCapture';
import { Users, Filter, ArrowUpDown, ChevronRight, AlertCircle, Info, CheckCircle2, Crown, Lock, X, RefreshCw, Copy, MessageCircleMore, Sparkles } from 'lucide-react';
import { LeadStatus, CreateLeadInput } from '../types';
import type { PlanTier } from '../App';

interface LeadsPageProps {
  planTier: PlanTier;
  leadUsageCount: number;
  leadLimit: number;
  hasReachedLeadLimit: boolean;
  onUpgradeRequest: () => void;
}

type SortOption = 'value_desc' | 'recent' | 'quality';
type SourceFilter = 'all' | 'meta' | 'google';
type QualityFilter = 'all' | 'high' | 'medium' | 'low';

const API_CAPTURE_PATH = '/api/lead-capture';
const qualityRank = { high: 3, medium: 2, low: 1 };

const buildLeadName = (event: LeadCaptureEvent) => {
  if (event.contactName?.trim()) return event.contactName.trim();
  if (event.contactPhone?.trim()) {
    const digits = event.contactPhone.replace(/\D/g, '');
    return `WhatsApp Lead ${digits.slice(-4) || 'New'}`;
  }
  return `WhatsApp Lead ${event.campaign.slice(0, 16)}`;
};

const buildLeadInsight = (event: LeadCaptureEvent) =>
  event.insight?.trim() || `${event.platform === 'meta' ? 'Meta' : 'Google'} click-to-WhatsApp lead captured and ready for manual follow-up.`;

const buildRecommendedAction = (event: LeadCaptureEvent) =>
  event.recommendedAction?.trim() || 'Open WhatsApp and reply while intent is fresh.';

export default function LeadsPage({
  planTier,
  leadUsageCount,
  leadLimit,
  hasReachedLeadLimit,
  onUpgradeRequest,
}: LeadsPageProps) {
  const { currentWorkspace } = useWorkspace();
  const { leads, adsData, formatCurrency, pipelineAlerts, createLead } = useDatabase();
  const automationSamplePayload = React.useMemo(() => `{
  "workspaceId": "${currentWorkspace?.id || 'YOUR_WORKSPACE_ID'}",
  "platform": "meta",
  "campaign": "{{campaign_name}}",
  "externalLeadId": "{{lead_id}}",
  "externalFormId": "{{form_id}}",
  "contactName": "{{full_name}}",
  "contactPhone": "{{phone_number}}",
  "contactEmail": "{{email}}",
  "creativeName": "{{ad_name}}",
  "adsetName": "{{adset_name}}",
  "sourceEvent": "meta_lead_form"
}`, [currentWorkspace?.id]);
  const importInFlightRef = React.useRef(false);
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = React.useState(false);
  const [defaultStage, setDefaultStage] = React.useState<LeadStatus>('new');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>('all');
  const [qualityFilter, setQualityFilter] = React.useState<QualityFilter>('all');
  const [sortOption, setSortOption] = React.useState<SortOption>('value_desc');
  const [pageFeedback, setPageFeedback] = React.useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [pendingCaptureCount, setPendingCaptureCount] = React.useState(0);
  const [isManualImporting, setIsManualImporting] = React.useState(false);
  const [captureEndpointUnavailable, setCaptureEndpointUnavailable] = React.useState(false);
  const [newLead, setNewLead] = React.useState<CreateLeadInput>({
    name: '',
    source: 'meta',
    campaign: '',
    value: 500,
    status: 'new',
    score: 'medium',
    insight: 'Fresh inbound lead from paid traffic',
    recommendedAction: 'Review and contact within 24 hours',
    notes: '',
    creative_name: '',
    creative_type: 'image',
    quality_score: 'medium',
    ctr: 1.5,
    cpl: 15,
    conversionRate: 5,
  });

  const selectedLead = React.useMemo(() => leads.find((lead) => lead.id === selectedLeadId) || null, [leads, selectedLeadId]);

  const availableCampaigns = React.useMemo(() => {
    const uniqueCampaigns = new Map<string, { name: string; platform: 'meta' | 'google' }>();
    adsData.forEach((campaign) => {
      uniqueCampaigns.set(campaign.campaign_name, {
        name: campaign.campaign_name,
        platform: campaign.platform || 'meta',
      });
    });
    return [...uniqueCampaigns.values()];
  }, [adsData]);

  React.useEffect(() => {
    if (newLead.campaign || availableCampaigns.length === 0) return;
    const firstCampaign = availableCampaigns[0];
    setNewLead((previous) => ({
      ...previous,
      campaign: firstCampaign.name,
      source: firstCampaign.platform,
    }));
  }, [availableCampaigns, newLead.campaign]);

  const filteredLeads = React.useMemo(() => {
    const scoped = leads.filter((lead) => {
      const matchesSearch = searchTerm.trim()
        ? [lead.name, lead.campaign, lead.creative_name, lead.insight].some((field) =>
            field.toLowerCase().includes(searchTerm.trim().toLowerCase())
          )
        : true;
      const matchesSource = sourceFilter === 'all' ? true : lead.source === sourceFilter;
      const matchesQuality = qualityFilter === 'all' ? true : lead.quality_score === qualityFilter;
      return matchesSearch && matchesSource && matchesQuality;
    });

    const sorted = [...scoped];
    sorted.sort((left, right) => {
      if (sortOption === 'recent') return new Date(right.date).getTime() - new Date(left.date).getTime();
      if (sortOption === 'quality') return qualityRank[right.quality_score] - qualityRank[left.quality_score] || right.value - left.value;
      return right.value - left.value;
    });
    return sorted;
  }, [leads, qualityFilter, searchTerm, sortOption, sourceFilter]);

  const metaCampaignResultCount = React.useMemo(
    () => adsData
      .filter((campaign) => campaign.platform === 'meta')
      .reduce((total, campaign) => total + Math.max(0, Number(campaign.conversions || 0)), 0),
    [adsData]
  );

  const metaPipelineLeadCount = React.useMemo(
    () => leads.filter((lead) => lead.source === 'meta').length,
    [leads]
  );

  const proxyMessagingLeadCount = React.useMemo(
    () => leads.filter((lead) => lead.hook_tag === 'meta_messaging_conversation_started').length,
    [leads]
  );

  const pipelineStages: { id: LeadStatus; label: string; color: string }[] = [
    { id: 'new', label: 'New Leads', color: 'bg-blue-500' },
    { id: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
    { id: 'qualified', label: 'Qualified', color: 'bg-indigo-500' },
    { id: 'won', label: 'Closed (Won)', color: 'bg-emerald-500' },
    { id: 'lost', label: 'Lost', color: 'bg-red-500' },
  ];

  const getLeadsByStatus = (status: LeadStatus) => filteredLeads.filter((lead) => lead.status === status);
  const getColumnValue = (status: LeadStatus) => filteredLeads.filter((lead) => lead.status === status).reduce((acc, lead) => acc + lead.value, 0);

  const usagePercentage = planTier === 'pro' ? 100 : Math.min((leadUsageCount / leadLimit) * 100, 100);
  const totalPipelineWorth = filteredLeads.reduce((acc, lead) => acc + lead.value, 0);
  const wonLeads = filteredLeads.filter((lead) => lead.status === 'won');
  const efficiency = filteredLeads.length > 0 ? (wonLeads.length / filteredLeads.length) * 100 : 0;
  const averageDealSize = filteredLeads.length > 0 ? totalPipelineWorth / filteredLeads.length : 0;
  const activeLeads = filteredLeads.filter((lead) => lead.status !== 'won' && lead.status !== 'lost').length;
  const velocityIndex = efficiency >= 30 && activeLeads >= 5 ? 'High' : efficiency >= 15 ? 'Moderate' : 'Building';
  const filterCount = [searchTerm.trim().length > 0, sourceFilter !== 'all', qualityFilter !== 'all', sortOption !== 'value_desc'].filter(Boolean).length;

  const copyCaptureEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(API_CAPTURE_PATH);
      setPageFeedback({ type: 'success', message: 'Lead capture endpoint copied. Use it for your WhatsApp lead ingestion flow.' });
    } catch {
      setPageFeedback({ type: 'error', message: 'Could not copy the capture endpoint automatically.' });
    }
  };

  const importPendingCaptures = React.useCallback(async (mode: 'background' | 'manual' = 'background') => {
    if (!currentWorkspace || importInFlightRef.current || captureEndpointUnavailable) return;

    importInFlightRef.current = true;
    if (mode === 'manual') {
      setIsManualImporting(true);
    }

    try {
      const events = await fetchPendingLeadCaptures(currentWorkspace.id);
      setPendingCaptureCount(events.length);

      if (events.length === 0) {
        return;
      }

      let importedCount = 0;

      for (const event of events) {
        const created = await createLead({
          name: buildLeadName(event),
          source: event.platform,
          campaign: event.campaign,
          value: Number(event.value || 0),
          status: 'new',
          score: event.score || 'medium',
          insight: buildLeadInsight(event),
          recommendedAction: buildRecommendedAction(event),
          notes: event.contactPhone ? `WhatsApp contact: ${event.contactPhone}` : `Inbound source: ${event.sourceEvent || 'whatsapp_click'}`,
          creative_name: event.creativeName || `${event.campaign}_WhatsApp_Click`,
          creative_type: event.creativeType || 'image',
          hook_tag: event.sourceEvent || 'whatsapp_click',
          adset_name: event.adsetName || undefined,
          quality_score: event.qualityScore || 'medium',
          ctr: Number(event.ctr || 0),
          cpl: Number(event.cpl || 0),
          conversionRate: Number(event.conversionRate || 0),
        });

        if (created) {
          await consumeLeadCapture(event.id);
          importedCount += 1;
        }
      }

      if (importedCount > 0) {
        setPendingCaptureCount((current) => Math.max(0, current - importedCount));
        setPageFeedback({ type: 'success', message: `${importedCount} inbound WhatsApp lead${importedCount === 1 ? '' : 's'} imported into New Leads.` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lead capture sync failed.';
      setPendingCaptureCount(0);

      if (error instanceof LeadCaptureApiError && error.status === 404) {
        setCaptureEndpointUnavailable(true);
      }

      if (mode === 'manual') {
        setPageFeedback({
          type: message.includes('returned HTML instead of JSON') ? 'info' : 'error',
          message,
        });
      }
    } finally {
      importInFlightRef.current = false;
      if (mode === 'manual') {
        setIsManualImporting(false);
      }
    }
  }, [captureEndpointUnavailable, createLead, currentWorkspace]);

  React.useEffect(() => {
    if (!currentWorkspace || captureEndpointUnavailable) return;
    void importPendingCaptures('background');
    const interval = window.setInterval(() => {
      void importPendingCaptures('background');
    }, 15000);
    return () => window.clearInterval(interval);
  }, [captureEndpointUnavailable, currentWorkspace?.id, importPendingCaptures]);

  const simulateWhatsAppLead = async () => {
    if (!currentWorkspace) {
      setPageFeedback({ type: 'error', message: 'No active workspace found for lead capture.' });
      return;
    }

    const firstCampaign = availableCampaigns[0];
    if (!firstCampaign) {
      setPageFeedback({ type: 'error', message: 'Sync campaigns first so auto-captured leads can be linked to a campaign.' });
      return;
    }

    try {
      setCaptureEndpointUnavailable(false);
      await createLeadCapture({
        workspaceId: currentWorkspace.id,
        platform: firstCampaign.platform,
        campaign: firstCampaign.name,
        contactName: 'Inbound WhatsApp Prospect',
        contactPhone: '+60123456789',
        creativeName: `${firstCampaign.name}_WhatsApp_Click`,
        creativeType: 'image',
        value: 650,
        ctr: 2.1,
        cpl: 14.5,
        conversionRate: 6.2,
        score: 'medium',
        qualityScore: 'medium',
        sourceEvent: 'whatsapp_click',
      });
      setPageFeedback({ type: 'info', message: 'Test WhatsApp click captured. Importing it into New Leads now.' });
      await importPendingCaptures('manual');
    } catch (error) {
      setPageFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Could not simulate a WhatsApp lead.' });
    }
  };

  const openCreateLeadModal = (stage: LeadStatus) => {
    setDefaultStage(stage);
    setFormError(null);
    setNewLead((previous) => ({
      ...previous,
      status: stage,
      campaign: previous.campaign || availableCampaigns[0]?.name || '',
      source: previous.campaign ? previous.source : availableCampaigns[0]?.platform || previous.source,
    }));
    setIsCreateLeadOpen(true);
  };

  const closeCreateLeadModal = () => {
    setIsCreateLeadOpen(false);
    setIsSubmitting(false);
    setFormError(null);
  };

  const handleCampaignChange = (campaignName: string) => {
    const matchedCampaign = availableCampaigns.find((campaign) => campaign.name === campaignName);
    setNewLead((previous) => ({
      ...previous,
      campaign: campaignName,
      source: matchedCampaign?.platform || previous.source,
    }));
  };

  const handleCreateLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newLead.name.trim() || !newLead.campaign.trim() || !newLead.creative_name.trim()) {
      setFormError('Name, campaign, and creative are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const createdLead = await createLead({
      ...newLead,
      status: defaultStage,
      value: Number(newLead.value),
      ctr: Number(newLead.ctr),
      cpl: Number(newLead.cpl),
      conversionRate: Number(newLead.conversionRate),
    });

    if (!createdLead) {
      setFormError('Lead could not be created. Please try again.');
      setIsSubmitting(false);
      return;
    }

    setSelectedLeadId(createdLead.id);
    setPageFeedback({ type: 'success', message: `${createdLead.name} was added to ${pipelineStages.find((stage) => stage.id === defaultStage)?.label}.` });
    setNewLead({
      name: '',
      source: availableCampaigns[0]?.platform || 'meta',
      campaign: availableCampaigns[0]?.name || '',
      value: 500,
      status: 'new',
      score: 'medium',
      insight: 'Fresh inbound lead from paid traffic',
      recommendedAction: 'Review and contact within 24 hours',
      notes: '',
      creative_name: '',
      creative_type: 'image',
      quality_score: 'medium',
      ctr: 1.5,
      cpl: 15,
      conversionRate: 5,
    });
    setIsSubmitting(false);
    setIsCreateLeadOpen(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSourceFilter('all');
    setQualityFilter('all');
    setSortOption('value_desc');
    setPageFeedback({ type: 'info', message: 'Lead filters cleared.' });
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-32 lg:px-8">
      <div className="mb-12 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <Users size={14} />
            Lead Management
          </div>
          <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">Sales Pipeline</h1>
          <p className="mt-2 font-medium text-on-surface-variant">Manage imported lead records here, then move each lead manually through your sales pipeline.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilterPanel((current) => !current)} className="flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
            <Filter size={18} />
            Filter {filterCount > 0 ? `(${filterCount})` : ''}
          </button>
          <button onClick={() => setSortOption((current) => current === 'value_desc' ? 'recent' : current === 'recent' ? 'quality' : 'value_desc')} className="flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
            <ArrowUpDown size={18} />
            Sort By {sortOption === 'value_desc' ? 'Value' : sortOption === 'recent' ? 'Recent' : 'Quality'}
          </button>
        </div>
      </div>

      {pageFeedback && (
        <div className={`mb-6 flex items-start gap-3 rounded-[1.5rem] px-5 py-4 text-sm font-medium ${
          pageFeedback.type === 'error'
            ? 'border border-red-200 bg-red-50 text-red-700'
            : pageFeedback.type === 'success'
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border border-blue-200 bg-blue-50 text-blue-800'
        }`}>
          {pageFeedback.type === 'error' ? <AlertCircle size={18} className="mt-0.5" /> : pageFeedback.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <Info size={18} className="mt-0.5" />}
          <div className="flex-1">{pageFeedback.message}</div>
          <button onClick={() => setPageFeedback(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {showFilterPanel && (
        <div className="panel-surface mb-8 grid gap-4 rounded-[2rem] p-6 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Search Lead</span>
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by lead, campaign, creative..." className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Source</span>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilter)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none">
              <option value="all">All Sources</option>
              <option value="meta">Meta Ads</option>
              <option value="google">Google Ads</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Quality</span>
            <select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value as QualityFilter)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none">
              <option value="all">All Quality</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={resetFilters} className="w-full rounded-2xl border border-outline-variant/30 px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {metaCampaignResultCount > 0 && metaPipelineLeadCount === 0 && (
        <div className="mb-8 rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black tracking-tight">
                Meta sync found {metaCampaignResultCount} campaign-level result{metaCampaignResultCount === 1 ? '' : 's'}, but no lead records have been imported yet.
              </p>
              <p className="mt-1 text-sm font-medium text-amber-800">
                Those Meta numbers come from campaign insights. This pipeline only shows contact-level lead records saved in the app, so `New Leads` stays empty until leads are posted to the intake API or synced from a dedicated Meta lead source.
              </p>
            </div>
          </div>
        </div>
      )}

      {proxyMessagingLeadCount > 0 && (
        <div className="mb-8 rounded-[2rem] border border-blue-200 bg-blue-50 px-5 py-4 text-blue-900">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black tracking-tight">
                {proxyMessagingLeadCount} WhatsApp conversation lead{proxyMessagingLeadCount === 1 ? '' : 's'} were auto-created from Meta messaging results.
              </p>
              <p className="mt-1 text-sm font-medium text-blue-800">
                These are placeholder leads generated from `messaging conversation started` counts. They help your pipeline move, but you still need to match each one to the actual WhatsApp chat manually because normal WhatsApp Business does not expose contact details to the app.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="panel-surface rounded-[2rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                  planTier === 'pro' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {planTier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </span>
                {hasReachedLeadLimit && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">
                    Limit Reached
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-2xl font-black font-headline text-on-surface">
                {hasReachedLeadLimit ? "You've reached your lead limit" : 'Lead usage and access'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium text-on-surface-variant">
                {hasReachedLeadLimit
                  ? 'Your workspace is still visible, but adding new leads and advanced workflow actions are now reserved for Pro.'
                  : planTier === 'pro'
                  ? 'Your Pro workspace has unlimited lead capacity, AI recommendations, and future automation hooks ready.'
                  : 'Free includes up to 50 leads and full manual pipeline movement. Upgrade later when you need higher volume automation.'}
              </p>
            </div>

            {planTier === 'free' && (
              <button onClick={onUpgradeRequest} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-black/15 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Crown size={16} />
                Upgrade Now
              </button>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="text-on-surface-variant">Lead capacity</span>
              <span className="text-on-surface">
                {planTier === 'pro' ? `${leadUsageCount} leads managed` : `${leadUsageCount} / ${leadLimit}`}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
              <div className={`h-full rounded-full transition-all duration-700 ${
                hasReachedLeadLimit ? 'bg-amber-500' : planTier === 'pro' ? 'bg-emerald-500' : 'bg-primary'
              }`} style={{ width: `${usagePercentage}%` }} />
            </div>
          </div>
        </div>

        <div className="panel-surface rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageCircleMore size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Inbound Capture</p>
              <h3 className="mt-1 text-xl font-black text-on-surface">Lead Intake Endpoint</h3>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-on-surface-variant">
            This endpoint imports contact-level events into `New Leads`. Meta campaign lead totals do not appear here until an actual lead record is posted to the intake API or synced from a dedicated Meta lead-form integration.
          </p>
          <div className="mt-5 rounded-[1.5rem] border border-outline-variant/20 bg-surface-container-low p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Capture Endpoint</p>
            <p className="mt-2 break-all text-sm font-bold text-on-surface">{API_CAPTURE_PATH}</p>
            <p className="mt-2 text-xs text-on-surface-variant">
              {captureEndpointUnavailable
                ? 'The capture API is not reachable right now, so automatic polling is paused until the backend is available again.'
                : 'Pass at least `workspaceId`, `campaign`, and `platform` in a POST request. Make/Zapier can also send `lead_id`, `form_id`, `full_name`, `phone_number`, and `email`.'}
            </p>
            {currentWorkspace && (
              <p className="mt-2 text-xs font-semibold text-on-surface-variant">
                Workspace ID: <span className="font-bold text-on-surface">{currentWorkspace.id}</span>
              </p>
            )}
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-outline-variant/20 bg-surface-container-low p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Make / Zapier Payload</p>
            <pre className="mt-3 overflow-x-auto text-xs font-medium leading-6 text-on-surface">{automationSamplePayload}</pre>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={copyCaptureEndpoint} className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-bold text-on-surface">
              <Copy size={16} />
              Copy Endpoint
            </button>
            <button onClick={() => void importPendingCaptures('manual')} disabled={isManualImporting || captureEndpointUnavailable} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${isManualImporting || captureEndpointUnavailable ? 'bg-surface-container-high text-on-surface-variant' : 'bg-primary text-white'}`}>
              <RefreshCw size={16} className={isManualImporting ? 'animate-spin' : ''} />
              {captureEndpointUnavailable ? 'Capture API Offline' : isManualImporting ? 'Importing...' : `Import Pending (${pendingCaptureCount})`}
            </button>
            <button onClick={() => void simulateWhatsAppLead()} className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-4 py-2 text-sm font-bold text-on-surface">
              <Sparkles size={16} />
              Simulate WhatsApp Lead
            </button>
          </div>
        </div>
      </div>

      {pipelineAlerts.length > 0 && (
        <div className="mb-10 space-y-3">
          {pipelineAlerts.map((alert) => (
            <div key={alert.id} className={`flex items-center gap-4 rounded-2xl border p-4 transition-all animate-in fade-in slide-in-from-top-2 duration-500 ${
              alert.severity === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : alert.severity === 'info'
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}>
              <div className={`rounded-xl p-2 ${
                alert.severity === 'warning' ? 'bg-amber-100' : alert.severity === 'info' ? 'bg-blue-100' : 'bg-emerald-100'
              }`}>
                {alert.severity === 'warning' ? <AlertCircle size={18} /> : alert.severity === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <p className="text-sm font-bold tracking-tight">{alert.message}</p>
              <button className="ml-auto rounded-lg p-1.5 transition-colors hover:bg-black/5">
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="scrollbar-hide -mx-4 flex gap-5 overflow-x-auto px-4 pb-8 lg:mx-0 lg:px-0">
        {pipelineStages.map((stage) => {
          const stageLeads = getLeadsByStatus(stage.id);
          const stageValue = getColumnValue(stage.id);

          return (
            <div key={stage.id} className="panel-surface flex h-auto w-[290px] flex-shrink-0 flex-col rounded-[2.25rem] p-5 lg:h-[calc(100vh-220px)]">
              <div className="mb-5 px-1">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                    <h3 className="text-sm font-black uppercase tracking-widest text-on-surface">{stage.label}</h3>
                  </div>
                  <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-[10px] font-black text-on-surface-variant">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-on-surface-variant">Worth:</span>
                  <span className="text-lg font-black text-on-surface">{formatCurrency(stageValue)}</span>
                </div>
              </div>

              <div className="min-h-[460px] space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                {stageLeads.length > 0 ? stageLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onSelect={(item) => setSelectedLeadId(item.id)} />
                )) : (
                  <div className="flex h-40 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-outline-variant/10 p-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest italic text-on-surface-variant/30">No leads in stage</p>
                  </div>
                )}
              </div>

              {hasReachedLeadLimit ? (
                <button onClick={onUpgradeRequest} className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 py-4 text-amber-700 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary lg:mt-4">
                  <Lock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Upgrade to Add More Leads</span>
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                </button>
              ) : (
                <button onClick={() => openCreateLeadModal(stage.id)} className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-variant/20 py-4 text-on-surface-variant/50 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary lg:mt-4">
                  <span className="text-[10px] font-black uppercase tracking-widest">Add Lead</span>
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel-surface mt-16 rounded-[3rem] p-10">
        <h4 className="mb-8 flex items-center gap-3 px-2 font-headline text-xl font-bold text-on-surface">
          Pipeline Intelligence
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">Real-time Data</span>
        </h4>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="border-r border-outline-variant/10 px-4 last:border-0">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Total Pipeline Worth</p>
            <p className="font-headline text-3xl font-black text-on-surface">{formatCurrency(totalPipelineWorth)}</p>
          </div>
          <div className="border-r border-outline-variant/10 px-4 last:border-0">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Lead to Sale Efficiency</p>
            <p className="font-headline text-3xl font-black text-emerald-600">{efficiency.toFixed(1)}%</p>
          </div>
          <div className="border-r border-outline-variant/10 px-4 last:border-0">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Average Deal Size</p>
            <p className="font-headline text-3xl font-black text-on-surface">{formatCurrency(averageDealSize)}</p>
          </div>
          <div className="border-r border-outline-variant/10 px-4 last:border-0">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Velocity Index</p>
            <p className="font-headline text-3xl font-black text-primary">{velocityIndex}</p>
          </div>
        </div>
      </div>

      <LeadDetailsDrawer lead={selectedLead} onClose={() => setSelectedLeadId(null)} />

      {isCreateLeadOpen && (
        <div className="fixed inset-0 z-[110]">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeCreateLeadModal} />
          <div className="absolute inset-x-0 top-10 mx-auto max-h-[88vh] w-[min(760px,calc(100%-2rem))] overflow-y-auto rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">New Lead</p>
                <h2 className="mt-2 text-3xl font-black font-headline text-on-surface">Add lead to {pipelineStages.find((stage) => stage.id === defaultStage)?.label}</h2>
                <p className="mt-2 text-sm font-medium text-on-surface-variant">Capture the campaign, creative, and quality signal so this pipeline stays tied to paid ads performance.</p>
              </div>
              <button onClick={closeCreateLeadModal} className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high">
                <X size={20} />
              </button>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleCreateLead}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Lead Name</span>
                  <input value={newLead.name} onChange={(event) => setNewLead((previous) => ({ ...previous, name: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary" placeholder="Aisyah Rahman" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Campaign</span>
                  <select value={newLead.campaign} onChange={(event) => handleCampaignChange(event.target.value)} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary">
                    {availableCampaigns.length === 0 ? <option value="">No campaigns available</option> : availableCampaigns.map((campaign) => (
                      <option key={campaign.name} value={campaign.name}>{campaign.name}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Platform</span>
                  <select value={newLead.source} onChange={(event) => setNewLead((previous) => ({ ...previous, source: event.target.value as 'meta' | 'google' }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary">
                    <option value="meta">Meta Ads</option>
                    <option value="google">Google Ads</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Estimated Value</span>
                  <input type="number" min="0" value={newLead.value} onChange={(event) => setNewLead((previous) => ({ ...previous, value: Number(event.target.value) }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Creative Name</span>
                  <input value={newLead.creative_name} onChange={(event) => setNewLead((previous) => ({ ...previous, creative_name: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary" placeholder="UGC_Hook_V3" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Creative Type</span>
                  <select value={newLead.creative_type} onChange={(event) => setNewLead((previous) => ({ ...previous, creative_type: event.target.value as 'video' | 'image' }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary">
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Lead Score</span>
                  <select value={newLead.score} onChange={(event) => setNewLead((previous) => ({ ...previous, score: event.target.value as 'high' | 'medium' | 'low' }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Quality</span>
                  <select value={newLead.quality_score} onChange={(event) => setNewLead((previous) => ({ ...previous, quality_score: event.target.value as 'high' | 'medium' | 'low' }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">CTR %</span>
                  <input type="number" min="0" step="0.1" value={newLead.ctr} onChange={(event) => setNewLead((previous) => ({ ...previous, ctr: Number(event.target.value) }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary" />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">CPL</span>
                  <input type="number" min="0" step="0.1" value={newLead.cpl} onChange={(event) => setNewLead((previous) => ({ ...previous, cpl: Number(event.target.value) }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary" />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Conversion %</span>
                  <input type="number" min="0" step="0.1" value={newLead.conversionRate} onChange={(event) => setNewLead((previous) => ({ ...previous, conversionRate: Number(event.target.value) }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary" />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Insight</span>
                <input value={newLead.insight} onChange={(event) => setNewLead((previous) => ({ ...previous, insight: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary" placeholder="Low CPL and strong intent from this ad set" />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Recommended Action</span>
                <input value={newLead.recommendedAction} onChange={(event) => setNewLead((previous) => ({ ...previous, recommendedAction: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary" placeholder="Call within 10 minutes and send pricing" />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant">Notes</span>
                <textarea value={newLead.notes} onChange={(event) => setNewLead((previous) => ({ ...previous, notes: event.target.value }))} className="h-28 w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary" placeholder="Short call prep, objections, or source notes" />
              </label>

              {formError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</div>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeCreateLeadModal} className="rounded-full border border-outline-variant/30 px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-full bg-primary px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
