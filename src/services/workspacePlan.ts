import { supabase } from './supabase';
import type { PlanTier, Workspace, WorkspaceMember } from '../types';

export const getEffectiveWorkspacePlanTier = (
  workspace: Workspace | null,
  membership: WorkspaceMember | null
): PlanTier => {
  if (!workspace) {
    return 'free';
  }
  return workspace.plan_tier === 'pro' ? 'pro' : 'free';
};

export const updateWorkspacePlanTier = async (workspaceId: string, planTier: PlanTier) => {
  if (!supabase) {
    return { error: 'Supabase is not configured yet.' };
  }

  const { error } = await supabase
    .from('workspaces')
    .update({ plan_tier: planTier })
    .eq('id', workspaceId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};
