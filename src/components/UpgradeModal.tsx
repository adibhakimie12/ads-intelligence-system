import React from 'react';
import {
  X,
  Check,
  Crown,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Workflow,
  Users,
} from 'lucide-react';
import type { PlanTier, UpgradeTrigger } from '../App';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: PlanTier) => void | Promise<void>;
  trigger?: UpgradeTrigger;
  planTier: PlanTier;
}

type FeatureRow = {
  icon: typeof Users;
  label: string;
  description: string;
  free: string | boolean;
  pro: string | boolean;
};

const featureRows: FeatureRow[] = [
  { icon: Users, label: 'Lead Capacity', description: 'How many leads the workspace can manage', free: '50 leads', pro: 'Unlimited leads' },
  { icon: Sparkles, label: 'AI Recommendations', description: 'Smart next-best-action and guidance', free: false, pro: true },
  { icon: Workflow, label: 'Automation Rules', description: 'Auto-trigger actions from ad performance', free: false, pro: true },
  { icon: BarChart3, label: 'Advanced Analytics', description: 'Deeper performance and attribution visibility', free: false, pro: true },
  { icon: Target, label: 'Creative Scoring', description: 'Creative review and winning-ads analysis', free: 'Basic', pro: 'Full scoring' },
  { icon: Zap, label: 'Priority Support', description: 'Faster setup and troubleshooting help', free: false, pro: true },
];

const renderPlanValue = (value: string | boolean) => {
  if (typeof value === 'string') {
    return <span className="text-sm font-bold text-slate-800">{value}</span>;
  }

  return value ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
      <Check size={14} />
    </span>
  ) : (
    <span className="text-base font-black text-slate-300">x</span>
  );
};

export default function UpgradeModal({
  isOpen,
  onClose,
  onSelectPlan,
  trigger,
  planTier,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const subcopy = trigger === 'lead_limit'
    ? "You've reached the Free lead limit. Move to Pro to keep scaling without blocking your sales flow."
    : trigger === 'locked_feature'
      ? 'This feature needs Pro because it depends on premium automation, AI workflows, or deeper reporting.'
      : 'Compare the Free and Pro plans, then choose the right workspace plan for your team.';

  const isFree = planTier === 'free';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 mx-4 w-full max-w-[760px] overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-600 to-indigo-600 px-8 pb-10 pt-8 text-white">
          <div className="absolute right-0 top-0 h-44 w-44 -translate-y-10 translate-x-10 rounded-full bg-white/10 blur-3xl" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>

          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <Crown size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">Plan Comparison</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Free vs Pro</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium text-white/75">{subcopy}</p>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`rounded-[1.75rem] border p-5 ${isFree ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 bg-slate-50/70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Free Plan</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">RM 0</h3>
                  <p className="text-sm font-medium text-slate-500">Good for setup and lightweight testing</p>
                </div>
                {isFree && (
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    Current
                  </span>
                )}
              </div>

              <button
                onClick={() => void onSelectPlan('free')}
                className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${
                  isFree
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isFree ? 'Current Plan' : 'Switch To Free'}
              </button>
            </div>

            <div className={`rounded-[1.75rem] border p-5 ${!isFree ? 'border-indigo-500 bg-indigo-50/60 shadow-sm' : 'border-slate-200 bg-slate-50/70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">Pro Plan</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">RM 99<span className="ml-1 text-base font-bold text-slate-500">/month</span></h3>
                  <p className="text-sm font-medium text-slate-500">For scaling with AI, automation, and deeper reporting</p>
                </div>
                {!isFree && (
                  <span className="rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    Current
                  </span>
                )}
              </div>

              <button
                onClick={() => void onSelectPlan('pro')}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${
                  !isFree
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-r from-primary to-indigo-600 text-white hover:brightness-110'
                }`}
              >
                <Crown size={16} />
                {!isFree ? 'Manage Pro Plan' : 'Upgrade To Pro'}
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200">
            <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Feature</div>
              <div className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Free</div>
              <div className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-indigo-500">Pro</div>
            </div>

            <div className="divide-y divide-slate-100">
              {featureRows.map((feature) => (
                <div key={feature.label} className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center gap-4 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                      <feature.icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{feature.label}</p>
                      <p className="text-[11px] text-slate-500">{feature.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    {renderPlanValue(feature.free)}
                  </div>
                  <div className="flex items-center justify-center">
                    {renderPlanValue(feature.pro)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
