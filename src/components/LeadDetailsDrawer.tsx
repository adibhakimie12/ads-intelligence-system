import React, { useEffect, useMemo, useState } from 'react';
import { LeadData, LeadStatus } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import {
  Calendar,
  CheckCircle2,
  MessageCircle,
  Phone,
  Save,
  Sparkles,
  X,
} from 'lucide-react';

interface LeadDetailsDrawerProps {
  lead: LeadData | null;
  onClose: () => void;
}

const extractTaggedValue = (notes: string | undefined, label: string) => {
  if (!notes) return '';
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = notes.match(new RegExp(`${escapedLabel}:\\s*([^|\\n]+)`, 'i'));
  return match?.[1]?.trim() || '';
};

const upsertTaggedValue = (notes: string, label: string, value: string) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`(?:^|\\n)${escapedLabel}:\\s*([^\\n]+)`, 'i');
  const trimmedValue = value.trim();

  if (matcher.test(notes)) {
    if (!trimmedValue) {
      return notes.replace(matcher, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    return notes.replace(matcher, `${label}: ${trimmedValue}`).trim();
  }

  if (!trimmedValue) {
    return notes.trim();
  }

  return [notes.trim(), `${label}: ${trimmedValue}`].filter(Boolean).join('\n').trim();
};

export default function LeadDetailsDrawer({ lead, onClose }: LeadDetailsDrawerProps) {
  const { updateLead, formatCurrency, getSmartRecommendation } = useDatabase();
  const [leadName, setLeadName] = useState('');
  const [insight, setInsight] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setLeadName(lead.name || '');
    setInsight(lead.insight || '');
    setNotes(lead.notes || '');
    setContactPhone(extractTaggedValue(lead.notes, 'Phone'));
    setContactEmail(extractTaggedValue(lead.notes, 'Email'));
    setStatus(lead.status);
  }, [lead]);

  const whatsappUrl = useMemo(() => {
    if (!contactPhone.trim()) return null;
    return `https://wa.me/${contactPhone.replace(/\D/g, '')}`;
  }, [contactPhone]);

  const telUrl = useMemo(() => {
    if (!contactPhone.trim()) return null;
    return `tel:${contactPhone.trim()}`;
  }, [contactPhone]);

  if (!lead) return null;

  const handleSave = () => {
    setIsSaving(true);
    const nextNotes = upsertTaggedValue(upsertTaggedValue(notes, 'Phone', contactPhone), 'Email', contactEmail);

    updateLead(lead.id, {
      name: leadName.trim() || lead.name,
      insight: insight.trim() || lead.insight,
      notes: nextNotes,
      status,
    });

    setNotes(nextNotes);
    window.setTimeout(() => setIsSaving(false), 700);
  };

  const stageOptions: { id: LeadStatus; label: string }[] = [
    { id: 'new', label: 'New' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'qualified', label: 'Qualified' },
    { id: 'won', label: 'Won' },
    { id: 'lost', label: 'Lost' },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-[760px] overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">Lead Profile</p>
              <h2 className="mt-2 text-2xl font-black text-white">Edit Lead Details</h2>
              <p className="mt-2 text-sm text-slate-300">Update the real name, WhatsApp number, insight, and notes for this lead.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Stage</p>
              <p className="mt-2 text-lg font-black text-white">{status.toUpperCase()}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Campaign</p>
              <p className="mt-2 text-sm font-bold text-white">{lead.campaign}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Value</p>
              <p className="mt-2 text-lg font-black text-white">{formatCurrency(lead.value)}</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Lead Name</span>
              <input
                value={leadName}
                onChange={(event) => setLeadName(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-cyan-400"
                placeholder="Customer name"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">WhatsApp Number</span>
              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-cyan-400"
                placeholder="+60123456789"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Email</span>
              <input
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-cyan-400"
                placeholder="lead@example.com"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Pipeline Stage</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as LeadStatus)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white outline-none transition-colors focus:border-cyan-400"
              >
                {stageOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-5 block space-y-2">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Lead Insight</span>
            <textarea
              value={insight}
              onChange={(event) => setInsight(event.target.value)}
              className="h-28 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium leading-6 text-white outline-none transition-colors focus:border-cyan-400"
              placeholder="Example: High potential lead from a strong WhatsApp campaign."
            />
          </label>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <Sparkles size={16} />
              <p className="text-[11px] font-black uppercase tracking-[0.18em]">Suggested Next Move</p>
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{getSmartRecommendation(lead)}</p>
          </div>

          <label className="mt-5 block space-y-2">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Internal Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="h-36 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium leading-6 text-white outline-none transition-colors focus:border-cyan-400"
              placeholder="Add conversation notes, customer requests, booking details, or follow-up status."
            />
          </label>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-5">
            <button
              onClick={() => {
                if (telUrl) {
                  window.open(telUrl, '_self');
                }
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                telUrl ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Phone size={16} />
              {telUrl ? 'Call Lead' : 'Add Number First'}
            </button>

            <button
              onClick={() => {
                if (whatsappUrl) {
                  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                whatsappUrl ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <MessageCircle size={16} />
              {whatsappUrl ? 'Open WhatsApp' : 'No WhatsApp Number'}
            </button>

            <div className="ml-auto flex items-center gap-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                <Calendar size={14} />
                {lead.date}
              </div>
              <button
                onClick={handleSave}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black ${
                  isSaving ? 'bg-emerald-600 text-white' : 'bg-white text-slate-950'
                }`}
              >
                {isSaving ? <CheckCircle2 size={16} /> : <Save size={16} />}
                {isSaving ? 'Saved' : 'Save Lead'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
