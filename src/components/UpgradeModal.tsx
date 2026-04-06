import React from 'react';
import {
  X,
  Check,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Workflow,
  Users,
  Crown
} from 'lucide-react';
import type { PlanTier, UpgradeTrigger } from '../App';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  trigger?: UpgradeTrigger;
  planTier: PlanTier;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  onUpgrade,
  trigger,
  planTier,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const proFeatures = [
    { icon: Users, label: 'Unlimited Leads', desc: 'No cap on pipeline size' },
    { icon: Zap, label: 'AI Recommendations', desc: 'Smart next-best-action engine' },
    { icon: Workflow, label: 'Automation Rules', desc: 'Auto-trigger based on ad performance' },
    { icon: BarChart3, label: 'Advanced Analytics', desc: 'Full attribution & campaign insights' },
    { icon: Target, label: 'Creative Scoring', desc: 'Hook & fatigue analysis per asset' },
    { icon: Sparkles, label: 'Priority Support', desc: 'Dedicated onboarding & help' },
  ];

  const subcopy = trigger === 'lead_limit'
    ? "You've reached your lead limit. Upgrade to keep scaling without interrupting your sales flow."
    : trigger === 'locked_feature'
    ? 'This feature is available on Pro, where AI workflows and deeper analytics are fully unlocked.'
    : 'Move from the Free plan to a more capable workspace with automation, AI recommendations, and premium reporting.';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[480px] mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-indigo-600 px-8 pt-8 pb-10 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 -mr-16 -mt-16 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 -ml-8 -mb-8 bg-white/5 rounded-full blur-2xl" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Crown size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Pro Plan</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-2">Upgrade to Pro</h2>
            <p className="text-white/70 text-sm font-medium">{subcopy}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Current Plan</p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {planTier === 'free' ? 'Free Plan' : 'Pro Plan Active'}
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                RM 299/month
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="space-y-3 mb-8">
            {proFeatures.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                  <f.icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">{f.label}</p>
                  <p className="text-[11px] text-slate-400">{f.desc}</p>
                </div>
                <Check size={16} className="text-emerald-500 ml-auto shrink-0" />
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-slate-50 rounded-2xl p-5 mb-6 text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-extrabold text-slate-900">RM 299</span>
              <span className="text-sm text-slate-400 font-medium">/month</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Cancel anytime • 14-day money-back guarantee</p>
          </div>

          {/* CTA */}
          <button
            onClick={onUpgrade}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Crown size={18} />
            {planTier === 'pro' ? 'Manage Pro Plan' : 'Upgrade Now'}
          </button>

          {/* Compare link */}
          <p className="text-center mt-4">
            <button className="text-xs text-slate-400 hover:text-primary font-medium transition-colors">
              Compare Free vs Pro plans →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
