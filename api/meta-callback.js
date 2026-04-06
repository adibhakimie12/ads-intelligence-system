import { decodeState, exchangeCodeForToken, isMetaOAuthConfigured } from './_lib/meta-oauth.js';
import { fetchMetaAdAccounts, fetchMetaProfile } from './_lib/meta-graph.js';
import { isSupabaseServerConfigured, supabaseAdmin } from './_lib/supabase-admin.js';
import { encryptAccessToken, isTokenEncryptionConfigured } from './_lib/token-crypto.js';

const redirectWithStatus = (req, res, status, message = '') => {
  const baseOrigin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  const redirectTarget = new URL(process.env.META_POST_CONNECT_REDIRECT || '/', baseOrigin);
  redirectTarget.searchParams.set('meta_status', status);
  if (message) {
    redirectTarget.searchParams.set('meta_message', message);
  }
  return res.redirect(redirectTarget.toString());
};

export default async function handler(req, res) {
  if (!isMetaOAuthConfigured) {
    return redirectWithStatus(req, res, 'error', 'Meta OAuth is not configured yet.');
  }

  if (!isTokenEncryptionConfigured) {
    return redirectWithStatus(req, res, 'error', 'Meta token encryption is not configured yet.');
  }

  if (!isSupabaseServerConfigured || !supabaseAdmin) {
    return redirectWithStatus(req, res, 'error', 'Supabase server configuration is missing.');
  }

  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return redirectWithStatus(req, res, 'error', errorDescription || 'Meta authorization was cancelled.');
  }

  if (!code || !state) {
    return redirectWithStatus(req, res, 'error', 'Missing Meta OAuth callback parameters.');
  }

  try {
    const parsedState = decodeState(state);
    const tokenResponse = await exchangeCodeForToken(code);
    const encryptedToken = encryptAccessToken(tokenResponse.access_token);
    const [metaProfile, adAccounts] = await Promise.all([
      fetchMetaProfile(tokenResponse.access_token),
      fetchMetaAdAccounts(tokenResponse.access_token),
    ]);
    const selectedPrimaryAccount = adAccounts.length === 1 ? adAccounts[0] : null;

    const { data: connectionRow, error: connectionError } = await supabaseAdmin
      .from('meta_connections')
      .upsert({
        workspace_id: parsedState.workspaceId,
        meta_user_id: metaProfile.id || parsedState.userId,
        access_token_encrypted: encryptedToken.cipherText,
        access_token_iv: encryptedToken.iv,
        access_token_auth_tag: encryptedToken.authTag,
        token_encryption_version: encryptedToken.version,
        access_token_hint: encryptedToken.hint,
        token_expires_at: tokenResponse.expires_in
          ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
          : null,
        connected_account_id: selectedPrimaryAccount?.id || null,
        connected_account_name: selectedPrimaryAccount?.name || null,
        status: 'connected',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'workspace_id',
      })
      .select('id')
      .single();

    if (connectionError || !connectionRow) {
      throw new Error(connectionError?.message || 'Failed to save Meta connection.');
    }

    if (adAccounts.length > 0) {
      const accountRows = adAccounts.map((account) => ({
        workspace_id: parsedState.workspaceId,
        meta_connection_id: connectionRow.id,
        meta_ad_account_id: account.id,
        ad_account_name: account.name,
        account_status: account.status,
        account_currency: account.currency,
        is_primary: selectedPrimaryAccount ? account.id === selectedPrimaryAccount.id : false,
      }));

      const { error: accountError } = await supabaseAdmin
        .from('meta_ad_accounts')
        .upsert(accountRows, {
          onConflict: 'workspace_id,meta_ad_account_id',
        });

      if (accountError) {
        throw new Error(accountError.message);
      }
    }

    const successMessage = adAccounts.length === 0
      ? 'Meta connected, but no ad accounts were returned yet.'
      : adAccounts.length === 1
        ? 'Meta connected with 1 ad account ready.'
        : `Meta connected with ${adAccounts.length} ad accounts ready for selection.`;

    return redirectWithStatus(req, res, 'connected', successMessage);
  } catch (callbackError) {
    console.error('Meta callback error:', callbackError);
    return redirectWithStatus(req, res, 'error', 'Meta connection failed.');
  }
}
