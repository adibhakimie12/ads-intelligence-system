import dotenv from 'dotenv';

dotenv.config();

const META_OAUTH_BASE = 'https://www.facebook.com/v20.0/dialog/oauth';
const META_TOKEN_URL = 'https://graph.facebook.com/v20.0/oauth/access_token';

export const isMetaOAuthConfigured = Boolean(
  process.env.META_APP_ID &&
  process.env.META_APP_SECRET &&
  process.env.META_REDIRECT_URI
);

export const encodeState = (payload) => Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
export const decodeState = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

export const buildMetaOAuthUrl = ({ state }) => {
  const url = new URL(META_OAUTH_BASE);
  url.searchParams.set('client_id', process.env.META_APP_ID);
  url.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', [
    'ads_read',
    'business_management',
  ].join(','));
  return url.toString();
};

export const exchangeCodeForToken = async (code) => {
  const url = new URL(META_TOKEN_URL);
  url.searchParams.set('client_id', process.env.META_APP_ID);
  url.searchParams.set('client_secret', process.env.META_APP_SECRET);
  url.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI);
  url.searchParams.set('code', code);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meta token exchange failed: ${response.status} ${body}`);
  }

  return response.json();
};
