import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import type { MetaAdAccount, MetaConnection, Workspace, WorkspaceMember } from '../types';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  currentMembership: WorkspaceMember | null;
  metaConnection: MetaConnection | null;
  metaAdAccounts: MetaAdAccount[];
  workspaces: Workspace[];
  isLoading: boolean;
  setCurrentWorkspaceId: (workspaceId: string) => void;
  refreshWorkspaceData: () => Promise<void>;
}

const WORKSPACE_STORAGE_KEY = 'ads-intel-current-workspace-id';
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);
const isMissingColumnError = (message?: string | null) =>
  typeof message === 'string' && message.includes('does not exist');

const buildDemoWorkspace = (ownerUserId?: string): Workspace => ({
  id: 'workspace_demo_adsintel',
  name: 'Ads Intelligence Demo',
  slug: 'ads-intelligence-demo',
  plan_tier: 'free',
  owner_user_id: ownerUserId || 'demo-owner',
  created_at: new Date().toISOString(),
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isDemoMode, isConfigured } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [memberships, setMemberships] = useState<WorkspaceMember[]>([]);
  const [metaConnections, setMetaConnections] = useState<MetaConnection[]>([]);
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAdAccount[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(
    () => localStorage.getItem(WORKSPACE_STORAGE_KEY)
  );
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentWorkspaceId = (workspaceId: string) => {
    setCurrentWorkspaceIdState(workspaceId);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
  };

  const refreshWorkspaceData = async () => {
    if (isDemoMode) {
      const demoWorkspace = buildDemoWorkspace(user?.id);
      setWorkspaces([demoWorkspace]);
      setMemberships([{
        id: 'membership_demo_owner',
        workspace_id: demoWorkspace.id,
        user_id: user?.id || 'demo-owner',
        role: 'owner',
        created_at: demoWorkspace.created_at,
      }]);
      setMetaConnections([{
        id: 'meta_connection_demo',
        workspace_id: demoWorkspace.id,
        meta_user_id: null,
        status: 'not_connected',
        connected_account_name: null,
        connected_account_id: null,
        last_synced_at: null,
        created_at: demoWorkspace.created_at,
        updated_at: demoWorkspace.created_at,
      }]);
      setMetaAdAccounts([]);
      setCurrentWorkspaceIdState(demoWorkspace.id);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, demoWorkspace.id);
      setIsLoading(false);
      return;
    }

    if (!user || !isConfigured || !supabase) {
      setWorkspaces([]);
      setMemberships([]);
      setMetaConnections([]);
      setMetaAdAccounts([]);
      setCurrentWorkspaceIdState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data: membershipRows, error: membershipError } = await supabase
      .from('workspace_members')
      .select(`
        id,
        workspace_id,
        user_id,
        role,
        created_at,
        workspace:workspaces (
          id,
          name,
          slug,
          plan_tier,
          owner_user_id,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (membershipError) {
      console.error('Failed to load workspace memberships:', membershipError.message);
      setIsLoading(false);
      return;
    }

    const nextMemberships = (membershipRows || []).map((row: any) => ({
      id: row.id,
      workspace_id: row.workspace_id,
      user_id: row.user_id,
      role: row.role,
      created_at: row.created_at,
    })) as WorkspaceMember[];

    const nextWorkspaces = (membershipRows || [])
      .map((row: any) => row.workspace)
      .filter(Boolean) as Workspace[];

    setMemberships(nextMemberships);
    setWorkspaces(nextWorkspaces);

    const resolvedWorkspaceId = (currentWorkspaceId && nextWorkspaces.some((workspace) => workspace.id === currentWorkspaceId))
      ? currentWorkspaceId
      : nextWorkspaces[0]?.id || null;

    if (resolvedWorkspaceId) {
      setCurrentWorkspaceIdState(resolvedWorkspaceId);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, resolvedWorkspaceId);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }

    if (nextWorkspaces.length > 0) {
      const workspaceIds = nextWorkspaces.map((workspace) => workspace.id);
      let { data: connectionRows, error: connectionError } = await supabase
        .from('meta_connections')
        .select('id, workspace_id, meta_user_id, status, connected_account_id, connected_account_name, last_synced_at, created_at, updated_at')
        .in('workspace_id', workspaceIds);

      if (connectionError && isMissingColumnError(connectionError.message)) {
        const fallbackResult = await supabase
          .from('meta_connections')
          .select('id, workspace_id, meta_user_id, status, last_synced_at, created_at, updated_at')
          .in('workspace_id', workspaceIds);

        connectionRows = (fallbackResult.data || []).map((row: any) => ({
          ...row,
          connected_account_id: null,
          connected_account_name: null,
        }));
        connectionError = fallbackResult.error;
      }

      if (connectionError) {
        console.error('Failed to load meta connections:', connectionError.message);
      } else {
        setMetaConnections((connectionRows || []) as MetaConnection[]);
      }

      let { data: adAccountRows, error: adAccountError } = await supabase
        .from('meta_ad_accounts')
        .select('id, workspace_id, meta_connection_id, meta_ad_account_id, ad_account_name, account_status, account_currency, available_funds, amount_spent, daily_spending_limit, manual_available_funds, is_primary, created_at')
        .in('workspace_id', workspaceIds);

      if (adAccountError && isMissingColumnError(adAccountError.message)) {
        const fallbackResult = await supabase
          .from('meta_ad_accounts')
          .select('id, workspace_id, meta_connection_id, meta_ad_account_id, ad_account_name, is_primary, created_at')
          .in('workspace_id', workspaceIds);

        adAccountRows = (fallbackResult.data || []).map((row: any) => ({
          ...row,
          account_status: null,
          account_currency: null,
          available_funds: null,
          amount_spent: null,
          daily_spending_limit: null,
          manual_available_funds: null,
        }));
        adAccountError = fallbackResult.error;
      }

      if (adAccountError) {
        console.error('Failed to load meta ad accounts:', adAccountError.message);
      } else {
        setMetaAdAccounts((adAccountRows || []) as MetaAdAccount[]);
      }
    } else {
      setMetaConnections([]);
      setMetaAdAccounts([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void refreshWorkspaceData();
  }, [user?.id, isConfigured, isDemoMode]);

  const currentWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId) || workspaces[0] || null;
  const currentMembership = currentWorkspace
    ? memberships.find((membership) => membership.workspace_id === currentWorkspace.id) || null
    : null;
  const metaConnection = currentWorkspace
    ? metaConnections.find((connection) => connection.workspace_id === currentWorkspace.id) || null
    : null;
  const currentWorkspaceAdAccounts = currentWorkspace
    ? metaAdAccounts.filter((account) => account.workspace_id === currentWorkspace.id)
    : [];

  const value = useMemo(() => ({
    currentWorkspace,
    currentMembership,
    metaConnection,
    metaAdAccounts: currentWorkspaceAdAccounts,
    workspaces,
    isLoading,
    setCurrentWorkspaceId,
    refreshWorkspaceData,
  }), [currentWorkspace, currentMembership, metaConnection, currentWorkspaceAdAccounts, workspaces, isLoading]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
