import React, { useState, useEffect } from 'react';
import { LeadData, LeadStatus } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { requestLeadRecommendation } from '../services/leadAi';
import { 
  X, 
  Trash2, 
  Save, 
  ExternalLink, 
  DollarSign, 
  User, 
  Building2, 
  Calendar,
  Zap,
  Globe,
  Phone,
  MessageCircle,
  Gift,
  BarChart3,
  Target,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface LeadDetailsDrawerProps {
  lead: LeadData | null;
  onClose: () => void;
}

export default function LeadDetailsDrawer({ lead, onClose }: LeadDetailsDrawerProps) {
  const { updateLead, formatCurrency, getSmartRecommendation, aiAssistantEnabled, leadGenerationEnabled } = useDatabase();
  const { currentWorkspace } = useWorkspace();
  const [notes, setNotes] = useState(lead?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAiRecommendation, setIsLoadingAiRecommendation] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<{ provider: 'openai' | 'google' | 'rules'; summary: string; recommendation: string } | null>(null);

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || '');
      setAiRecommendation(null);
    }
  }, [lead]);

  if (!lead) return null;

  const handleSaveNotes = () => {
    setIsSaving(true);
    updateLead(lead.id, { notes });
    setTimeout(() => setIsSaving(false), 800);
  };

  const updateStatus = (newStatus: LeadStatus) => {
    updateLead(lead.id, { status: newStatus });
  };

  const loadAiRecommendation = async () => {
    if (!lead) return;

    if (!aiAssistantEnabled || !leadGenerationEnabled) {
      setAiRecommendation({
        provider: 'rules',
        summary: !aiAssistantEnabled
          ? 'AI Assistant is disabled in Settings, so the lead drawer is using the built-in recommendation.'
          : 'Lead Generation Support is disabled in Settings, so the lead drawer is using the built-in recommendation.',
        recommendation: getSmartRecommendation(lead),
      });
      return;
    }

    const workspaceId = currentWorkspace?.id;
    const storedKeys = workspaceId ? localStorage.getItem(`ads-intel-settings-api-keys:${workspaceId}`) : null;
    let openAiKey = '';
    let googleAiKey = '';

    if (storedKeys) {
      try {
        const parsed = JSON.parse(storedKeys) as { openAiKey?: string; googleAiKey?: string };
        openAiKey = parsed.openAiKey?.trim() || '';
        googleAiKey = parsed.googleAiKey?.trim() || '';
      } catch {
        openAiKey = '';
        googleAiKey = '';
      }
    }

    setIsLoadingAiRecommendation(true);
    const result = await requestLeadRecommendation({ lead, openAiKey, googleAiKey });
    setIsLoadingAiRecommendation(false);

    if (result.ok) {
      setAiRecommendation({
        provider: result.provider,
        summary: result.summary,
        recommendation: result.recommendation,
      });
      return;
    }

    setAiRecommendation({
      provider: 'rules',
      summary: lead.insight || 'Using the built-in lead recommendation.',
      recommendation: getSmartRecommendation(lead),
    });
  };

  useEffect(() => {
    if (!lead) return;
    void loadAiRecommendation();
  }, [lead?.id, aiAssistantEnabled, leadGenerationEnabled]);

  const pipelineStages: { id: LeadStatus; label: string; color: string }[] = [
    { id: 'new', label: 'New', color: 'bg-blue-500' },
    { id: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
    { id: 'qualified', label: 'Qualified', color: 'bg-indigo-500' },
    { id: 'won', label: 'Won', color: 'bg-emerald-500' },
    { id: 'lost', label: 'Lost', color: 'bg-red-500' },
  ];

  return (
    <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${lead ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer */}
      <div className={`absolute top-0 right-0 h-full w-full max-w-[500px] panel-surface shadow-2xl transition-transform duration-500 ease-out transform ${lead ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surface-container-low rounded-xl transition-colors"
            >
              <X size={24} className="text-on-surface-variant" />
            </button>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-colors">
                <Trash2 size={20} />
              </button>
              <button className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                <ExternalLink size={18} />
                Open CRM Profile
              </button>
            </div>
          </div>

          {/* Lead Header Info */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                lead.source === 'meta' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {lead.source} Ads Lead
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-outline-variant/30" />
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                <Calendar size={12} />
                Added {lead.date}
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-outline-variant/30" />
              <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                lead.quality_score === 'high' ? 'bg-emerald-100 text-emerald-700' :
                lead.quality_score === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {lead.quality_score} Quality
              </div>
            </div>
            <h2 className="text-4xl font-black font-headline text-on-surface mb-2">{lead.name}</h2>
            <p className="text-on-surface-variant font-medium flex items-center gap-2 italic">
              <Zap size={16} className="text-primary" />
              {lead.insight}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="rounded-[2rem] border border-outline-variant/5 bg-surface-container-low p-5">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Deal Value</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <DollarSign size={18} />
                </div>
                <span className="text-2xl font-black text-on-surface">{formatCurrency(lead.value)}</span>
              </div>
            </div>
            <div className="rounded-[2rem] border border-outline-variant/5 bg-surface-container-low p-5">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Campaign</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                  <Globe size={18} />
                </div>
                <span className="text-sm font-bold text-on-surface truncate">{lead.campaign}</span>
              </div>
            </div>
          </div>

          {/* Direct Engagement Actions */}
          <div className="mb-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4 px-2">Direct Engagement</h3>
            <div className="grid grid-cols-1 gap-3">
              <button className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                <Phone size={18} />
                Call Lead Now
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button className="py-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-100 transition-all active:scale-95">
                  <MessageCircle size={18} />
                  WhatsApp
                </button>
                <button className="py-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-100 transition-all active:scale-95">
                  <Gift size={18} />
                  Send Offer
                </button>
              </div>
            </div>
          </div>

          {/* Ad Performance Insight Dashboard */}
          <div className="mb-10 p-6 rounded-[2.5rem] bg-surface-container-low border border-outline-variant/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 size={48} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
              <Target size={16} />
              Ad Performance Insight
            </h3>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant font-bold flex items-center gap-2">
                  <Layers size={14} className="text-primary/40" />
                  Campaign
                </span>
                <span className="text-on-surface font-black text-right truncate max-w-[200px]">{lead.campaign}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant font-bold flex items-center gap-2">
                  <Target size={14} className="text-primary/40" />
                  Creative
                </span>
                <span className="text-on-surface font-black truncate max-w-[200px]">{lead.creative_name} ({lead.creative_type})</span>
              </div>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/10 text-center">
                <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">CTR</p>
                <p className="text-sm font-black text-on-surface">{lead.ctr}%</p>
              </div>
              <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/10 text-center">
                <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">CPL</p>
                <p className="text-sm font-black text-emerald-500">{formatCurrency(lead.cpl)}</p>
              </div>
              <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/10 text-center">
                <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Conv.</p>
                <p className="text-sm font-black text-primary">{lead.conversionRate}%</p>
              </div>
            </div>

            {/* Quality Summary Row */}
            <div className="mt-6 pt-4 border-t border-outline-variant/5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Lead Source Quality</span>
              <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                lead.quality_score === 'high' ? 'bg-emerald-500/10 text-emerald-600' :
                lead.quality_score === 'medium' ? 'bg-amber-500/10 text-amber-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                {lead.quality_score}
              </div>
            </div>
          </div>

          {/* Status Progression */}
          <div className="mb-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4 px-2">Pipeline Stage</h3>
            <div className="flex flex-wrap gap-2">
              {pipelineStages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => updateStatus(stage.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    lead.status === stage.id
                      ? `bg-on-surface text-surface-container-lowest border-on-surface shadow-lg`
                      : `bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:border-on-surface-variant/40`
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sales Notes Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Sales Notes</h3>
              <button 
                onClick={handleSaveNotes}
                disabled={isSaving}
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  isSaving ? 'text-emerald-500' : 'text-primary hover:scale-105'
                }`}
              >
                {isSaving ? <CheckCircle2 size={14} /> : <Save size={14} />}
                {isSaving ? 'Saved' : 'Save Notes'}
              </button>
            </div>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-48 bg-surface-container-low rounded-3xl border border-outline-variant/10 p-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none leading-relaxed text-on-surface"
              placeholder="Enter internal sales notes, follow-up history, or client requirements..."
            />
          </div>

          {/* Recommended Action Box */}
          <div className="dark-panel relative overflow-hidden rounded-[2.5rem] p-8 group text-white">
             <div className="absolute top-0 right-0 h-32 w-32 -mr-16 -mt-16 rounded-full bg-primary-container/10 blur-2xl transition-transform duration-700 group-hover:scale-150" />
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-3">
                 <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-container text-primary shadow-lg shadow-black/20">
                   <Zap size={18} />
                 </div>
                 <h4 className="text-xs font-black uppercase tracking-widest text-primary-container">Intelligence Recommendation</h4>
               </div>
               <p className="mb-3 text-lg font-bold text-white">
                 {isLoadingAiRecommendation ? 'Generating recommendation...' : aiRecommendation?.recommendation || getSmartRecommendation(lead)}
               </p>
               <p className="mb-5 text-sm text-white/70">
                 {aiRecommendation?.summary || 'Using lead value, source quality, and conversion signals to decide the best next step.'}
               </p>
               <div className="mb-5 inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary-container">
                 {aiRecommendation?.provider === 'openai' ? 'OpenAI Recommendation' : aiRecommendation?.provider === 'google' ? 'Google AI Recommendation' : 'Built-in Recommendation'}
               </div>
               <button 
                  onClick={() => {
                    const nextStageMap: Record<LeadStatus, LeadStatus> = {
                      'new': 'contacted',
                      'contacted': 'qualified',
                      'qualified': 'won',
                      'won': 'won',
                      'lost': 'lost'
                    };
                    updateStatus(nextStageMap[lead.status]);
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary-container py-4 text-xs font-black uppercase tracking-[0.25em] text-primary transition-all hover:shadow-xl active:scale-[0.98]"
                >
                 Execute Next Step
                 <ChevronRight size={18} />
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
