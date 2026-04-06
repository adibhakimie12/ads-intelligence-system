import React, { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import Onboarding from './components/Onboarding';
import UpgradeModal from './components/UpgradeModal';
import AuthScreen from './components/AuthScreen';
import { useDatabase } from './context/DatabaseContext';
import { useAuth } from './context/AuthContext';
import { useWorkspace } from './context/WorkspaceContext';
import { getEffectiveWorkspacePlanTier, updateWorkspacePlanTier } from './services/workspacePlan';

// Import Pages
import DashboardPage from './pages/Dashboard';
import InsightsPage from './pages/Insights';
import CreativesPage from './pages/Creatives';
import CampaignsPage from './pages/Campaigns';
import ProfitPage from './pages/Profit';
import LeadsPage from './pages/Leads';
import SettingsPage from './pages/Settings';

export type PlanTier = 'free' | 'pro';
export type UpgradeTrigger = 'lead_limit' | 'locked_feature' | 'billing';

export default function App() {
  const { currentPage, leads } = useDatabase();
  const { user, isLoading, isDemoMode, signOut } = useAuth();
  const {
    currentWorkspace,
    currentMembership,
    isLoading: isWorkspaceLoading,
    refreshWorkspaceData,
  } = useWorkspace();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('ads-intel-onboarded')
  );
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger>('billing');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradingWorkspacePlan, setIsUpgradingWorkspacePlan] = useState(false);

  const planTier = getEffectiveWorkspacePlanTier(currentWorkspace, currentMembership);

  const leadUsageCount = leads.length;
  const leadLimit = planTier === 'free' ? 50 : Infinity;
  const hasReachedLeadLimit = planTier === 'free' && leadUsageCount >= 50;

  const handleResetOnboarding = () => {
    localStorage.removeItem('ads-intel-onboarded');
    setShowOnboarding(true);
  };

  const openUpgradeModal = (trigger: UpgradeTrigger) => {
    setUpgradeTrigger(trigger);
    setIsUpgradeModalOpen(true);
  };

  useEffect(() => {
    if (!currentWorkspace || !currentMembership || currentMembership.role !== 'owner') {
      return;
    }

    if (currentWorkspace.plan_tier === 'pro' || isDemoMode || isUpgradingWorkspacePlan) {
      return;
    }

    let cancelled = false;

    const upgradeOwnerWorkspace = async () => {
      setIsUpgradingWorkspacePlan(true);
      try {
        const result = await updateWorkspacePlanTier(currentWorkspace.id, 'pro');
        if (!cancelled && !result.error) {
          await refreshWorkspaceData();
        }
      } finally {
        if (!cancelled) {
          setIsUpgradingWorkspacePlan(false);
        }
      }
    };

    void upgradeOwnerWorkspace();

    return () => {
      cancelled = true;
    };
  }, [
    currentMembership,
    currentWorkspace,
    isDemoMode,
    isUpgradingWorkspacePlan,
    refreshWorkspaceData,
  ]);

  const handleUpgrade = async () => {
    if (!currentWorkspace || isDemoMode) {
      setIsUpgradeModalOpen(false);
      return;
    }

    setIsUpgradingWorkspacePlan(true);
    try {
      const result = await updateWorkspacePlanTier(currentWorkspace.id, 'pro');
      if (!result.error) {
        await refreshWorkspaceData();
      }
    } finally {
      setIsUpgradingWorkspacePlan(false);
    }

    setIsUpgradeModalOpen(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return <DashboardPage />;
      case 'Insights':
        return <InsightsPage />;
      case 'Creatives':
        return <CreativesPage />;
      case 'Campaigns':
        return <CampaignsPage />;
      case 'Profit':
        return <ProfitPage />;
      case 'Leads':
        return (
          <LeadsPage
            planTier={planTier}
            leadUsageCount={leadUsageCount}
            leadLimit={leadLimit}
            hasReachedLeadLimit={hasReachedLeadLimit}
            onUpgradeRequest={() => openUpgradeModal('lead_limit')}
          />
        );
      case 'Settings':
        return (
          <SettingsPage
            planTier={planTier}
            leadUsageCount={leadUsageCount}
            leadLimit={leadLimit}
            onUpgradeRequest={openUpgradeModal}
          />
        );
      default:
        return <DashboardPage />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="panel-surface rounded-[2rem] px-8 py-6 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Loading</p>
          <h1 className="mt-3 font-headline text-2xl font-bold text-on-surface">Preparing your workspace shell</h1>
        </div>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return <AuthScreen />;
  }

  if (user && !isDemoMode && isWorkspaceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="panel-surface rounded-[2rem] px-8 py-6 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Workspace</p>
          <h1 className="mt-3 font-headline text-2xl font-bold text-on-surface">Loading your workspace</h1>
        </div>
      </div>
    );
  }

  if (user && !isDemoMode && !currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="panel-surface max-w-xl rounded-[2rem] px-8 py-8 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Workspace Required</p>
          <h1 className="mt-3 font-headline text-2xl font-bold text-on-surface">No workspace was found for this account</h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-on-surface-variant">
            Run the Supabase workspace migration and signup trigger first, then sign out and back in so your first workspace is created automatically.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-full bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-all hover:opacity-95"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-primary/20">
      <Navigation onResetOnboarding={handleResetOnboarding} />
      <div className="pt-20 pb-20">
        {renderPage()}
      </div>
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgrade={handleUpgrade}
        trigger={upgradeTrigger}
        planTier={planTier}
      />
    </div>
  );
}
