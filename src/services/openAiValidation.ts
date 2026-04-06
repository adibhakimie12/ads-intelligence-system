import { readJsonResponse } from './apiResponse';

type ValidateOpenAiKeyResult =
  | {
      ok: true;
      message: string;
      availableModelCount: number;
      sampleModels: string[];
    }
  | {
      ok: false;
      error: string;
    };

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api');

export const validateOpenAiKey = async (apiKey: string): Promise<ValidateOpenAiKeyResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/openai-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    });

    const parsed = await readJsonResponse(response, 'OpenAI validation API');

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
        error: payload.error || 'OpenAI key validation failed.',
      };
    }

    return {
      ok: true,
      message: payload.message as string,
      availableModelCount: payload.availableModelCount as number,
      sampleModels: payload.sampleModels as string[],
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'OpenAI key validation failed.',
    };
  }
};
