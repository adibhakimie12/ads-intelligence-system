import { isSupabaseServerConfigured, supabaseAdmin } from './_lib/supabase-admin.js';

const pickTrimmed = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || '';

const resolveLeadName = ({ contactName, contactPhone, contactEmail, campaign }) => {
  if (contactName) return contactName;
  if (contactPhone) return `WhatsApp Lead ${contactPhone.replace(/\D/g, '').slice(-4) || 'New'}`;
  if (contactEmail) return contactEmail;
  return `Lead ${campaign.slice(0, 24) || 'New'}`;
};

const resolveScore = ({ contactPhone, contactEmail }) => {
  if (contactPhone && contactEmail) return 'high';
  if (contactPhone || contactEmail) return 'medium';
  return 'low';
};

const parsePayload = (body = {}) => {
  const workspaceId = pickTrimmed(body.workspaceId, body.workspace_id);
  const campaign = pickTrimmed(body.campaign, body.campaign_name);
  const contactName = pickTrimmed(body.contactName, body.full_name, body.name);
  const contactPhone = pickTrimmed(body.contactPhone, body.phone_number, body.phone);
  const contactEmail = pickTrimmed(body.contactEmail, body.email);
  const creativeName = pickTrimmed(body.creativeName, body.ad_name, body.form_name);
  const adsetName = pickTrimmed(body.adsetName, body.adset_name);
  const externalLeadId = pickTrimmed(body.externalLeadId, body.lead_id, body.id);
  const externalFormId = pickTrimmed(body.externalFormId, body.form_id);
  const sourceEvent = pickTrimmed(body.sourceEvent, body.trigger) || (externalFormId ? 'meta_lead_form' : 'whatsapp_click');
  const platform = body.platform === 'google' ? 'google' : 'meta';
  const score = ['high', 'medium', 'low'].includes(body.score) ? body.score : resolveScore({ contactPhone, contactEmail });
  const qualityScore = ['high', 'medium', 'low'].includes(body.qualityScore) ? body.qualityScore : score;

  return {
    workspaceId,
    platform,
    campaign,
    contactName,
    contactPhone,
    contactEmail,
    creativeName,
    creativeType: body.creativeType === 'video' ? 'video' : 'image',
    adsetName,
    externalLeadId,
    externalFormId,
    value: Number(body.value || 0),
    ctr: Number(body.ctr || 0),
    cpl: Number(body.cpl || 0),
    conversionRate: Number(body.conversionRate || 0),
    score,
    qualityScore,
    insight: pickTrimmed(body.insight) || 'Inbound lead captured automatically from paid traffic.',
    recommendedAction: pickTrimmed(body.recommendedAction) || 'Contact this lead while intent is still fresh.',
    sourceEvent,
  };
};

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

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      events: [],
      mode: 'direct_to_leads',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isSupabaseServerConfigured || !supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase server configuration is missing.' });
  }

  const payload = parsePayload(req.body || {});

  if (!payload.workspaceId || !payload.campaign) {
    return res.status(400).json({ error: 'workspaceId and campaign are required.' });
  }

  try {
    const leadName = resolveLeadName(payload);
    const notes = [payload.contactPhone ? `Phone: ${payload.contactPhone}` : null, payload.contactEmail ? `Email: ${payload.contactEmail}` : null]
      .filter(Boolean)
      .join(' | ');

    if (payload.externalLeadId) {
      const { data: existingLead, error: existingLeadError } = await supabaseAdmin
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
          lead_date
        `)
        .eq('workspace_id', payload.workspaceId)
        .eq('external_source', 'meta_leadgen_push')
        .eq('external_id', payload.externalLeadId)
        .maybeSingle();

      if (existingLeadError) {
        throw new Error(existingLeadError.message);
      }

      if (existingLead) {
        return res.status(200).json({
          ok: true,
          duplicate: true,
          lead: toUiLead(existingLead),
        });
      }
    }

    const insertPayload = {
      workspace_id: payload.workspaceId,
      name: leadName,
      source: payload.platform,
      campaign: payload.campaign,
      value: payload.value,
      status: 'new',
      lead_score: payload.score,
      insight: payload.insight,
      recommended_action: payload.recommendedAction,
      notes: notes || null,
      creative_name: payload.creativeName || `${payload.campaign}_Lead`,
      creative_type: payload.creativeType,
      hook_tag: payload.sourceEvent,
      adset_name: payload.adsetName || null,
      quality_score: payload.qualityScore,
      ctr: payload.ctr,
      cpl: payload.cpl,
      conversion_rate: payload.conversionRate,
      lead_date: new Date().toISOString().slice(0, 10),
      external_source: payload.externalLeadId ? 'meta_leadgen_push' : null,
      external_id: payload.externalLeadId || null,
      external_form_id: payload.externalFormId || null,
      external_created_at: new Date().toISOString(),
    };

    const { data: createdLead, error: createdLeadError } = await supabaseAdmin
      .from('leads')
      .insert(insertPayload)
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
      `)
      .single();

    if (createdLeadError) {
      throw new Error(createdLeadError.message);
    }

    return res.status(200).json({
      ok: true,
      mode: 'direct_to_leads',
      lead: toUiLead(createdLead),
    });
  } catch (error) {
    console.error('Error in serverless /api/lead-capture:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to capture lead.',
    });
  }
}
