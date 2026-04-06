import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { CurrencyCode } from '../types';
import type { PlanTier, UpgradeTrigger } from '../App';
import {
  Settings as SettingsIcon,
  Globe,
  BarChart3,
  Brain,
  Workflow,
  Bell,
  CreditCard,
  Wrench,
  ChevronRight,
  Zap,
  RefreshCw,
  ArrowUpRight,
  Shield,
  Target,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  Lock,
  Crown
} from 'lucide-react';

/* ─── Toggle Switch ─── */
function Toggle({ enabled, onChange, id }: { enabled: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? 'bg-primary' : 'bg-on-surface/10'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ─── Section Card ─── */
function SectionCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 p-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-40 h-40 -mr-20 -mt-20 bg-primary/[0.02] rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">{title}</h2>
            <p className="text-xs text-on-surface-variant/60 font-medium mt-0.5">{description}</p>
          </div>
        </div>
        <div className="mt-8">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Settings Page ─── */
interface SettingsPageProps {
  planTier: PlanTier;
  leadUsageCount: number;
  leadLimit: number;
  onUpgradeRequest: (trigger: UpgradeTrigger) => void;
}

export default function SettingsPage({
  planTier,
  leadUsageCount,
  leadLimit,
  onUpgradeRequest,
}: SettingsPageProps) {
  const { setAdsData, isFetching, syncAdsData, currency, setCurrency } = useDatabase();

  /* Local toggle states */
  const [utmTagging, setUtmTagging] = useState(true);
  const [convTracking, setConvTracking] = useState(true);
  const [attrWindow, setAttrWindow] = useState<7 | 14 | 28>(7);

  const [aiMode, setAiMode] = useState<'basic' | 'advanced'>('advanced');
  const [leadScoring, setLeadScoring] = useState(true);
  const [creativeAnalysis, setCreativeAnalysis] = useState(true);
  const [smartRec, setSmartRec] = useState(true);

  const [ruleCtr, setRuleCtr] = useState(true);
  const [ruleRoas, setRuleRoas] = useState(true);
  const [ruleCpm, setRuleCpm] = useState(true);
  const [ruleConv, setRuleConv] = useState(false);

  const [alertBottleneck, setAlertBottleneck] = useState(true);
  const [alertHighValue, setAlertHighValue] = useState(true);
  const [alertBudget, setAlertBudget] = useState(false);
  const [alertDailySummary, setAlertDailySummary] = useState(true);

  const [systemName, setSystemName] = useState('Ads Intelligence System');
  const [timezone, setTimezone] = useState('Asia/Kuala_Lumpur');
  const isFreePlan = planTier === 'free';
  const leadUsageWidth = isFreePlan ? `${Math.min((leadUsageCount / leadLimit) * 100, 100)}%` : '100%';

  const handleTestRule = (ctr: number, roas: number, cpm: number, conversions: number) => {
    setAdsData([{
      id: 'test_1',
      campaign_name: 'Manual_Test_Campaign',
      spend: 1000,
      CTR: ctr,
      CPM: cpm,
      ROAS: roas,
      conversions: conversions,
      revenue: roas * 1000,
      date: new Date().toISOString()
    }]);
  };

  return (
    <main className="max-w-[960px] mx-auto px-8 pb-20">
      {/* Page Header */}
      <div className="mb-12">
        <p className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-3">⚙ Control Center</p>
        <h1 className="text-[3.5rem] font-extrabold tracking-tight font-headline text-on-surface leading-tight">
          Settings
        </h1>
        <p className="text-on-surface-variant font-medium mt-2">
          Configure your integrations, AI engine, automation rules, and system preferences.
        </p>
      </div>

      <div className="space-y-8">

        {/* ═══════ 1. General Settings ═══════ */}
        <SectionCard icon={SettingsIcon} title="General" description="System identity and regional preferences">
          <div className="space-y-6">
            {/* System Name */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">System Name</p>
                <p className="text-xs text-on-surface-variant/60">Display name across the platform</p>
              </div>
              <input
                id="settings-system-name"
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                className="w-64 px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            {/* Currency */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Default Currency</p>
                <p className="text-xs text-on-surface-variant/60">Used for all financial reporting</p>
              </div>
              <select
                id="settings-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-64 px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="MYR">MYR — Malaysian Ringgit</option>
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
            {/* Timezone */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Timezone</p>
                <p className="text-xs text-on-surface-variant/60">Used for scheduling and report timestamps</p>
              </div>
              <select
                id="settings-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-64 px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (GMT+8)</option>
                <option value="America/New_York">America/New York (GMT-5)</option>
                <option value="Europe/London">Europe/London (GMT+0)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* ═══════ 2. Ads Integrations ═══════ */}
        <SectionCard icon={Globe} title="Ads Integrations" description="Connect and manage your advertising platforms">
          <div className="space-y-4">
            {/* Meta */}
            <div className="flex items-center justify-between p-5 rounded-2xl bg-surface-container-low border border-outline-variant/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-600 font-black text-sm">M</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    Meta Ads
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Connected</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant/60">Server proxy active • Mock data fallback enabled</p>
                </div>
              </div>
              <button
                id="settings-sync-meta"
                onClick={() => syncAdsData('meta')}
                disabled={isFetching}
                className="px-5 py-2 rounded-xl bg-surface-container-high text-on-surface-variant font-bold text-xs uppercase tracking-wider hover:bg-surface-container-highest transition-all active:scale-95 flex items-center gap-2"
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                Sync
              </button>
            </div>
            {/* Google */}
            <div className="flex items-center justify-between p-5 rounded-2xl bg-surface-container-low border border-outline-variant/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <span className="text-orange-600 font-black text-sm">G</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    Google Ads
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Connected</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant/60">Server proxy active • Mock data fallback enabled</p>
                </div>
              </div>
              <button
                id="settings-sync-google"
                onClick={() => syncAdsData('google')}
                disabled={isFetching}
                className="px-5 py-2 rounded-xl bg-surface-container-high text-on-surface-variant font-bold text-xs uppercase tracking-wider hover:bg-surface-container-highest transition-all active:scale-95 flex items-center gap-2"
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                Sync
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ═══════ 3. Tracking & Analytics ═══════ */}
        <SectionCard icon={BarChart3} title="Tracking & Analytics" description="Configure attribution and conversion settings">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">UTM Auto-Tagging</p>
                <p className="text-xs text-on-surface-variant/60">Automatically append UTM params to all ad links</p>
              </div>
              <Toggle enabled={utmTagging} onChange={setUtmTagging} id="toggle-utm" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Conversion Tracking</p>
                <p className="text-xs text-on-surface-variant/60">Track post-click and post-view conversions</p>
              </div>
              <Toggle enabled={convTracking} onChange={setConvTracking} id="toggle-conv-tracking" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Attribution Window</p>
                <p className="text-xs text-on-surface-variant/60">Days to attribute conversions after ad interaction</p>
              </div>
              <div className="flex gap-1 bg-surface-container-low rounded-xl p-1">
                {([7, 14, 28] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setAttrWindow(d)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      attrWindow === d
                        ? 'bg-on-surface text-surface-container-lowest shadow-md'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ═══════ 4. AI Engine ═══════ */}
        <SectionCard icon={Brain} title="AI Engine" description="Configure the intelligence layer powering your CRM">
          <div className="space-y-6">
            {isFreePlan && (
              <button
                onClick={() => onUpgradeRequest('locked_feature')}
                className="w-full rounded-2xl border border-primary/15 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Pro Feature</p>
                    <p className="mt-2 text-sm font-bold text-on-surface">AI recommendations and advanced analytics are locked on Free</p>
                    <p className="mt-1 text-xs text-on-surface-variant/70">
                      Upgrade to unlock automation-ready insights, recommendation engines, and premium reporting.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
                    <Lock size={12} />
                    Unlock
                  </span>
                </div>
              </button>
            )}
            {/* API Key */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">API Key</p>
                <p className="text-xs text-on-surface-variant/60">Your AI service authentication token</p>
              </div>
              <input
                id="settings-ai-key"
                type="password"
                defaultValue="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-64 px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-sm font-mono text-on-surface-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            {/* Mode */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Processing Mode</p>
                <p className="text-xs text-on-surface-variant/60">Basic uses rules engine, Advanced uses ML models</p>
              </div>
              <div className="flex gap-1 bg-surface-container-low rounded-xl p-1">
                <button
                  onClick={() => setAiMode('basic')}
                  className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aiMode === 'basic'
                      ? 'bg-on-surface text-surface-container-lowest shadow-md'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Basic
                </button>
                <button
                  onClick={() => isFreePlan ? onUpgradeRequest('locked_feature') : setAiMode('advanced')}
                  className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aiMode === 'advanced'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isFreePlan && <Lock size={12} />}
                    Advanced
                  </span>
                </button>
              </div>
            </div>
            {/* Feature Toggles */}
            <div className="pt-4 border-t border-outline-variant/5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target size={16} className="text-primary/40" />
                  <div>
                    <p className="text-sm font-bold text-on-surface">Lead Scoring</p>
                    <p className="text-xs text-on-surface-variant/60">Auto-score leads based on engagement signals</p>
                  </div>
                </div>
                <Toggle enabled={leadScoring} onChange={setLeadScoring} id="toggle-lead-scoring" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-primary/40" />
                  <div>
                    <p className="text-sm font-bold text-on-surface">Creative Analysis</p>
                    <p className="text-xs text-on-surface-variant/60">Analyze hook strength, fatigue, and CTA clarity</p>
                  </div>
                </div>
                <Toggle enabled={creativeAnalysis} onChange={setCreativeAnalysis} id="toggle-creative-analysis" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap size={16} className="text-primary/40" />
                  <div>
                    <p className="text-sm font-bold text-on-surface">Smart Recommendations</p>
                    <p className="text-xs text-on-surface-variant/60">AI-driven next-best-action for each lead</p>
                  </div>
                </div>
                <Toggle enabled={smartRec} onChange={setSmartRec} id="toggle-smart-rec" />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ═══════ 5. Automation Rules ═══════ */}
        <SectionCard icon={Workflow} title="Automation Rules" description="Define trigger-based actions for your ad campaigns">
          <div className="space-y-4">
            {/* Rule rows */}
            {[
              { id: 'rule-ctr', enabled: ruleCtr, onChange: setRuleCtr, condition: 'CTR < 1%', action: 'Suggest New Creative', icon: AlertTriangle, color: 'text-amber-500' },
              { id: 'rule-roas', enabled: ruleRoas, onChange: setRuleRoas, condition: 'ROAS > 4x', action: 'Scale Campaign Budget', icon: TrendingUp, color: 'text-emerald-500' },
              { id: 'rule-cpm', enabled: ruleCpm, onChange: setRuleCpm, condition: 'CPM > $25', action: 'Adjust Audience Targeting', icon: Target, color: 'text-blue-500' },
              { id: 'rule-conv', enabled: ruleConv, onChange: setRuleConv, condition: 'Conv. Rate < 2%', action: 'Pause & Review Campaign', icon: Shield, color: 'text-red-500' },
            ].map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/5">
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center ${rule.color}`}>
                    <rule.icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="font-mono text-xs bg-surface-container-high px-2 py-0.5 rounded-md text-on-surface-variant">{rule.condition}</span>
                      <ChevronRight size={12} className="text-on-surface-variant/30" />
                      <span>{rule.action}</span>
                    </p>
                  </div>
                </div>
                <Toggle enabled={rule.enabled} onChange={rule.onChange} id={rule.id} />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ═══════ 6. Real-Time Alerts ═══════ */}
        <SectionCard icon={Bell} title="Real-Time Alerts" description="Control which notifications and warnings you receive">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Pipeline Bottleneck Alerts</p>
                <p className="text-xs text-on-surface-variant/60">Notify when leads are stuck in a stage too long</p>
              </div>
              <Toggle enabled={alertBottleneck} onChange={setAlertBottleneck} id="toggle-alert-bottleneck" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">High-Value Lead Notifications</p>
                <p className="text-xs text-on-surface-variant/60">Alert when a high-score lead enters the pipeline</p>
              </div>
              <Toggle enabled={alertHighValue} onChange={setAlertHighValue} id="toggle-alert-high-value" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Budget Threshold Warnings</p>
                <p className="text-xs text-on-surface-variant/60">Warn when campaign spend exceeds daily budget</p>
              </div>
              <Toggle enabled={alertBudget} onChange={setAlertBudget} id="toggle-alert-budget" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Daily Performance Summary</p>
                <p className="text-xs text-on-surface-variant/60">Receive a daily digest of key metrics at 9:00 AM</p>
              </div>
              <Toggle enabled={alertDailySummary} onChange={setAlertDailySummary} id="toggle-alert-daily" />
            </div>
          </div>
        </SectionCard>

        {/* ═══════ 7. Billing ═══════ */}
        <SectionCard icon={CreditCard} title="Billing" description="Manage your subscription and usage">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className={`rounded-3xl border p-5 ${
                isFreePlan
                  ? 'border-outline-variant/15 bg-surface-container-low'
                  : 'border-emerald-200 bg-emerald-50/70'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-on-surface-variant">Current</p>
                <h3 className="mt-3 text-xl font-black text-on-surface">{isFreePlan ? 'Free Plan' : 'Pro Plan'}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {isFreePlan
                    ? '50 leads and basic insights for lighter workflows.'
                    : 'Unlimited leads, AI recommendations, automation rules, and advanced analytics.'}
                </p>
              </div>
              <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] via-white to-surface-container-lowest p-5">
                <div className="flex items-center gap-2 text-primary">
                  <Crown size={16} />
                  <p className="text-[10px] font-black uppercase tracking-[0.24em]">Upgrade Path</p>
                </div>
                <h3 className="mt-3 text-xl font-black text-on-surface">Pro at RM 299/month</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Built for teams ready to scale with smoother automation and stronger decision support.
                </p>
              </div>
            </div>
            {/* Current Plan */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  isFreePlan ? 'bg-surface-container-high text-on-surface-variant' : 'bg-primary/10 text-primary'
                }`}>
                  {isFreePlan ? 'Free Plan' : 'Pro Plan'}
                </div>
                <span className="text-sm font-bold text-on-surface">{isFreePlan ? 'RM 0/month' : 'RM 299/month'}</span>
                <span className="text-xs text-on-surface-variant/60">{isFreePlan ? 'Upgrade anytime' : 'Billed monthly'}</span>
              </div>
              <button
                onClick={() => onUpgradeRequest('billing')}
                className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <ArrowUpRight size={14} />
                {isFreePlan ? 'Upgrade' : 'Manage Plan'}
              </button>
            </div>
            {/* Usage */}
            <div className="pt-4 border-t border-outline-variant/5">
              <div className="flex justify-between mb-2">
                <p className="text-xs font-bold text-on-surface-variant">Insights Access</p>
                <p className="text-xs font-black text-on-surface">{isFreePlan ? 'Basic only' : 'Advanced analytics enabled'}</p>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isFreePlan ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: isFreePlan ? '42%' : '100%' }} />
              </div>
              <p className="text-[10px] text-on-surface-variant/50 mt-2">
                {isFreePlan ? 'Advanced analytics, AI recommendations, and automation rules unlock on Pro.' : 'Your workspace has full premium intelligence access.'}
              </p>
            </div>
            {/* Leads Usage */}
            <div>
              <div className="flex justify-between mb-2">
                <p className="text-xs font-bold text-on-surface-variant">Lead Capacity</p>
                <p className="text-xs font-black text-on-surface">
                  {isFreePlan ? `${leadUsageCount} / ${leadLimit}` : `${leadUsageCount} / Unlimited`}
                </p>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isFreePlan ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: leadUsageWidth }} />
              </div>
              {isFreePlan && (
                <p className="mt-2 text-xs font-medium text-on-surface-variant">
                  You&apos;ve reached your lead limit. Upgrade to Pro for unlimited leads and uninterrupted growth.
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ═══════ 8. System Tools (de-emphasised) ═══════ */}
        <div className="bg-surface-container-low/50 rounded-3xl border border-outline-variant/5 p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <Wrench size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant">System Tools</h2>
              <p className="text-xs text-on-surface-variant/40 font-medium mt-0.5">Developer utilities and diagnostic actions</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {/* Sync All */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/5">
              <div>
                <p className="text-sm font-bold text-on-surface">Sync All Ad Accounts</p>
                <p className="text-xs text-on-surface-variant/60">Pull latest data from all connected platforms</p>
              </div>
              <button
                id="settings-sync-all"
                onClick={() => syncAdsData('all')}
                disabled={isFetching}
                className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                  isFetching
                    ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                    : 'bg-on-surface text-surface-container-lowest hover:shadow-lg active:scale-95'
                }`}
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                {isFetching ? 'Syncing...' : 'Sync All'}
              </button>
            </div>

            {/* Test Rule Buttons */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/5">
              <p className="text-sm font-bold text-on-surface mb-1">Rules Engine Test</p>
              <p className="text-xs text-on-surface-variant/60 mb-4">Inject test data to validate automation rules</p>
              <div className="flex flex-wrap gap-2">
                <button
                  id="settings-test-ctr"
                  onClick={() => handleTestRule(0.5, 2.0, 15, 10)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant font-bold text-[11px] uppercase tracking-wider hover:bg-surface-container-highest transition-all active:scale-95"
                >
                  Test CTR 0.5%
                </button>
                <button
                  id="settings-test-roas"
                  onClick={() => handleTestRule(1.5, 4.0, 15, 10)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant font-bold text-[11px] uppercase tracking-wider hover:bg-surface-container-highest transition-all active:scale-95"
                >
                  Test ROAS 4x
                </button>
                <button
                  id="settings-test-cpm"
                  onClick={() => handleTestRule(2.5, 2.0, 30, 2)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant font-bold text-[11px] uppercase tracking-wider hover:bg-surface-container-highest transition-all active:scale-95"
                >
                  Test CPM &gt; $25
                </button>
              </div>
            </div>

            <p className="text-[10px] text-on-surface-variant/30 uppercase tracking-widest font-bold pt-2 px-2">
              Proxy: server.js must be running on Port 3001
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
