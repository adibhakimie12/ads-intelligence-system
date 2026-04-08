import { supabase } from './supabase';
import type { MetaSyncRange } from '../utils/metaSyncRange';

type ErrorResult = {
  ok: false;
  error: string;
};

type WorkspaceSummaryPayload = {
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
} | null;

type BeginMetaConnectionResult =
  | ErrorResult
  | {
      ok: true;
      error?: undefined;
      url: string;
    };

type SelectMetaAccountResult =
  | ErrorResult
  | {
      ok: true;
      error?: undefined;
      success: true;
      selectedAccount: { id: string; name: string };
    };

type UpdateMetaAccountFundsResult =
  | ErrorResult
  | {
      ok: true;
      error?: undefined;
      success: true;
      manualAvailableFunds: number | null;
    };

type SyncMetaAccountResult =
  | ErrorResult
  | {
      ok: true;
      error?: undefined;
      success: true;
      syncedAt: string;
      connectedAccount: { id: string; name: string };
      summary: WorkspaceSummaryPayload;
      campaigns: Array<{
        id: string;
        campaign_name: string;
        delivery?: string;
        resultsLabel?: string;
        budget?: number;
        spend: number;
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
        platform: 'meta';
      }>;
      creatives: Array<{
        id: string;
        origin: 'synced' | 'uploaded';
        platform: 'meta' | 'google';
        creative_name: string;
        campaign_name?: string;
        campaign_external_id?: string;
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
        hook_strength: number;
        message_clarity: number;
        cta_presence: number;
        fatigue: 'low' | 'medium' | 'high';
        analysis_summary?: string;
        suggestions?: string[];
        snapshot_date?: string;
      }>;
      insights: Array<{
        id: string;
        type: 'attention' | 'efficiency' | 'performance' | 'ads' | 'creative' | 'funnel' | 'sales';
        severity: 'attention' | 'efficiency' | 'performance';
        message: string;
        reasoning: string;
        priority: 'high' | 'medium' | 'low';
        action: string;
        actionLabel: string;
        platform?: 'meta' | 'google';
      }>;
      leads: Array<{
        id: string;
        workspace_id?: string;
        name: string;
        source: 'meta' | 'google';
        campaign: string;
        value: number;
        status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
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
      }>;
      leadSync: {
        forms: number;
        leadsDiscovered: number;
        synced: number;
        error: string | null;
      };
    };

type SyncGoogleAdsResult =
  | ErrorResult
  | {
      ok: true;
      error?: undefined;
      success: true;
      syncedAt: string;
      summary: WorkspaceSummaryPayload;
      campaigns: Array<{
        id: string;
        campaign_name: string;
        spend: number;
        CTR: number;
        CPM: number;
        ROAS: number;
        conversions: number;
        revenue: number;
        date: string;
        platform: 'google';
      }>;
      creatives: Array<{
        id: string;
        origin: 'synced' | 'uploaded';
        platform: 'meta' | 'google';
        creative_name: string;
        campaign_name?: string;
        campaign_external_id?: string;
        media_type?: 'video' | 'image';
        hook_type?: string;
        score?: number;
        status: 'WINNING' | 'TESTING' | 'FATIGUE DETECTED' | 'KILL' | 'COLD TEST';
        CTR?: number;
        ROAS?: number;
        spend?: number;
        imageUrl?: string;
        thumbnailUrl?: string;
        hook_strength: number;
        message_clarity: number;
        cta_presence: number;
        fatigue: 'low' | 'medium' | 'high';
        analysis_summary?: string;
        suggestions?: string[];
        snapshot_date?: string;
      }>;
    };

const getAccessToken = async (): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase auth is not configured yet.');
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in before managing Meta Ads.');
  }

  return accessToken;
};

const readJsonResponse = async (response: Response): Promise<any> => {
  const raw = await response.text();
  if (!raw) {
    throw new Error('The local API returned an empty response.');
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`The local API returned invalid JSON (status ${response.status}).`);
  }
};

export const beginMetaConnection = async (workspaceId: string): Promise<BeginMetaConnectionResult> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch('/api/meta-connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ workspaceId }),
    });

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      return { ok: false, error: payload.error || 'Failed to start Meta connection.' };
    }

    return { ok: true, url: payload.url as string };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to start Meta connection.',
    };
  }
};

export const selectPrimaryMetaAdAccount = async (
  workspaceId: string,
  adAccountId: string
): Promise<SelectMetaAccountResult> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch('/api/meta-select-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ workspaceId, adAccountId }),
    });

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      return { ok: false, error: payload.error || 'Failed to select the primary Meta ad account.' };
    }

    return {
      ok: true,
      success: true,
      selectedAccount: payload.selectedAccount as { id: string; name: string },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to select the primary Meta ad account.',
    };
  }
};

export const updateMetaAdAccountManualFunds = async (
  workspaceId: string,
  adAccountId: string,
  manualAvailableFunds: number | null
): Promise<UpdateMetaAccountFundsResult> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch('/api/meta-update-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ workspaceId, adAccountId, manualAvailableFunds }),
    });

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      return { ok: false, error: payload.error || 'Failed to update Meta account funds.' };
    }

    return {
      ok: true,
      success: true,
      manualAvailableFunds: payload.manualAvailableFunds as number | null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to update Meta account funds.',
    };
  }
};

export const syncPrimaryMetaAccount = async (workspaceId: string): Promise<SyncMetaAccountResult> => {
  return syncPrimaryMetaAccountWithRange(workspaceId, 'today');
};

export const syncPrimaryMetaAccountWithRange = async (workspaceId: string, syncRange: MetaSyncRange): Promise<SyncMetaAccountResult> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch('/api/meta-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ workspaceId, syncRange }),
    });

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      return { ok: false, error: payload.error || 'Failed to sync the selected Meta ad account.' };
    }

    return {
      ok: true,
      success: true,
      syncedAt: payload.syncedAt as string,
      connectedAccount: payload.connectedAccount as { id: string; name: string },
      summary: payload.summary as WorkspaceSummaryPayload,
      campaigns: payload.campaigns as Array<{
        id: string;
        campaign_name: string;
        delivery?: string;
        resultsLabel?: string;
        budget?: number;
        spend: number;
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
        platform: 'meta';
      }>,
      creatives: payload.creatives as Array<{
        id: string;
        origin: 'synced' | 'uploaded';
        platform: 'meta' | 'google';
        creative_name: string;
        campaign_name?: string;
        campaign_external_id?: string;
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
        hook_strength: number;
        message_clarity: number;
        cta_presence: number;
        fatigue: 'low' | 'medium' | 'high';
        analysis_summary?: string;
        suggestions?: string[];
        snapshot_date?: string;
      }>,
      insights: payload.insights as Array<{
        id: string;
        type: 'attention' | 'efficiency' | 'performance' | 'ads' | 'creative' | 'funnel' | 'sales';
        severity: 'attention' | 'efficiency' | 'performance';
        message: string;
        reasoning: string;
        priority: 'high' | 'medium' | 'low';
        action: string;
        actionLabel: string;
        platform?: 'meta' | 'google';
      }>,
      leads: payload.leads as Array<{
        id: string;
        workspace_id?: string;
        name: string;
        source: 'meta' | 'google';
        campaign: string;
        value: number;
        status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
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
      }>,
      leadSync: payload.leadSync as {
        forms: number;
        leadsDiscovered: number;
        synced: number;
        error: string | null;
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to sync the selected Meta ad account.',
    };
  }
};

export const syncWorkspaceGoogleAds = async (workspaceId: string): Promise<SyncGoogleAdsResult> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch('/api/google-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ workspaceId }),
    });

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      return { ok: false, error: payload.error || 'Failed to sync Google Ads.' };
    }

    return {
      ok: true,
      success: true,
      syncedAt: payload.syncedAt as string,
      summary: payload.summary as WorkspaceSummaryPayload,
      campaigns: payload.campaigns as Array<{
        id: string;
        campaign_name: string;
        spend: number;
        CTR: number;
        CPM: number;
        ROAS: number;
        conversions: number;
        revenue: number;
        date: string;
        platform: 'google';
      }>,
      creatives: payload.creatives as Array<{
        id: string;
        origin: 'synced' | 'uploaded';
        platform: 'meta' | 'google';
        creative_name: string;
        campaign_name?: string;
        campaign_external_id?: string;
        media_type?: 'video' | 'image';
        hook_type?: string;
        score?: number;
        status: 'WINNING' | 'TESTING' | 'FATIGUE DETECTED' | 'KILL' | 'COLD TEST';
        CTR?: number;
        ROAS?: number;
        spend?: number;
        imageUrl?: string;
        thumbnailUrl?: string;
        hook_strength: number;
        message_clarity: number;
        cta_presence: number;
        fatigue: 'low' | 'medium' | 'high';
        analysis_summary?: string;
        suggestions?: string[];
        snapshot_date?: string;
      }>,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to sync Google Ads.',
    };
  }
};
