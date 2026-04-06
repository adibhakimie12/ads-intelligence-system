import { buildMetaOAuthUrl, encodeState, isMetaOAuthConfigured } from './_lib/meta-oauth.js';
import { isSupabaseServerConfigured, supabaseAdmin, supabaseAuthClient } from './_lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isMetaOAuthConfigured) {
    return res.status(400).json({ error: 'Meta OAuth is not configured on the server yet.' });
  }

  if (!isSupabaseServerConfigured || !supabaseAdmin || !supabaseAuthClient) {
    return res.status(400).json({ error: 'Supabase server configuration is missing.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }

  const { data: authData, error: authError } = await supabaseAuthClient.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Invalid user session.' });
  }

  const { workspaceId } = req.body || {};
  if (!workspaceId) {
    return res.status(400).json({ error: 'workspaceId is required.' });
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authData.user.id)
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({ error: 'You do not have access to that workspace.' });
  }

  const state = encodeState({
    workspaceId,
    userId: authData.user.id,
    createdAt: Date.now(),
  });

  return res.status(200).json({
    url: buildMetaOAuthUrl({ state }),
  });
}
