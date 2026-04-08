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

  const { workspaceId, adAccountId, manualAvailableFunds } = req.body || {};
  if (!workspaceId || !adAccountId) {
    return res.status(400).json({ error: 'workspaceId and adAccountId are required.' });
  }

  if (manualAvailableFunds != null && (Number.isNaN(Number(manualAvailableFunds)) || Number(manualAvailableFunds) < 0)) {
    return res.status(400).json({ error: 'Manual available funds must be a valid positive number.' });
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authData.user.id)
    .single();

  if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Only workspace owners or admins can update Meta account funding.' });
  }

  const { error: updateError } = await supabaseAdmin
    .from('meta_ad_accounts')
    .update({
      manual_available_funds: manualAvailableFunds == null || manualAvailableFunds === '' ? null : Number(manualAvailableFunds),
    })
    .eq('workspace_id', workspaceId)
    .eq('meta_ad_account_id', adAccountId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({
    success: true,
    manualAvailableFunds: manualAvailableFunds == null || manualAvailableFunds === '' ? null : Number(manualAvailableFunds),
  });
}
