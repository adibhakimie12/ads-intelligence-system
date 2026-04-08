import { fetchMetaAdAccountBilling, fetchMetaAdAccounts, fetchMetaAdCreatives, fetchMetaCampaignInsights, fetchMetaLeadGenForms, fetchMetaLeadGenLeads, resolveDailyPresetDate } from './_lib/meta-graph.js';
import { buildCreativeSnapshotsFromAds } from './_lib/creative-engine.js';
import { generateInsightsFromCampaigns } from './_lib/insight-engine.js';
import { isSupabaseServerConfigured, supabaseAdmin, supabaseAuthClient } from './_lib/supabase-admin.js';
import { decryptAccessToken, isTokenEncryptionConfigured } from './_lib/token-crypto.js';

const toUiCampaign = (campaign, snapshotDate) => ({
  id: campaign.campaignId,
  campaign_name: campaign.campaignName,
  delivery: campaign.delivery,
  resultsLabel: campaign.resultsLabel,
  budget: campaign.budget,
  spend: campaign.spend,
  reach: campaign.reach,
  impressions: campaign.impressions,
  costPerResult: campaign.costPerResult,
  CTR: campaign.ctr,
  linkCTR: campaign.linkCtr,
  linkClicks: campaign.linkClicks,
  costPerLinkClick: campaign.costPerLinkClick,
  videoViews3s: campaign.videoViews3s,
  hookRate: campaign.hookRate,
  videoViews25: campaign.videoViews25,
  videoViews50: campaign.videoViews50,
  videoViews75: campaign.videoViews75,
  rate75VV: campaign.rate75VV,
  CPM: campaign.cpm,
  ROAS: campaign.roas,
  conversions: campaign.conversions,
  revenue: campaign.spend * campaign.roas,
  date: snapshotDate,
  platform: 'meta',
});

const toUiInsight = (insight, index) => ({
  id: `insight_${index}_${insight.type}`,
  ...insight,
});

const toUiCreative = (creative) => ({
  id: creative.creative_external_id || creative.id,
  origin: creative.origin,
  platform: creative.source_platform,
  creative_name: creative.creative_name,
  campaign_name: creative.campaign_name || undefined,
  campaign_external_id: creative.campaign_external_id || undefined,
  adset_name: creative.adset_name || undefined,
  ad_name: creative.ad_name || undefined,
  media_type: creative.media_type,
  hook_type: creative.hook_type || undefined,
  score: Number(creative.score || 0),
  status: creative.status,
  CTR: Number(creative.ctr || 0),
  linkCTR: creative.link_ctr != null ? Number(creative.link_ctr) : undefined,
  ROAS: Number(creative.roas || 0),
  spend: Number(creative.spend || 0),
  impressions: creative.impressions != null ? Number(creative.impressions) : undefined,
  linkClicks: creative.link_clicks != null ? Number(creative.link_clicks) : undefined,
  costPerLinkClick: creative.cost_per_link_click != null ? Number(creative.cost_per_link_click) : undefined,
  costPerResult: creative.cost_per_result != null ? Number(creative.cost_per_result) : undefined,
  targetCpl: creative.target_cpl != null ? Number(creative.target_cpl) : undefined,
  maxCpl: creative.max_cpl != null ? Number(creative.max_cpl) : undefined,
  hookRate: creative.hook_rate != null ? Number(creative.hook_rate) : undefined,
  videoViews3s: creative.video_views_3s != null ? Number(creative.video_views_3s) : undefined,
  videoViews25: creative.video_views_25 != null ? Number(creative.video_views_25) : undefined,
  videoViews50: creative.video_views_50 != null ? Number(creative.video_views_50) : undefined,
  videoViews75: creative.video_views_75 != null ? Number(creative.video_views_75) : undefined,
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

const toUiLead = (lead) => ({
  id: lead.id,
  workspace_id: lead.workspace_id,
  name: lead.name,
  source: lead.source,
  campaign: lead.campaign,
  value: Number(lead.value || 0),
  status: lead.status,
  date: lead.lead_date,
  score: lead.lead_score,
  insight: lead.insight,
  recommendedAction: lead.recommended_action,
  notes: lead.notes || undefined,
  creative_name: lead.creative_name,
  creative_type: lead.creative_type,
  hook_tag: lead.hook_tag || undefined,
  adset_name: lead.adset_name || undefined,
  quality_score: lead.quality_score,
  ctr: Number(lead.ctr || 0),
  cpl: Number(lead.cpl || 0),
  conversionRate: Number(lead.conversion_rate || 0),
});

const pickFirstNonEmpty = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || null;

const buildMetaLeadName = (fields = {}) => {
  const fullName = pickFirstNonEmpty(
    fields.full_name,
    fields.fullname,
    [fields.first_name, fields.last_name].filter(Boolean).join(' ').trim()
  );

  if (fullName) {
    return fullName;
  }

  return pickFirstNonEmpty(fields.email, fields.phone_number, fields.phone, fields.whatsapp_number) || 'Meta Lead';
};

const buildMetaLeadNotes = (fields = {}, formName) => {
  const noteParts = [
    pickFirstNonEmpty(fields.email) ? `Email: ${pickFirstNonEmpty(fields.email)}` : null,
    pickFirstNonEmpty(fields.phone_number, fields.phone, fields.whatsapp_number)
      ? `Phone: ${pickFirstNonEmpty(fields.phone_number, fields.phone, fields.whatsapp_number)}`
      : null,
    formName ? `Form: ${formName}` : null,
  ].filter(Boolean);

  return noteParts.join(' | ') || null;
};

const deriveMetaLeadScore = (fields = {}) => {
  const hasPhone = Boolean(pickFirstNonEmpty(fields.phone_number, fields.phone, fields.whatsapp_number));
  const hasEmail = Boolean(pickFirstNonEmpty(fields.email));

  if (hasPhone && hasEmail) return 'high';
  if (hasPhone || hasEmail) return 'medium';
  return 'low';
};

const buildMessagingProxyLeadName = (campaignName, index) => `WhatsApp Prospect ${String(index).padStart(2, '0')}`;

const buildWorkspaceSummary = (workspaceId, snapshotDate, campaigns) => {
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + (campaign.spend * campaign.roas), 0);
  const totalConversions = campaigns.reduce((sum, campaign) => sum + campaign.conversions, 0);
  const averageCtr = campaigns.length > 0
    ? campaigns.reduce((sum, campaign) => sum + campaign.ctr, 0) / campaigns.length
    : 0;
  const averageCpm = campaigns.length > 0
    ? campaigns.reduce((sum, campaign) => sum + campaign.cpm, 0) / campaigns.length
    : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0;

  return {
    workspace_id: workspaceId,
    summary_date: snapshotDate,
    provider: 'meta',
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isSupabaseServerConfigured || !supabaseAdmin || !supabaseAuthClient) {
    return res.status(400).json({ error: 'Supabase server configuration is missing.' });
  }

  if (!isTokenEncryptionConfigured) {
    return res.status(400).json({ error: 'Meta token encryption is not configured yet.' });
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

  const { workspaceId, syncRange = 'today' } = req.body || {};
  if (!workspaceId) {
    return res.status(400).json({ error: 'workspaceId is required.' });
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authData.user.id)
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({ error: 'You do not have access to that workspace.' });
  }

  const { data: connection, error: connectionError } = await supabaseAdmin
    .from('meta_connections')
    .select('id, workspace_id, access_token_encrypted, access_token_iv, access_token_auth_tag, connected_account_id, connected_account_name')
    .eq('workspace_id', workspaceId)
    .single();

  if (connectionError || !connection) {
    return res.status(404).json({ error: 'No Meta connection was found for this workspace.' });
  }

  let resolvedConnectedAccountId = connection.connected_account_id || null;
  let resolvedConnectedAccountName = connection.connected_account_name || null;

  if (!resolvedConnectedAccountId) {
    const { data: fallbackAccounts, error: fallbackAccountsError } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('meta_ad_account_id, ad_account_name, is_primary, created_at')
      .eq('workspace_id', workspaceId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (fallbackAccountsError) {
      return res.status(500).json({ error: fallbackAccountsError.message });
    }

    const fallbackAccount = (fallbackAccounts || []).find((account) => account.is_primary)
      || ((fallbackAccounts || []).length === 1 ? fallbackAccounts[0] : null);

    if (!fallbackAccount) {
      return res.status(400).json({ error: 'Select a primary Meta ad account before syncing.' });
    }

    resolvedConnectedAccountId = fallbackAccount.meta_ad_account_id;
    resolvedConnectedAccountName = fallbackAccount.ad_account_name;

    await supabaseAdmin
      .from('meta_connections')
      .update({
        connected_account_id: resolvedConnectedAccountId,
        connected_account_name: resolvedConnectedAccountName,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId);
  }

  if (!connection.access_token_encrypted || !connection.access_token_iv || !connection.access_token_auth_tag) {
    return res.status(400).json({ error: 'The Meta access token is incomplete for this workspace.' });
  }

  const snapshotDate = resolveDailyPresetDate(syncRange);
  const { data: syncJob, error: syncJobError } = await supabaseAdmin
    .from('sync_jobs')
    .insert({
      workspace_id: workspaceId,
      provider: 'meta',
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (syncJobError || !syncJob) {
    return res.status(500).json({ error: syncJobError?.message || 'Failed to create sync job.' });
  }

  try {
    const accessToken = decryptAccessToken({
      cipherText: connection.access_token_encrypted,
      iv: connection.access_token_iv,
      authTag: connection.access_token_auth_tag,
    });

    let syncedAccountDetails = null;
    try {
      syncedAccountDetails = await fetchMetaAdAccountBilling(accessToken, resolvedConnectedAccountId);
    } catch {
      const metaAccounts = await fetchMetaAdAccounts(accessToken);
      const normalizedConnectedAccountId = resolvedConnectedAccountId.replace(/^act_/, '');
      syncedAccountDetails = metaAccounts.find((account) => {
        const accountId = String(account.id || '');
        const normalizedAccountId = accountId.replace(/^act_/, '');
        return accountId === resolvedConnectedAccountId || normalizedAccountId === normalizedConnectedAccountId;
      }) || null;
    }

    if (syncedAccountDetails) {
      await supabaseAdmin
        .from('meta_ad_accounts')
        .update({
          ad_account_name: syncedAccountDetails.name,
          account_status: syncedAccountDetails.status,
          account_currency: syncedAccountDetails.currency,
          available_funds: syncedAccountDetails.availableFunds,
          amount_spent: syncedAccountDetails.amountSpent,
          daily_spending_limit: syncedAccountDetails.dailySpendingLimit,
        })
        .eq('workspace_id', workspaceId)
        .eq('meta_ad_account_id', resolvedConnectedAccountId);
    }

    const campaigns = await fetchMetaCampaignInsights(accessToken, resolvedConnectedAccountId, syncRange);
    const adCreatives = await fetchMetaAdCreatives(accessToken, resolvedConnectedAccountId, syncRange);
    const insights = generateInsightsFromCampaigns(campaigns);
    const creativeRows = buildCreativeSnapshotsFromAds(workspaceId, adCreatives, 'meta', snapshotDate);
    let syncedLeadRows = [];
    let leadSync = {
      forms: 0,
      leadsDiscovered: 0,
      synced: 0,
      error: null,
    };

    await supabaseAdmin
      .from('campaign_snapshots')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('meta_ad_account_id', resolvedConnectedAccountId)
      .eq('snapshot_date', snapshotDate);

    if (campaigns.length > 0) {
      const snapshotRows = campaigns.map((campaign) => ({
        workspace_id: workspaceId,
        meta_ad_account_id: resolvedConnectedAccountId,
        campaign_external_id: campaign.campaignId,
        campaign_name: campaign.campaignName,
        delivery: campaign.delivery,
        results_label: campaign.resultsLabel,
        budget: campaign.budget,
        spend: campaign.spend,
        reach: campaign.reach,
        impressions: campaign.impressions,
        cost_per_result: campaign.costPerResult,
        ctr: campaign.ctr,
        link_ctr: campaign.linkCtr,
        link_clicks: campaign.linkClicks,
        cost_per_link_click: campaign.costPerLinkClick,
        video_views_3s: campaign.videoViews3s,
        hook_rate: campaign.hookRate,
        video_views_25: campaign.videoViews25,
        video_views_50: campaign.videoViews50,
        video_views_75: campaign.videoViews75,
        rate_75_vv: campaign.rate75VV,
        cpm: campaign.cpm,
        roas: campaign.roas,
        conversions: campaign.conversions,
        revenue: campaign.spend * campaign.roas,
        snapshot_date: snapshotDate,
      }));

      const { error: snapshotInsertError } = await supabaseAdmin
        .from('campaign_snapshots')
        .insert(snapshotRows);

      if (snapshotInsertError) {
        throw new Error(snapshotInsertError.message);
      }
    }

    await supabaseAdmin
      .from('insight_snapshots')
      .delete()
      .eq('workspace_id', workspaceId);

    await supabaseAdmin
      .from('creative_snapshots')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('source_platform', 'meta')
      .eq('origin', 'synced')
      .eq('snapshot_date', snapshotDate);

    if (insights.length > 0) {
      const insightRows = insights.map((insight) => ({
        workspace_id: workspaceId,
        type: insight.type,
        severity: insight.severity,
        message: insight.message,
        reasoning: insight.reasoning,
        priority: insight.priority,
        action: insight.action,
        action_label: insight.actionLabel,
        platform: insight.platform || null,
        campaign_external_id: insight.campaignExternalId || null,
        campaign_name: insight.campaignName || null,
      }));

      const { error: insightInsertError } = await supabaseAdmin
        .from('insight_snapshots')
        .insert(insightRows);

      if (insightInsertError) {
        throw new Error(insightInsertError.message);
      }
    }

    if (creativeRows.length > 0) {
      const { error: creativeInsertError } = await supabaseAdmin
        .from('creative_snapshots')
        .insert(creativeRows);

      if (creativeInsertError) {
        throw new Error(creativeInsertError.message);
      }
    }

    try {
      const leadForms = await fetchMetaLeadGenForms(accessToken, resolvedConnectedAccountId);
      leadSync.forms = leadForms.length;

      if (leadForms.length > 0) {
        const leadCollections = await Promise.all(
          leadForms.map(async (form) => ({
            form,
            leads: await fetchMetaLeadGenLeads(accessToken, form.id),
          }))
        );

        const normalizedLeadRows = leadCollections.flatMap(({ form, leads }) =>
          leads.map((lead) => {
            const leadScore = deriveMetaLeadScore(lead.fields);
            const campaignName = pickFirstNonEmpty(lead.campaignName, form.name, resolvedConnectedAccountName, 'Meta Lead Form');
            const creativeName = pickFirstNonEmpty(lead.adName, form.name, campaignName, 'Meta Lead Form');
            return {
              workspace_id: workspaceId,
              name: buildMetaLeadName(lead.fields),
              source: 'meta',
              campaign: campaignName,
              value: 0,
              status: 'new',
              lead_score: leadScore,
              insight: 'Imported from Meta Lead Ads form submission.',
              recommended_action: 'Contact this lead while intent is still fresh.',
              notes: buildMetaLeadNotes(lead.fields, form.name),
              creative_name: creativeName,
              creative_type: 'image',
              hook_tag: 'meta_lead_form',
              adset_name: lead.adsetName || null,
              quality_score: leadScore,
              ctr: 0,
              cpl: 0,
              conversion_rate: 0,
              lead_date: (lead.createdTime || new Date().toISOString()).slice(0, 10),
              external_source: 'meta_leadgen',
              external_id: lead.id,
              external_form_id: form.id,
              external_created_at: lead.createdTime || null,
            };
          })
        );

        leadSync.leadsDiscovered = normalizedLeadRows.length;

        if (normalizedLeadRows.length > 0) {
          const { data: persistedLeads, error: leadUpsertError } = await supabaseAdmin
            .from('leads')
            .upsert(normalizedLeadRows, {
              onConflict: 'workspace_id,external_source,external_id',
            })
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
            `);

          if (leadUpsertError) {
            throw new Error(leadUpsertError.message);
          }

          syncedLeadRows = persistedLeads || [];
          leadSync.synced = syncedLeadRows.length;
        }
      }
    } catch (leadSyncError) {
      console.error('Meta lead sync warning:', leadSyncError);
      leadSync = {
        ...leadSync,
        error: leadSyncError instanceof Error ? leadSyncError.message : 'Failed to sync Meta lead forms.',
      };
    }

    try {
      const metaCampaignIds = campaigns.map((campaign) => campaign.campaignId).filter(Boolean);

      if (metaCampaignIds.length > 0) {
        const { data: existingProxyLeads, error: existingProxyLeadsError } = await supabaseAdmin
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
            lead_date,
            external_source,
            external_id
          `)
          .eq('workspace_id', workspaceId)
          .eq('external_source', 'meta_messaging_result');

        if (existingProxyLeadsError) {
          throw new Error(existingProxyLeadsError.message);
        }

        const proxyCountByCampaignId = new Map();
        (existingProxyLeads || []).forEach((lead) => {
          const campaignExternalId = typeof lead.external_id === 'string' ? lead.external_id.split(':')[0] : '';
          if (!campaignExternalId) {
            return;
          }
          proxyCountByCampaignId.set(campaignExternalId, (proxyCountByCampaignId.get(campaignExternalId) || 0) + 1);
        });

        const missingProxyLeadRows = campaigns.flatMap((campaign) => {
          const desiredLeadCount = Math.max(0, Number(campaign.conversions || 0));
          const existingLeadCount = proxyCountByCampaignId.get(campaign.campaignId) || 0;
          const additionalLeadCount = Math.max(0, desiredLeadCount - existingLeadCount);

          if (additionalLeadCount === 0) {
            return [];
          }

          return Array.from({ length: additionalLeadCount }, (_, offset) => {
            const sequence = existingLeadCount + offset + 1;
            return {
              workspace_id: workspaceId,
              name: buildMessagingProxyLeadName(campaign.campaignName, sequence),
              source: 'meta',
              campaign: campaign.campaignName,
              value: 0,
              status: 'new',
              lead_score: 'medium',
              insight: 'Auto-created from Meta messaging conversation started results.',
              recommended_action: 'Open WhatsApp and identify the matching conversation for follow-up.',
              notes: 'This lead was created from campaign messaging results because direct WhatsApp contact data is not connected yet.',
              creative_name: `${campaign.campaignName}_WhatsApp`,
              creative_type: 'image',
              hook_tag: 'meta_messaging_conversation_started',
              adset_name: null,
              quality_score: 'medium',
              ctr: Number(campaign.ctr || 0),
              cpl: Number(campaign.costPerResult || 0),
              conversion_rate: 0,
              lead_date: snapshotDate,
              external_source: 'meta_messaging_result',
              external_id: `${campaign.campaignId}:${sequence}`,
              external_form_id: null,
              external_created_at: new Date().toISOString(),
            };
          });
        });

        if (missingProxyLeadRows.length > 0) {
          const { data: insertedProxyLeads, error: insertedProxyLeadsError } = await supabaseAdmin
            .from('leads')
            .insert(missingProxyLeadRows)
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
            `);

          if (insertedProxyLeadsError) {
            throw new Error(insertedProxyLeadsError.message);
          }

          syncedLeadRows = syncedLeadRows.concat(insertedProxyLeads || []);
        }
      }
    } catch (proxyLeadError) {
      console.error('Meta messaging proxy lead warning:', proxyLeadError);
    }

    const shouldPersistDailySummary = syncRange === 'today' || syncRange === 'yesterday';
    const summaryRow = shouldPersistDailySummary ? buildWorkspaceSummary(workspaceId, snapshotDate, campaigns) : null;

    if (summaryRow) {
      const { error: summaryError } = await supabaseAdmin
        .from('workspace_daily_summaries')
        .upsert(summaryRow, {
          onConflict: 'workspace_id,summary_date,provider',
        });

      if (summaryError) {
        throw new Error(summaryError.message);
      }
    }

    const finishedAt = new Date().toISOString();

    await Promise.all([
      supabaseAdmin
        .from('meta_connections')
        .update({
          last_synced_at: finishedAt,
          updated_at: finishedAt,
        })
        .eq('workspace_id', workspaceId),
      supabaseAdmin
        .from('sync_jobs')
        .update({
          status: 'success',
          finished_at: finishedAt,
        })
        .eq('id', syncJob.id),
    ]);

    return res.status(200).json({
      success: true,
      syncedAt: finishedAt,
      connectedAccount: {
        id: resolvedConnectedAccountId,
        name: resolvedConnectedAccountName,
      },
      summary: summaryRow,
      campaigns: campaigns.map((campaign) => toUiCampaign(campaign, snapshotDate)),
      creatives: creativeRows.map((creative) => toUiCreative(creative)),
      insights: insights.map((insight, index) => toUiInsight(insight, index)),
      leads: syncedLeadRows.map((lead) => toUiLead(lead)),
      leadSync,
    });
  } catch (syncError) {
    console.error('Meta sync error:', syncError);

    await supabaseAdmin
      .from('sync_jobs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: syncError instanceof Error ? syncError.message : 'Unknown sync failure',
      })
      .eq('id', syncJob.id);

    return res.status(500).json({
      error: syncError instanceof Error ? syncError.message : 'Failed to sync Meta campaigns.',
    });
  }
}
