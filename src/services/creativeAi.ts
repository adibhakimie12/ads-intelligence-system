import type { CreativeData } from '../types';
import { readJsonResponse } from './apiResponse';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api');

export type CreativeSuggestionResult =
  | {
      ok: true;
      provider: 'openai' | 'google' | 'rules';
      summary: string;
      suggestions: string[];
    }
  | {
      ok: false;
      error: string;
    };

export const requestCreativeSuggestions = async (payload: {
  creative: CreativeData;
  openAiKey?: string;
  googleAiKey?: string;
}): Promise<CreativeSuggestionResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/creative-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const parsed = await readJsonResponse(response, 'Creative suggestions API');

    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error,
      };
    }

    const data = parsed.data;

    if (!response.ok) {
      return {
        ok: false,
        error: data.error || 'Failed to generate creative suggestions.',
      };
    }

    return {
      ok: true,
      provider: data.provider as 'openai' | 'google' | 'rules',
      summary: data.summary as string,
      suggestions: Array.isArray(data.suggestions) ? data.suggestions as string[] : [],
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to generate creative suggestions.',
    };
  }
};
