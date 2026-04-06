import { fetchGoogleAdsData } from './_lib/ads.js';
import { buildCreativeSnapshotsFromCampaigns } from './_lib/creative-engine.js';
import { isSupabaseServerConfigured, supabaseAdmin, supabaseAuthClient } from './_lib/supabase-admin.js';

const toUiCampaign = (campaign, snapshotDate) => ({
  ...campaign,
  date: snapshotDate,
  platform: 'google',
});

const buildWorkspaceSummary = (workspaceId, snapshotDate, campaigns) => {
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + campaign.revenue, 0);
  const totalConversions = campaigns.reduce((sum, campaign) => sum + campaign.conversions, 0);
  const averageCtr = campaigns.length > 0
    ? campaigns.reduce((sum, campaign) => sum + campaign.CTR, 0) / campaigns.length
    : 0;
  const averageCpm = campaigns.length > 0
    ? campaigns.reduce((sum, campaign) => sum + campaign.CPM, 0) / campaigns.length
    : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0;

  return {
    workspace_id: workspaceId,
    summary_date: snapshotDate,
    provider: 'google',
    total_spend: totalSpend,
    total_revenue: totalRevenue,
    total_conversions: totalConversions,
    average_ctr: averageCtr,
    average_cpm: averageCpm,
    roas,
    profit_margin: profitMargin,
    campaign_count: campaigns.length,
  };
};

const toCreativeEngineCampaign = (campaign) => ({
  campaignId: campaign.id,
  campaignName: campaign.campaign_name,
  spend: campaign.spend,
  ctr: campaign.CTR,
  cpm: campaign.CPM,
  roas: campaign.ROAS,
  conversions: campaign.conversions,
});

const toUiCreative = (creative) => ({
  id: creative.creative_external_id || creative.id,
  origin: creative.origin,
  platform: creative.source_platform,
  creative_name: creative.creative_name,
  campaign_name: creative.campaign_name || undefined,
  campaign_external_id: creative.campaign_external_id || undefined,
  media_type: creative.media_type,
  hook_type: creative.hook_type || undefined,
  score: Number(creative.score || 0),
  status: creative.status,
  CTR: Number(creative.ctr || 0),
  ROAS: Number(creative.roas || 0),
  spend: Number(creative.spend || 0),
  imageUrl: creative.preview_url || creative.thumbnail_url || undefined,
  thumbnailUrl: creative.thumbnail_url || creative.preview_url || undefined,
  hook_strength: Number(creative.hook_strength || 0),
  message_clarity: Number(creative.message_clarity || 0),
  cta_presence: Number(creative.cta_presence || 0),
  fatigue: creative.fatigue,
  analysis_summary: creative.analysis_summary || undefined,
  suggestions: Array.isArray(creative.suggestions) ? creative.suggestions : [],
  snapshot_date: creative.snapshot_date,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isSupabaseServerConfigured || !supabaseAdmin || !supabaseAuthClient) {
    return res.status(400).json({ error: 'Supabase server configuration is missing.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  const { data: authData, error: authError } = await supabaseAuthClient.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Invalid user session.' });
  }

  const { workspaceId } = req.body || {};
  if (!workspaceId) {
    return res.status(400).json({ error: 'workspaceId is required.' });
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authData.user.id)
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({ error: 'You do not have access to that workspace.' });
  }

  const startedAt = new Date().toISOString();
  const snapshotDate = startedAt.slice(0, 10);

  const { data: syncJob, error: syncJobError } = await supabaseAdmin
    .from('sync_jobs')
    .insert({
      workspace_id: workspaceId,
      provider: 'google',
      status: 'running',
      started_at: startedAt,
    })
    .select('id')
    .single();

  if (syncJobError || !syncJob) {
    return res.status(500).json({ error: syncJobError?.message || 'Failed to create sync job.' });
  }

  try {
    const campaigns = await fetchGoogleAdsData();
    const creativeRows = buildCreativeSnapshotsFromCampaigns(
      workspaceId,
      campaigns.map((campaign) => toCreativeEngineCampaign(campaign)),
      'google',
      snapshotDate
    );
    const summaryRow = buildWorkspaceSummary(workspaceId, snapshotDate, campaigns);

    await supabaseAdmin
      .from('creative_snapshots')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('source_platform', 'google')
      .eq('origin', 'synced')
      .eq('snapshot_date', snapshotDate);

    if (creativeRows.length > 0) {
      const { error: creativeInsertError } = await supabaseAdmin
        .from('creative_snapshots')
        .insert(creativeRows);

      if (creativeInsertError) {
        throw new Error(creativeInsertError.message);
      }
    }

    const { error: summaryError } = await supabaseAdmin
      .from('workspace_daily_summaries')
      .upsert(summaryRow, {
        onConflict: 'workspace_id,summary_date,provider',
      });

    if (summaryError) {
      throw new Error(summaryError.message);
    }

    const finishedAt = new Date().toISOString();
    const { error: finishError } = await supabaseAdmin
      .from('sync_jobs')
      .update({
        status: 'success',
        finished_at: finishedAt,
      })
      .eq('id', syncJob.id);

    if (finishError) {
      throw new Error(finishError.message);
    }

    return res.status(200).json({
      success: true,
      syncedAt: finishedAt,
      summary: summaryRow,
      campaigns: campaigns.map((campaign) => toUiCampaign(campaign, snapshotDate)),
      creatives: creativeRows.map((creative) => toUiCreative(creative)),
    });
  } catch (syncError) {
    console.error('Google sync error:', syncError);

    await supabaseAdmin
      .from('sync_jobs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: syncError instanceof Error ? syncError.message : 'Unknown sync failure',
      })
      .eq('id', syncJob.id);

    return res.status(500).json({
      error: syncError instanceof Error ? syncError.message : 'Failed to sync Google campaigns.',
    });
  }
}
