import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import metaConnectHandler from './api/meta-connect.js';
import metaCallbackHandler from './api/meta-callback.js';
import metaSelectAccountHandler from './api/meta-select-account.js';
import metaSetupCheckHandler from './api/meta-setup-check.js';
import metaSyncHandler from './api/meta-sync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const LEAD_CAPTURE_STORE = path.join(DATA_DIR, 'lead-capture-events.json');

app.use(cors());
app.use(express.json());

const ensureLeadCaptureStore = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(LEAD_CAPTURE_STORE);
  } catch {
    await fs.writeFile(LEAD_CAPTURE_STORE, '[]', 'utf8');
  }
};

const readLeadCaptureEvents = async () => {
  await ensureLeadCaptureStore();

  try {
    const raw = await fs.readFile(LEAD_CAPTURE_STORE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLeadCaptureEvents = async (events) => {
  await ensureLeadCaptureStore();
  await fs.writeFile(LEAD_CAPTURE_STORE, JSON.stringify(events, null, 2), 'utf8');
};

const invokeHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('API handler error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Unexpected server error.',
      });
    }
  }
};

// Normalize response interface matching the frontend AdsData structure
const normalizeAdData = (campaign_name, spend, CTR, CPM, ROAS, conversions) => {
  return {
    id: `campaign_${Math.random().toString(36).substr(2, 9)}`,
    campaign_name,
    spend,
    CTR,
    CPM,
    ROAS,
    conversions,
    revenue: spend > 0 ? spend * ROAS : 0,
    date: new Date().toISOString()
  };
};

const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';
const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_TEST_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const GEMINI_SUGGESTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const readOpenAiErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === 'string') {
      return payload.error.message;
    }

    if (typeof payload?.message === 'string') {
      return payload.message;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to a generic message.
  }

  return `OpenAI request failed with status ${response.status}.`;
};

const readGoogleAiErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === 'string') {
      return payload.error.message;
    }

    if (typeof payload?.message === 'string') {
      return payload.message;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to a generic message.
  }

  return `Google AI request failed with status ${response.status}.`;
};

const extractGoogleAiText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .join(' ')
    .trim();
};

const extractOpenAiText = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => typeof part?.text === 'string' ? part.text : '')
      .join(' ')
      .trim();
  }

  return '';
};

const parseJsonFromText = (text) => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      try {
        return JSON.parse(fencedMatch[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const normalizeSuggestionPayload = (parsed, fallbackSuggestions, fallbackSummary, provider) => {
  const suggestions = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions.filter((item) => typeof item === 'string').slice(0, 4)
    : fallbackSuggestions.slice(0, 4);

  return {
    provider,
    summary: typeof parsed?.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : fallbackSummary,
    suggestions: suggestions.length > 0 ? suggestions : fallbackSuggestions.slice(0, 4),
  };
};

/**
 * META ADS API INTEGRATION
 * Target Endpoint: https://graph.facebook.com/{version}/act_{ad_account_id}/insights
 */
app.get('/api/meta-ads', async (req, res) => {
  const { META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_API_VERSION } = process.env;

  try {
    // Check if tokens exist to trigger REAL vs MOCK
    if (META_ACCESS_TOKEN && META_AD_ACCOUNT_ID) {
      console.log('Fetching live data from Meta Ads Graph API...');

      const endpoint = `https://graph.facebook.com/${META_API_VERSION || 'v19.0'}/act_${META_AD_ACCOUNT_ID}/insights`;
      const url = new URL(endpoint);
      url.searchParams.append('access_token', META_ACCESS_TOKEN);
      url.searchParams.append('fields', 'campaign_name,spend,ctr,cpm,purchase_roas,actions');
      url.searchParams.append('level', 'campaign');
      url.searchParams.append('date_preset', 'last_7d');

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Meta API connection failed');

      const data = await response.json();

      // Strict Mapping
      const mappedData = data.data.map(item => {
        // Find purchases from Facebook 'actions' object
        const purchases = item.actions ? item.actions.find(a => a.action_type === 'purchase')?.value : 0;
        const roas = item.purchase_roas ? item.purchase_roas[0]?.value : 0;

        return normalizeAdData(
          item.campaign_name,
          parseFloat(item.spend || '0'),
          parseFloat(item.ctr || '0'),
          parseFloat(item.cpm || '0'),
          parseFloat(roas || '0'),
          parseInt(purchases || '0', 10)
        );
      });

      return res.json(mappedData);

    } else {
      console.log('Meta credentials missing. Serving Mock Data.');
      // Empty Token Fallback Path
      return res.json([
        normalizeAdData('Meta_Scale_Broad_Q1', 450.50, 2.1, 15.20, 3.8, 12),
        normalizeAdData('Meta_Retargeting_Hot', 120.00, 0.8, 22.50, 1.2, 1),
        normalizeAdData('Meta_Lookalike_Conversion', 550.00, 3.4, 18.00, 4.5, 25)
      ]);
    }
  } catch (error) {
    console.error('Error in /api/meta-ads:', error);
    res.status(500).json({ error: 'Failed to sync Meta Ads Data' });
  }
});

/**
 * GOOGLE ADS API INTEGRATION
 * Target Endpoint: Google Ads REST API
 */
app.get('/api/google-ads', async (req, res) => {
  const { GOOGLE_DEVELOPER_TOKEN, GOOGLE_CUSTOMER_ID, GOOGLE_REFRESH_TOKEN } = process.env;

  try {
    if (GOOGLE_DEVELOPER_TOKEN && GOOGLE_CUSTOMER_ID && GOOGLE_REFRESH_TOKEN) {
      console.log('Fetching live data from Google Ads API...');

      // Setup actual fetch logic when deploying real tokens
      // For now, if tokens are present it would run the REST call:
      const endpoint = `https://googleads.googleapis.com/v16/customers/${GOOGLE_CUSTOMER_ID}/googleAds:search`;
      const query = `
        SELECT campaign.name, metrics.cost_micros, metrics.ctr, metrics.average_cpm, metrics.conversions, metrics.conversions_value
        FROM campaign
        WHERE segments.date DURING LAST_7_DAYS
      `;

      /* Example REST call:
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
           Authorization: `Bearer YOUR_GENERATED_OAUTH_TOKEN`,
           developer-token: GOOGLE_DEVELOPER_TOKEN
        },
        body: JSON.stringify({ query })
      });
      */

      // For safety, returning mock data since complex OAuth2 logic is required to swap the refresh token here
      const mappedData = [
        normalizeAdData('Google_Live_Campaign_1', 300, 4.0, 10.0, 2.0, 5)
      ];

      return res.json(mappedData);

    } else {
      console.log('Google Ads credentials missing. Serving Mock Data.');
      // Empty Token Fallback Path
      return res.json([
        normalizeAdData('Google_Search_Branded', 120.00, 12.5, 8.50, 5.2, 35),
        normalizeAdData('Google_PMax_Broad', 800.00, 1.2, 35.00, 2.1, 8),
        normalizeAdData('Google_Display_Cold', 250.00, 0.4, 5.20, 0.8, 0)
      ]);
    }
  } catch (error) {
    console.error('Error in /api/google-ads:', error);
    res.status(500).json({ error: 'Failed to sync Google Ads Data' });
  }
});

app.post('/api/openai-test', async (req, res) => {
  const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';

  if (!apiKey) {
    return res.status(400).json({ error: 'OpenAI API key is required.' });
  }

  try {
    const response = await fetch(OPENAI_MODELS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const message = await readOpenAiErrorMessage(response);
      return res.status(response.status).json({ error: message });
    }

    const payload = await response.json();
    const sampleModels = Array.isArray(payload?.data)
      ? payload.data
          .map((model) => model?.id)
          .filter((modelId) => typeof modelId === 'string')
          .slice(0, 5)
      : [];

    return res.json({
      ok: true,
      message: 'OpenAI API key is valid.',
      availableModelCount: Array.isArray(payload?.data) ? payload.data.length : 0,
      sampleModels,
    });
  } catch (error) {
    console.error('Error in /api/openai-test:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to reach OpenAI right now.',
    });
  }
});

app.post('/api/meta-connect', invokeHandler(metaConnectHandler));
app.get('/api/meta-setup-check', invokeHandler(metaSetupCheckHandler));
app.get('/api/meta-callback', invokeHandler(metaCallbackHandler));
app.post('/api/meta-select-account', invokeHandler(metaSelectAccountHandler));
app.post('/api/meta-sync', invokeHandler(metaSyncHandler));

app.post('/api/google-ai-test', async (req, res) => {
  const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';

  if (!apiKey) {
    return res.status(400).json({ error: 'Google AI API key is required.' });
  }

  try {
    const response = await fetch(GEMINI_TEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Reply with exactly: connected',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const message = await readGoogleAiErrorMessage(response);
      return res.status(response.status).json({ error: message });
    }

    const payload = await response.json();
    const responsePreview = extractGoogleAiText(payload);

    return res.json({
      ok: true,
      message: 'Google AI API key is valid.',
      model: 'gemini-3-flash-preview',
      responsePreview,
    });
  } catch (error) {
    console.error('Error in /api/google-ai-test:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to reach Google AI right now.',
    });
  }
});

app.post('/api/meta-capi-test', async (req, res) => {
  const pixelId = typeof req.body?.pixelId === 'string' ? req.body.pixelId.trim() : '';
  const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : '';
  const testEventCode = typeof req.body?.testEventCode === 'string' ? req.body.testEventCode.trim() : '';
  const landingPageUrl = typeof req.body?.landingPageUrl === 'string' ? req.body.landingPageUrl.trim() : '';

  if (!pixelId || !accessToken) {
    return res.status(400).json({ error: 'Pixel ID and Conversions API access token are required.' });
  }

  try {
    const endpoint = `https://graph.facebook.com/v22.0/${pixelId}/events`;
    const payload = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: landingPageUrl || 'https://example.com',
        },
      ],
      access_token: accessToken,
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `Meta CAPI request failed with status ${response.status}.`;
      return res.status(response.status).json({ error: message });
    }

    return res.json({
      ok: true,
      message: testEventCode
        ? `Meta test event sent. Check Events Manager -> Test Events using code ${testEventCode}.`
        : 'Meta CAPI event sent successfully.',
      response: data,
    });
  } catch (error) {
    console.error('Error in /api/meta-capi-test:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to send Meta CAPI test event.',
    });
  }
});

app.get('/api/lead-capture', async (req, res) => {
  const workspaceId = typeof req.query?.workspaceId === 'string' ? req.query.workspaceId.trim() : '';

  if (!workspaceId) {
    return res.status(400).json({ error: 'workspaceId is required.' });
  }

  try {
    const events = await readLeadCaptureEvents();
    const pendingEvents = events
      .filter((event) => event.workspaceId === workspaceId && !event.consumedAt)
      .sort((left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime());

    return res.json({
      ok: true,
      events: pendingEvents,
    });
  } catch (error) {
    console.error('Error in /api/lead-capture GET:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load lead capture events.',
    });
  }
});

app.post('/api/lead-capture', async (req, res) => {
  const workspaceId = typeof req.body?.workspaceId === 'string'
    ? req.body.workspaceId.trim()
    : typeof req.body?.workspace_id === 'string'
    ? req.body.workspace_id.trim()
    : '';
  const platform = req.body?.platform === 'google' ? 'google' : 'meta';
  const campaign = typeof req.body?.campaign === 'string'
    ? req.body.campaign.trim()
    : typeof req.body?.campaign_name === 'string'
    ? req.body.campaign_name.trim()
    : '';
  const contactName = typeof req.body?.contactName === 'string'
    ? req.body.contactName.trim()
    : typeof req.body?.full_name === 'string'
    ? req.body.full_name.trim()
    : typeof req.body?.name === 'string'
    ? req.body.name.trim()
    : '';
  const contactPhone = typeof req.body?.contactPhone === 'string'
    ? req.body.contactPhone.trim()
    : typeof req.body?.phone_number === 'string'
    ? req.body.phone_number.trim()
    : typeof req.body?.phone === 'string'
    ? req.body.phone.trim()
    : '';
  const contactEmail = typeof req.body?.contactEmail === 'string'
    ? req.body.contactEmail.trim()
    : typeof req.body?.email === 'string'
    ? req.body.email.trim()
    : '';
  const creativeName = typeof req.body?.creativeName === 'string'
    ? req.body.creativeName.trim()
    : typeof req.body?.ad_name === 'string'
    ? req.body.ad_name.trim()
    : typeof req.body?.form_name === 'string'
    ? req.body.form_name.trim()
    : '';
  const adsetName = typeof req.body?.adsetName === 'string'
    ? req.body.adsetName.trim()
    : typeof req.body?.adset_name === 'string'
    ? req.body.adset_name.trim()
    : '';
  const sourceEvent = typeof req.body?.sourceEvent === 'string' && req.body.sourceEvent.trim()
    ? req.body.sourceEvent.trim()
    : typeof req.body?.trigger === 'string' && req.body.trigger.trim()
    ? req.body.trigger.trim()
    : typeof req.body?.form_id === 'string' && req.body.form_id.trim()
    ? 'meta_lead_form'
    : 'whatsapp_click';
  const externalLeadId = typeof req.body?.externalLeadId === 'string'
    ? req.body.externalLeadId.trim()
    : typeof req.body?.lead_id === 'string'
    ? req.body.lead_id.trim()
    : typeof req.body?.id === 'string'
    ? req.body.id.trim()
    : '';

  if (!workspaceId || !campaign) {
    return res.status(400).json({ error: 'workspaceId and campaign are required.' });
  }

  try {
    const events = await readLeadCaptureEvents();
    const duplicateEvent = externalLeadId
      ? events.find((event) => event.workspaceId === workspaceId && event.externalLeadId === externalLeadId)
      : null;

    if (duplicateEvent) {
      return res.json({
        ok: true,
        duplicate: true,
        event: duplicateEvent,
      });
    }

    const event = {
      id: `capture_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      platform,
      campaign,
      externalLeadId: externalLeadId || '',
      externalFormId: typeof req.body?.form_id === 'string' ? req.body.form_id.trim() : '',
      contactName,
      contactPhone,
      contactEmail,
      creativeName,
      creativeType: req.body?.creativeType === 'video' ? 'video' : 'image',
      adsetName,
      value: Number(req.body?.value || 0),
      ctr: Number(req.body?.ctr || 0),
      cpl: Number(req.body?.cpl || 0),
      conversionRate: Number(req.body?.conversionRate || 0),
      score: ['high', 'medium', 'low'].includes(req.body?.score) ? req.body.score : 'medium',
      qualityScore: ['high', 'medium', 'low'].includes(req.body?.qualityScore) ? req.body.qualityScore : 'medium',
      insight: typeof req.body?.insight === 'string' && req.body.insight.trim()
        ? req.body.insight.trim()
        : 'Inbound WhatsApp interest captured from paid traffic.',
      recommendedAction: typeof req.body?.recommendedAction === 'string' && req.body.recommendedAction.trim()
        ? req.body.recommendedAction.trim()
        : 'Open WhatsApp and reply while intent is fresh.',
      sourceEvent,
      capturedAt: new Date().toISOString(),
      consumedAt: null,
    };

    events.push(event);
    await writeLeadCaptureEvents(events);

    return res.json({
      ok: true,
      event,
    });
  } catch (error) {
    console.error('Error in /api/lead-capture POST:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create lead capture event.',
    });
  }
});

app.post('/api/lead-capture/:eventId/consume', async (req, res) => {
  const eventId = typeof req.params?.eventId === 'string' ? req.params.eventId.trim() : '';

  if (!eventId) {
    return res.status(400).json({ error: 'eventId is required.' });
  }

  try {
    const events = await readLeadCaptureEvents();
    const targetIndex = events.findIndex((event) => event.id === eventId);

    if (targetIndex === -1) {
      return res.status(404).json({ error: 'Lead capture event not found.' });
    }

    events[targetIndex] = {
      ...events[targetIndex],
      consumedAt: new Date().toISOString(),
    };

    await writeLeadCaptureEvents(events);

    return res.json({
      ok: true,
      event: events[targetIndex],
    });
  } catch (error) {
    console.error('Error in /api/lead-capture consume:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to mark lead capture as consumed.',
    });
  }
});

app.post('/api/creative-suggestions', async (req, res) => {
  const creative = req.body?.creative;
  const openAiKey = typeof req.body?.openAiKey === 'string' ? req.body.openAiKey.trim() : '';
  const googleAiKey = typeof req.body?.googleAiKey === 'string' ? req.body.googleAiKey.trim() : '';

  if (!creative || typeof creative.creative_name !== 'string') {
    return res.status(400).json({ error: 'Creative payload is required.' });
  }

  const fallbackSuggestions = Array.isArray(creative.suggestions)
    ? creative.suggestions.filter((item) => typeof item === 'string')
    : [];
  const fallbackSummary = typeof creative.analysis_summary === 'string' && creative.analysis_summary.trim()
    ? creative.analysis_summary.trim()
    : 'Use the current performance signals to refine the hook, sharpen the message, and make the CTA more explicit.';

  const prompt = `
You are an expert direct-response creative strategist.
Analyze this ad creative and return strict JSON only.

Creative:
- Name: ${creative.creative_name}
- Platform: ${creative.platform || 'meta'}
- Media type: ${creative.media_type || 'image'}
- Status: ${creative.status}
- CTR: ${creative.CTR || 0}
- ROAS: ${creative.ROAS || 0}
- Spend: ${creative.spend || 0}
- Hook strength: ${creative.hook_strength}
- Message clarity: ${creative.message_clarity}
- CTA presence: ${creative.cta_presence}
- Fatigue: ${creative.fatigue}
- Existing summary: ${creative.analysis_summary || ''}
- Existing suggestions: ${(fallbackSuggestions || []).join(' | ')}

Return JSON with this shape:
{
  "summary": "1-2 sentence explanation of what is holding this ad back or why it is winning",
  "suggestions": [
    "specific improvement 1",
    "specific improvement 2",
    "specific improvement 3",
    "specific improvement 4"
  ]
}

Rules:
- Make suggestions concrete and ad-creative specific.
- Focus on hook, message, CTA, visual framing, and fatigue.
- If the ad is already strong, suggest scale-safe refinements instead of rewriting everything.
- No markdown.
`.trim();

  try {
    if (openAiKey) {
      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          temperature: 0.5,
          messages: [
            {
              role: 'system',
              content: 'You are a concise, practical ad creative strategist. Return valid JSON only.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const parsed = parseJsonFromText(extractOpenAiText(payload));
        return res.json(normalizeSuggestionPayload(parsed, fallbackSuggestions, fallbackSummary, 'openai'));
      }
    }

    if (googleAiKey) {
      const response = await fetch(GEMINI_SUGGESTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': googleAiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const parsed = parseJsonFromText(extractGoogleAiText(payload));
        return res.json(normalizeSuggestionPayload(parsed, fallbackSuggestions, fallbackSummary, 'google'));
      }
    }

    return res.json({
      provider: 'rules',
      summary: fallbackSummary,
      suggestions: fallbackSuggestions.slice(0, 4),
    });
  } catch (error) {
    console.error('Error in /api/creative-suggestions:', error);
    return res.json({
      provider: 'rules',
      summary: fallbackSummary,
      suggestions: fallbackSuggestions.slice(0, 4),
    });
  }
});

app.post('/api/lead-suggestions', async (req, res) => {
  const lead = req.body?.lead;
  const openAiKey = typeof req.body?.openAiKey === 'string' ? req.body.openAiKey.trim() : '';
  const googleAiKey = typeof req.body?.googleAiKey === 'string' ? req.body.googleAiKey.trim() : '';

  if (!lead || typeof lead.name !== 'string') {
    return res.status(400).json({ error: 'Lead payload is required.' });
  }

  const fallbackRecommendation = lead.recommendedAction || 'Standard Follow-up: WhatsApp';
  const fallbackSummary = lead.insight || 'Use lead value, quality, and conversion signals to decide the next sales action.';

  const prompt = `
You are an expert sales operations assistant for paid ads leads.
Analyze this lead and return strict JSON only.

Lead:
- Name: ${lead.name}
- Source: ${lead.source}
- Campaign: ${lead.campaign}
- Creative: ${lead.creative_name} (${lead.creative_type})
- Status: ${lead.status}
- Value: ${lead.value}
- Lead score: ${lead.score}
- Quality score: ${lead.quality_score}
- CTR: ${lead.ctr}
- CPL: ${lead.cpl}
- Conversion rate: ${lead.conversionRate}
- Existing insight: ${lead.insight || ''}
- Existing recommended action: ${lead.recommendedAction || ''}

Return JSON with this shape:
{
  "summary": "1-2 sentence summary of lead quality and urgency",
  "recommendation": "single best next action in one sentence"
}

Rules:
- Keep it practical and short.
- Weight urgency by lead value, conversion rate, and quality.
- Recommendation should be immediately executable by the sales team.
- No markdown.
`.trim();

  try {
    if (openAiKey) {
      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          temperature: 0.4,
          messages: [
            { role: 'system', content: 'You are a concise sales assistant. Return valid JSON only.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const parsed = parseJsonFromText(extractOpenAiText(payload));
        return res.json({
          provider: 'openai',
          summary: typeof parsed?.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : fallbackSummary,
          recommendation: typeof parsed?.recommendation === 'string' && parsed.recommendation.trim() ? parsed.recommendation.trim() : fallbackRecommendation,
        });
      }
    }

    if (googleAiKey) {
      const response = await fetch(GEMINI_SUGGESTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': googleAiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const parsed = parseJsonFromText(extractGoogleAiText(payload));
        return res.json({
          provider: 'google',
          summary: typeof parsed?.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : fallbackSummary,
          recommendation: typeof parsed?.recommendation === 'string' && parsed.recommendation.trim() ? parsed.recommendation.trim() : fallbackRecommendation,
        });
      }
    }

    return res.json({
      provider: 'rules',
      summary: fallbackSummary,
      recommendation: fallbackRecommendation,
    });
  } catch (error) {
    console.error('Error in /api/lead-suggestions:', error);
    return res.json({
      provider: 'rules',
      summary: fallbackSummary,
      recommendation: fallbackRecommendation,
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Ads Intelligence API Server running on port ${PORT}...`);
});
