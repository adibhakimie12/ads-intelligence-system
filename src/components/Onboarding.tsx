import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { CurrencyCode } from '../types';
import {
  Sparkles,
  Globe,
  ArrowRight,
  ArrowLeft,
  Building2,
  Check,
  Zap,
  Target,
  Brain,
  Rocket,
  SkipForward
} from 'lucide-react';

/* ─── Toggle Switch ─── */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
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

/* ─── Step Indicator ─── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i === current
              ? 'w-8 bg-primary'
              : i < current
              ? 'w-4 bg-primary/30'
              : 'w-4 bg-on-surface/10'
          }`}
        />
      ))}
    </div>
  );
}

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { setCurrency } = useDatabase();
  const [step, setStep] = useState(0);
  const totalSteps = 5;

  // Step 2: Ads connection state
  const [metaConnected, setMetaConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  // Step 3: Workspace state
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('MYR');
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Kuala_Lumpur');

  // Step 4: AI toggles
  const [leadScoring, setLeadScoring] = useState(true);
  const [smartRec, setSmartRec] = useState(true);

  const next = () => {
    if (step === 2) {
      // Apply workspace settings
      setCurrency(selectedCurrency);
    }
    if (step < totalSteps - 1) setStep(step + 1);
  };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const handleComplete = () => {
    setCurrency(selectedCurrency);
    localStorage.setItem('ads-intel-onboarded', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[540px] px-6">
        {/* Step counter & progress */}
        {step > 0 && step < totalSteps - 1 && (
          <div className="flex items-center justify-between mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">
              Step {step} of {totalSteps - 2}
            </p>
            <StepIndicator current={step} total={totalSteps} />
          </div>
        )}

        {/* ═══════ Step 0: Welcome ═══════ */}
        {step === 0 && (
          <div className="text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
              <Sparkles size={36} className="text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-4">
              Welcome to Ads Intel
            </h1>
            <p className="text-on-surface-variant font-medium text-lg mb-2">
              Let's set up your system in under 2 minutes
            </p>
            <p className="text-on-surface-variant/50 text-sm mb-12">
              Connect your ad platforms, configure your workspace, and activate AI-powered insights.
            </p>
            <button
              onClick={next}
              className="px-10 py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
              Get Started
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ═══════ Step 1: Ads Connection ═══════ */}
        {step === 1 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-5">
                <Globe size={26} className="text-blue-500" />
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-on-surface tracking-tight mb-2">
                Connect Your Ads
              </h2>
              <p className="text-on-surface-variant text-sm">
                Link your advertising platforms to start pulling data
              </p>
            </div>

            <div className="space-y-4 mb-10">
              {/* Meta */}
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-600 font-black text-base">M</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Meta Ads</p>
                    <p className="text-xs text-on-surface-variant/60">Facebook & Instagram campaigns</p>
                  </div>
                </div>
                <button
                  onClick={() => setMetaConnected(!metaConnected)}
                  className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                    metaConnected
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200'
                      : 'bg-primary text-white shadow-md shadow-primary/20 hover:scale-105'
                  }`}
                >
                  {metaConnected ? <><Check size={14} /> Connected</> : 'Connect Now'}
                </button>
              </div>

              {/* Google */}
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <span className="text-orange-600 font-black text-base">G</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Google Ads</p>
                    <p className="text-xs text-on-surface-variant/60">Search, Display & Shopping campaigns</p>
                  </div>
                </div>
                <button
                  onClick={() => setGoogleConnected(!googleConnected)}
                  className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                    googleConnected
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200'
                      : 'bg-primary text-white shadow-md shadow-primary/20 hover:scale-105'
                  }`}
                >
                  {googleConnected ? <><Check size={14} /> Connected</> : 'Connect Now'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={prev} className="p-3 rounded-xl hover:bg-surface-container-low transition-colors text-on-surface-variant">
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={next}
                  className="px-4 py-2.5 rounded-xl text-on-surface-variant font-bold text-xs uppercase tracking-wider hover:bg-surface-container-low transition-all flex items-center gap-2"
                >
                  <SkipForward size={14} />
                  Skip for now
                </button>
                {(metaConnected || googleConnected) && (
                  <button
                    onClick={next}
                    className="px-8 py-3 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ Step 2: Workspace Setup ═══════ */}
        {step === 2 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-5">
                <Building2 size={26} className="text-indigo-500" />
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-on-surface tracking-tight mb-2">
                Set Up Your Workspace
              </h2>
              <p className="text-on-surface-variant text-sm">
                Configure your core business settings
              </p>
            </div>

            <div className="space-y-5 mb-10">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 block">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. My Agency"
                  className="w-full px-5 py-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-sm font-bold text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 block">
                  Currency
                </label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="MYR">MYR — Malaysian Ringgit</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 block">
                  Timezone
                </label>
                <select
                  value={selectedTimezone}
                  onChange={(e) => setSelectedTimezone(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (GMT+8)</option>
                  <option value="America/New_York">America/New York (GMT-5)</option>
                  <option value="Europe/London">Europe/London (GMT+0)</option>
                  <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={prev} className="p-3 rounded-xl hover:bg-surface-container-low transition-colors text-on-surface-variant">
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={next}
                className="px-8 py-3 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════ Step 3: AI Setup ═══════ */}
        {step === 3 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-5">
                <Brain size={26} className="text-violet-500" />
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-on-surface tracking-tight mb-2">
                Activate AI Engine
              </h2>
              <p className="text-on-surface-variant text-sm">
                Enable intelligent features to supercharge your pipeline
              </p>
            </div>

            <div className="space-y-4 mb-10">
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                    <Target size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Lead Scoring</p>
                    <p className="text-xs text-on-surface-variant/60">Auto-rank leads by engagement quality</p>
                  </div>
                </div>
                <Toggle enabled={leadScoring} onChange={setLeadScoring} />
              </div>
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Smart Recommendations</p>
                    <p className="text-xs text-on-surface-variant/60">AI-driven next-best-action for each lead</p>
                  </div>
                </div>
                <Toggle enabled={smartRec} onChange={setSmartRec} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={prev} className="p-3 rounded-xl hover:bg-surface-container-low transition-colors text-on-surface-variant">
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={next}
                className="px-8 py-3 rounded-xl bg-violet-600 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Zap size={16} />
                Enable AI & Continue
              </button>
            </div>
          </div>
        )}

        {/* ═══════ Step 4: Completion ═══════ */}
        {step === 4 && (
          <div className="text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-8 relative">
              <Rocket size={36} className="text-emerald-500" />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-4">
              Your system is ready
            </h1>
            <p className="text-on-surface-variant font-medium text-lg mb-2">
              Everything is configured and ready to go
            </p>
            <p className="text-on-surface-variant/50 text-sm mb-12">
              Your AI engine is active, ad platforms are linked, and your workspace is set up.
            </p>

            {/* Quick summary */}
            <div className="grid grid-cols-3 gap-3 mb-12 max-w-md mx-auto">
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">Platforms</p>
                <p className="text-lg font-black text-on-surface">
                  {(metaConnected ? 1 : 0) + (googleConnected ? 1 : 0)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">Currency</p>
                <p className="text-lg font-black text-on-surface">{selectedCurrency}</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">AI</p>
                <p className="text-lg font-black text-emerald-500">Active</p>
              </div>
            </div>

            <button
              onClick={handleComplete}
              className="px-10 py-4 rounded-2xl bg-on-surface text-surface-container-lowest font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
              Go to Dashboard
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
