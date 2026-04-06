import { readJsonResponse } from './apiResponse';

type ValidateGoogleAiKeyResult =
  | {
      ok: true;
      message: string;
      model: string;
      responsePreview: string;
    }
  | {
      ok: false;
      error: string;
    };

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api');

export const validateGoogleAiKey = async (apiKey: string): Promise<ValidateGoogleAiKeyResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/google-ai-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    });

    const parsed = await readJsonResponse(response, 'Google AI validation API');

    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error,
      };
    }

    const payload = parsed.data;

    if (!response.ok) {
      return {
        ok: false,
        error: payload.error || 'Google AI key validation failed.',
      };
    }

    return {
      ok: true,
      message: payload.message as string,
      model: payload.model as string,
      responsePreview: payload.responsePreview as string,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Google AI key validation failed.',
    };
  }
};
