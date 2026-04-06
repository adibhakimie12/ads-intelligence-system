import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import LeadCard from '../components/LeadCard';
import LeadDetailsDrawer from '../components/LeadDetailsDrawer';
import { Users, Filter, ArrowUpDown, ChevronRight, AlertCircle, Info, CheckCircle2, Crown, Lock } from 'lucide-react';
import { LeadStatus } from '../types';
import type { PlanTier } from '../App';

interface LeadsPageProps {
  planTier: PlanTier;
  leadUsageCount: number;
  leadLimit: number;
  hasReachedLeadLimit: boolean;
  onUpgradeRequest: () => void;
}

export default function LeadsPage({
  planTier,
  leadUsageCount,
  leadLimit,
  hasReachedLeadLimit,
  onUpgradeRequest,
}: LeadsPageProps) {
  const { leads, formatCurrency, pipelineAlerts } = useDatabase();
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);

  const selectedLead = React.useMemo(() => 
    leads.find(l => l.id === selectedLeadId) || null,
  [leads, selectedLeadId]);

  const pipelineStages: { id: LeadStatus; label: string; color: string }[] = [
    { id: 'new', label: 'New Leads', color: 'bg-blue-500' },
    { id: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
    { id: 'qualified', label: 'Qualified', color: 'bg-indigo-500' },
    { id: 'won', label: 'Closed (Won)', color: 'bg-emerald-500' },
    { id: 'lost', label: 'Lost', color: 'bg-red-500' },
  ];

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status);
  };

  const getColumnValue = (status: LeadStatus) => {
    return leads
      .filter(lead => lead.status === status)
      .reduce((acc, lead) => acc + lead.value, 0);
  };

  const usagePercentage = planTier === 'pro' ? 100 : Math.min((leadUsageCount / leadLimit) * 100, 100);

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-32 lg:px-8">
      {/* Page Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-1">
            <Users size={14} />
            Lead Management
          </div>
          <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">
            Sales Pipeline
          </h1>
          <p className="text-on-surface-variant font-medium mt-2">
            Track, qualify, and convert your leads efficiently.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
            <Filter size={18} />
            Filter
          </button>
          <button className="flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
            <ArrowUpDown size={18} />
            Sort By Value
          </button>
        </div>
      </div>

      <div className="panel-surface mb-10 rounded-[2rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                planTier === 'pro'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {planTier === 'pro' ? 'Pro Plan' : 'Free Plan'}
              </span>
              {hasReachedLeadLimit && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">
                  Limit Reached
                </span>
              )}
            </div>
            <h2 className="mt-4 text-2xl font-black font-headline text-on-surface">
              {hasReachedLeadLimit ? "You've reached your lead limit" : 'Lead usage and access'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-on-surface-variant">
              {hasReachedLeadLimit
                ? 'Your workspace is still visible, but adding new leads and advanced workflow actions are now reserved for Pro.'
                : planTier === 'pro'
                ? 'Your Pro workspace has unlimited lead capacity, AI recommendations, automation rules, and advanced analytics unlocked.'
                : 'Free includes up to 50 leads and essential pipeline visibility. Upgrade when you need more scale and automation.'}
            </p>
          </div>

          {planTier === 'free' && (
            <button
              onClick={onUpgradeRequest}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-black/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Crown size={16} />
              Upgrade Now
            </button>
          )}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-on-surface-variant">Lead capacity</span>
            <span className="text-on-surface">
              {planTier === 'pro' ? `${leadUsageCount} leads managed` : `${leadUsageCount} / ${leadLimit}`}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                hasReachedLeadLimit ? 'bg-amber-500' : planTier === 'pro' ? 'bg-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Global Pipeline Alerts */}
      {pipelineAlerts.length > 0 && (
        <div className="mb-10 space-y-3">
          {pipelineAlerts.map((alert) => (
            <div 
              key={alert.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-500 ${
                alert.severity === 'warning' 
                  ? 'bg-amber-50 border-amber-200 text-amber-800' 
                  : alert.severity === 'info'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className={`p-2 rounded-xl ${
                alert.severity === 'warning' ? 'bg-amber-100' : alert.severity === 'info' ? 'bg-blue-100' : 'bg-emerald-100'
              }`}>
                {alert.severity === 'warning' ? <AlertCircle size={18} /> : alert.severity === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <p className="text-sm font-bold tracking-tight">{alert.message}</p>
              <button className="ml-auto p-1.5 hover:bg-black/5 rounded-lg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Board */}
      <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {pipelineStages.map((stage) => {
          const stageLeads = getLeadsByStatus(stage.id);
          const stageValue = getColumnValue(stage.id);
          
          return (
            <div 
              key={stage.id} 
              className="panel-surface flex-shrink-0 w-[320px] rounded-[2.5rem] p-6"
            >
              {/* Column Header */}
              <div className="mb-6 px-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shadow-sm shadow-${stage.color}/20`} />
                    <h3 className="text-sm font-black uppercase tracking-widest text-on-surface">{stage.label}</h3>
                  </div>
                  <span className="text-[10px] font-black bg-surface-container-high text-on-surface-variant px-2.5 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-on-surface-variant">Worth:</span>
                  <span className="text-lg font-black text-on-surface">{formatCurrency(stageValue)}</span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-4 min-h-[500px]">
                {stageLeads.length > 0 ? (
                  stageLeads.map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      onSelect={(l) => setSelectedLeadId(l.id)} 
                    />
                  ))
                ) : (
                  <div className="h-40 rounded-3xl border-2 border-dashed border-outline-variant/10 flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-widest italic">No leads in stage</p>
                  </div>
                )}
                      </div>

              {/* Quick Add (Bottom) */}
              {hasReachedLeadLimit ? (
                <button
                  onClick={onUpgradeRequest}
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 py-4 text-amber-700 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <Lock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Upgrade to Add More Leads</span>
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                </button>
              ) : (
                <button className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-variant/20 py-4 text-on-surface-variant/40 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
                  <span className="text-[10px] font-black uppercase tracking-widest">Add Lead</span>
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Pipeline Metrics */}
      <div className="panel-surface mt-16 rounded-[3rem] p-10">
        <h4 className="text-xl font-bold font-headline text-on-surface mb-8 px-2 flex items-center gap-3">
          Pipeline Intelligence
          <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">Real-time Data</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="px-4 border-r border-outline-variant/10 last:border-0">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Total Pipeline Worth</p>
            <p className="text-3xl font-black font-headline text-on-surface">
              {formatCurrency(leads.reduce((acc, l) => acc + l.value, 0))}
            </p>
          </div>
          <div className="px-4 border-r border-outline-variant/10 last:border-0">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Lead to Sale Efficiency</p>
            <p className="text-3xl font-black font-headline text-emerald-600">32.4%</p>
          </div>
          <div className="px-4 border-r border-outline-variant/10 last:border-0">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Average Deal Size</p>
            <p className="text-3xl font-black font-headline text-on-surface">{formatCurrency(845)}</p>
          </div>
          <div className="px-4 border-r border-outline-variant/10 last:border-0">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Velocity Index</p>
            <p className="text-3xl font-black font-headline text-primary">High</p>
          </div>
        </div>
      </div>

      {/* Lead Management Drawer */}
      <LeadDetailsDrawer 
        lead={selectedLead} 
        onClose={() => setSelectedLeadId(null)} 
      />
    </main>
  );
}
