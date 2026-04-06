export type MetaSetupCheckResult =
  | {
      ok: true;
      ready: boolean;
      checks: {
        metaOAuthConfigured: boolean;
        supabaseConfigured: boolean;
        tokenEncryptionConfigured: boolean;
      };
      missingMetaEnvVars: string[];
      missingSupabaseEnvVars: string[];
      redirectUri: string | null;
      postConnectRedirect: string | null;
    }
  | {
      ok: false;
      error: string;
    };

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api');

export const checkMetaSetup = async (): Promise<MetaSetupCheckResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/meta-setup-check`);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const body = await response.text();
      if (body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html')) {
        return {
          ok: false,
          error: 'Meta setup check returned HTML instead of API JSON. Restart `npm run dev` so the local API server and Vite proxy reload.',
        };
      }

      return {
        ok: false,
        error: 'Meta setup check returned an unexpected response from the server.',
      };
    }

    const payload = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: payload.error || 'Unable to check Meta setup.',
      };
    }

    return {
      ok: true,
      ready: payload.ready as boolean,
      checks: payload.checks as {
        metaOAuthConfigured: boolean;
        supabaseConfigured: boolean;
        tokenEncryptionConfigured: boolean;
      },
      missingMetaEnvVars: payload.missingMetaEnvVars as string[],
      missingSupabaseEnvVars: payload.missingSupabaseEnvVars as string[],
      redirectUri: payload.redirectUri as string | null,
      postConnectRedirect: payload.postConnectRedirect as string | null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to check Meta setup.';

    if (typeof message === 'string' && message.toLowerCase().includes('failed to fetch')) {
      return {
        ok: false,
        error: 'Meta setup check could not reach the local API server on port 3001. Make sure the backend is running, then refresh Settings.',
      };
    }

    return {
      ok: false,
      error: message,
    };
  }
};
