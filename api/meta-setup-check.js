import { isMetaOAuthConfigured } from './_lib/meta-oauth.js';
import { isSupabaseServerConfigured } from './_lib/supabase-admin.js';
import { isTokenEncryptionConfigured } from './_lib/token-crypto.js';

const META_REQUIRED_ENV_VARS = [
  'META_APP_ID',
  'META_APP_SECRET',
  'META_REDIRECT_URI',
  'META_POST_CONNECT_REDIRECT',
  'META_TOKEN_ENCRYPTION_KEY',
];

const SUPABASE_REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const findMissingEnvVars = (names) => names.filter((name) => !process.env[name]);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const missingMetaEnvVars = findMissingEnvVars(META_REQUIRED_ENV_VARS);
  const missingSupabaseEnvVars = findMissingEnvVars(SUPABASE_REQUIRED_ENV_VARS);

  return res.status(200).json({
    ok: true,
    ready: isMetaOAuthConfigured && isSupabaseServerConfigured && isTokenEncryptionConfigured,
    checks: {
      metaOAuthConfigured: isMetaOAuthConfigured,
      supabaseConfigured: isSupabaseServerConfigured,
      tokenEncryptionConfigured: isTokenEncryptionConfigured,
    },
    missingMetaEnvVars,
    missingSupabaseEnvVars,
    redirectUri: process.env.META_REDIRECT_URI || null,
    postConnectRedirect: process.env.META_POST_CONNECT_REDIRECT || null,
  });
}
