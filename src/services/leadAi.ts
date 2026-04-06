import type { LeadData } from '../types';
import { readJsonResponse } from './apiResponse';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api');

export type LeadSuggestionResult =
  | {
      ok: true;
      provider: 'openai' | 'google' | 'rules';
      summary: string;
      recommendation: string;
    }
  | {
      ok: false;
      error: string;
    };

export const requestLeadRecommendation = async (payload: {
  lead: LeadData;
  openAiKey?: string;
  googleAiKey?: string;
}): Promise<LeadSuggestionResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/lead-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const parsed = await readJsonResponse(response, 'Lead suggestions API');

    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    const data = parsed.data;

    if (!response.ok) {
      return { ok: false, error: data.error || 'Failed to generate lead recommendation.' };
    }

    return {
      ok: true,
      provider: data.provider as 'openai' | 'google' | 'rules',
      summary: data.summary as string,
      recommendation: data.recommendation as string,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to generate lead recommendation.',
    };
  }
};
