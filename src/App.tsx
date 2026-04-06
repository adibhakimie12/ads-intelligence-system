import React, { useState } from 'react';
import Navigation from './components/Navigation';
import Onboarding from './components/Onboarding';
import UpgradeModal from './components/UpgradeModal';
import { useDatabase } from './context/DatabaseContext';

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
  const { currentPage } = useDatabase();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('ads-intel-onboarded')
  );
  const [planTier, setPlanTier] = useState<PlanTier>('free');
  const [leadUsageCount, setLeadUsageCount] = useState(50);
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger>('billing');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

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

  const handleUpgrade = () => {
    setPlanTier('pro');
    setLeadUsageCount(132);
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
