import { isSupabaseServerConfigured, supabaseAdmin, supabaseAuthClient } from './_lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  const { workspaceId, adAccountId } = req.body || {};
  if (!workspaceId || !adAccountId) {
    return res.status(400).json({ error: 'workspaceId and adAccountId are required.' });
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authData.user.id)
    .single();

  if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Only workspace owners or admins can select the primary Meta account.' });
  }

  const { data: selectedAccount, error: selectedAccountError } = await supabaseAdmin
    .from('meta_ad_accounts')
    .select('id, meta_connection_id, meta_ad_account_id, ad_account_name')
    .eq('workspace_id', workspaceId)
    .eq('meta_ad_account_id', adAccountId)
    .single();

  if (selectedAccountError || !selectedAccount) {
    return res.status(404).json({ error: 'That Meta ad account was not found for this workspace.' });
  }

  const { error: clearPrimaryError } = await supabaseAdmin
    .from('meta_ad_accounts')
    .update({ is_primary: false })
    .eq('workspace_id', workspaceId);

  if (clearPrimaryError) {
    return res.status(500).json({ error: clearPrimaryError.message });
  }

  const { error: setPrimaryError } = await supabaseAdmin
    .from('meta_ad_accounts')
    .update({ is_primary: true })
    .eq('workspace_id', workspaceId)
    .eq('meta_ad_account_id', adAccountId);

  if (setPrimaryError) {
    return res.status(500).json({ error: setPrimaryError.message });
  }

  const { error: updateConnectionError } = await supabaseAdmin
    .from('meta_connections')
    .update({
      connected_account_id: selectedAccount.meta_ad_account_id,
      connected_account_name: selectedAccount.ad_account_name,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId);

  if (updateConnectionError) {
    return res.status(500).json({ error: updateConnectionError.message });
  }

  return res.status(200).json({
    success: true,
    selectedAccount: {
      id: selectedAccount.meta_ad_account_id,
      name: selectedAccount.ad_account_name,
    },
  });
}
