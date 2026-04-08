import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LeadData, LeadStatus } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle,
  DollarSign,
  MessageCircleMore,
  MoreHorizontal,
  Phone,
  Send,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface LeadCardProps {
  lead: LeadData;
  onSelect: (lead: LeadData) => void;
  key?: any;
}

export default function LeadCard({ lead, onSelect }: LeadCardProps) {
  const { formatCurrency, updateLead } = useDatabase();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isProxyMessagingLead = lead.hook_tag === 'meta_messaging_conversation_started';
  const hasPhone = /Phone:\s*[^\n]+/i.test(lead.notes || '');

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 192,
      });
    }
  };

  useEffect(() => {
    if (isMenuOpen) {
      const handleScrollResize = () => {
        setIsMenuOpen(false);
      };

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const clickedButton = buttonRef.current?.contains(target);
        const clickedMenu = menuRef.current?.contains(target);

        if (!clickedButton && !clickedMenu) {
          setIsMenuOpen(false);
        }
      };

      window.addEventListener('scroll', handleScrollResize, true);
      window.addEventListener('resize', handleScrollResize);
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        window.removeEventListener('scroll', handleScrollResize, true);
        window.removeEventListener('resize', handleScrollResize);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMenuOpen]);

  const getScoreLabel = (score: string) => {
    switch (score) {
      case 'high':
        return 'High Potential';
      case 'medium':
        return 'Warm Lead';
      case 'low':
        return 'Low Intent';
      default:
        return 'Warm Lead';
    }
  };

  const getPotentialStyles = (score: string) => {
    switch (score) {
      case 'high':
        return 'border-emerald-500/20 bg-emerald-500/12 text-emerald-700';
      case 'medium':
        return 'border-amber-500/20 bg-amber-500/12 text-amber-700';
      case 'low':
        return 'border-slate-500/20 bg-slate-500/10 text-slate-600';
      default:
        return 'border-slate-500/20 bg-slate-500/10 text-slate-600';
    }
  };

  const getPotentialSummary = () => {
    if (isProxyMessagingLead && hasPhone) return 'Matched to a real WhatsApp chat and ready for follow-up.';
    if (isProxyMessagingLead) return 'Placeholder from Meta conversation-start data. Match this with the WhatsApp chat.';
    if (lead.score === 'high') return 'Strong buying signal. Prioritize fast reply.';
    if (lead.score === 'low') return 'Lower urgency. Keep follow-up light and structured.';
    return 'Fresh inbound interest. Qualify quickly while intent is warm.';
  };

  const getCompactInsight = () => {
    if (lead.insight?.trim()) return lead.insight.trim();
    if (isProxyMessagingLead) return 'Meta detected a new WhatsApp conversation start.';
    return 'Inbound paid lead ready for manual follow-up.';
  };

  const getPrimaryAction = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return { label: 'Contact Lead', icon: <Send size={14} />, next: 'contacted' };
      case 'contacted':
        return { label: 'Qualify Lead', icon: <CheckCircle size={14} />, next: 'qualified' };
      case 'qualified':
        return { label: 'Close Deal', icon: <TrendingUp size={14} />, next: 'won' };
      default:
        return null;
    }
  };

  const action = getPrimaryAction(lead.status);

  const handleStatusUpdate = (e: React.MouseEvent, newStatus: LeadStatus) => {
    e.stopPropagation();
    updateLead(lead.id, { status: newStatus });
    setIsMenuOpen(false);
  };

  const statusOptions: { id: LeadStatus; label: string }[] = [
    { id: 'new', label: 'New Lead' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'qualified', label: 'Qualified' },
    { id: 'won', label: 'Closed (Won)' },
    { id: 'lost', label: 'Lost' },
  ];

  return (
    <div
      onClick={() => onSelect(lead)}
      className="panel-surface group relative cursor-pointer overflow-hidden rounded-[1.6rem] p-4 transition-all hover:border-primary-container/30 hover:shadow-xl"
    >
      <div
        className={`absolute right-0 top-0 h-12 w-12 -mr-6 -mt-6 rotate-45 ${
          lead.source === 'meta' ? 'bg-blue-500/10' : 'bg-orange-500/10'
        }`}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-sm font-bold text-on-surface transition-colors group-hover:text-primary">{lead.name}</h4>
              <span
                title={`Lead Score: ${lead.score}`}
                className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black tracking-[0.14em] ${getPotentialStyles(lead.score)}`}
              >
                {getScoreLabel(lead.score)}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                lead.source === 'meta' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {lead.source}
              </span>
              {isProxyMessagingLead && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
                  Proxy Lead
                </span>
              )}
              {hasPhone && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                  <Phone size={10} />
                  Number Added
                </span>
              )}
            </div>

            <p className="mt-2 truncate text-[11px] font-semibold text-on-surface-variant">{lead.campaign}</p>

            <div className="mt-3 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                {isProxyMessagingLead ? <MessageCircleMore size={12} /> : <Zap size={12} />}
                Lead Insight
              </div>
              <p className="mt-1 text-[11px] font-bold leading-5 text-on-surface">{getPotentialSummary()}</p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-on-surface-variant">{getCompactInsight()}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
              <span>{lead.creative_type === 'video' ? 'Video' : 'Image'}</span>
              <span>{lead.quality_score} quality</span>
              {lead.conversionRate >= 12 ? <span className="text-emerald-600">Top performer</span> : null}
              {lead.conversionRate > 0 && lead.conversionRate < 3 ? <span className="text-amber-600">Needs follow-up</span> : null}
            </div>
          </div>

          <div className="relative ml-2 flex shrink-0 items-center gap-2">
            <div
              title={`Quality Score: ${lead.quality_score}`}
              className={`h-2 w-2 rounded-full ${
                lead.quality_score === 'high'
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : lead.quality_score === 'medium'
                  ? 'bg-amber-500'
                  : 'bg-slate-300'
              }`}
            />
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isMenuOpen) {
                    updateMenuPosition();
                  }
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high"
              >
                <MoreHorizontal size={16} />
              </button>

              {isMenuOpen &&
                createPortal(
                  <div
                    ref={menuRef}
                    style={{
                      position: 'fixed',
                      top: menuPosition.top - window.scrollY,
                      left: menuPosition.left - window.scrollX,
                      zIndex: 9999,
                    }}
                    className="origin-top-right animate-in zoom-in-95 overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest py-2 shadow-[0_20px_50px_rgba(0,0,0,0.2)] duration-150 fade-in w-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="border-b border-outline-variant/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                      Move To Status
                    </p>
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={(e) => handleStatusUpdate(e, opt.id as LeadStatus)}
                        className={`group/opt flex w-full items-center justify-between px-4 py-2 text-left text-xs font-bold transition-colors ${
                          lead.status === opt.id ? 'text-primary' : 'text-on-surface-variant hover:bg-primary/5 hover:text-primary'
                        }`}
                      >
                        {opt.label}
                        {lead.status === opt.id && <ArrowRightLeft size={12} />}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-outline-variant/5 pt-3">
          <div className="flex items-center gap-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/5 text-primary">
              <DollarSign size={14} />
            </div>
            <span className="text-sm font-black text-on-surface">{formatCurrency(lead.value)}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
            <Calendar size={12} />
            {lead.date.split('-').slice(1).reverse().join('/')}
          </div>
        </div>

        {action && (
          <div className="mt-3 border-t border-dashed border-outline-variant/10 pt-3">
            <button
              onClick={(e) => handleStatusUpdate(e, action.next as LeadStatus)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-on-surface py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-surface-container-lowest transition-all hover:bg-primary active:scale-95"
            >
              {action.icon}
              {action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
