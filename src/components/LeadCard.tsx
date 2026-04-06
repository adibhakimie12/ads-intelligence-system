import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LeadData, LeadStatus } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { 
  MoreHorizontal, 
  Calendar, 
  DollarSign, 
  Zap, 
  AlertCircle, 
  Send, 
  CheckCircle, 
  TrendingUp,
  ArrowRightLeft
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

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position below the button, aligned to the right
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 192 // 192 is the width of the menu (w-48)
      });
    }
  };

  useEffect(() => {
    if (isMenuOpen) {
      const handleScrollResize = () => {
        setIsMenuOpen(false);
      };

      const handleClickOutside = (event: MouseEvent) => {
        if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
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

  const getScoreIcon = (score: string) => {
    switch (score) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '🧊';
      default: return '⚡';
    }
  };

  const getPrimaryAction = (status: LeadStatus) => {
    switch (status) {
      case 'new': return { label: 'Contact Lead', icon: <Send size={14} />, next: 'contacted' };
      case 'contacted': return { label: 'Qualify Lead', icon: <CheckCircle size={14} />, next: 'qualified' };
      case 'qualified': return { label: 'Close Deal', icon: <TrendingUp size={14} />, next: 'won' };
      default: return null;
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
      className="panel-surface group relative cursor-pointer overflow-hidden rounded-[2rem] p-5 transition-all hover:border-primary-container/30 hover:shadow-xl"
    >
      {/* Platform Indicator */}
      <div className={`absolute top-0 right-0 w-12 h-12 -mr-6 -mt-6 rotate-45 ${
        lead.source === 'meta' ? 'bg-blue-500/10' : 'bg-orange-500/10'
      }`} />
      
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors truncate">{lead.name}</h4>
            <span title={`Lead Score: ${lead.score}`} className="text-sm shrink-0">{getScoreIcon(lead.score)}</span>
          </div>
          <div className="flex flex-col mt-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                lead.source === 'meta' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {lead.source}
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium truncate max-w-[100px]">
                {lead.campaign}
              </span>
            </div>
            
            {/* Creative Attribution Label */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest flex items-center gap-1">
                {lead.creative_type === 'video' ? 'VIDEO' : 'IMAGE'}
                <span className="w-0.5 h-0.5 rounded-full bg-outline-variant/30" />
                <span className="text-primary/60">{lead.creative_name}</span>
                {lead.conversionRate >= 12 && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-outline-variant/30" />
                    <span className="text-emerald-500 font-black animate-pulse">🔥 TOP PERFORMER</span>
                  </>
                )}
                {lead.conversionRate < 3 && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-outline-variant/30" />
                    <span className="text-amber-500 font-black tracking-tight">⚠️ LOW CONVERSION</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-[10px] text-primary/70 font-bold italic mt-1.5 flex items-center gap-1">
              <Zap size={10} className="fill-primary/20" />
              {lead.insight}
            </p>
          </div>
        </div>
        
        {/* Quality Indicator + Action Menu */}
        <div className="flex items-center gap-2 relative shrink-0 ml-2">
          <div 
            title={`Quality Score: ${lead.quality_score}`}
            className={`w-2 h-2 rounded-full ${
              lead.quality_score === 'high' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
              lead.quality_score === 'medium' ? 'bg-amber-500' :
              'bg-slate-300'
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
            className="p-1 hover:bg-surface-container-high rounded-md text-on-surface-variant transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
          
          {isMenuOpen && createPortal(
            <div 
              style={{ 
                position: 'fixed', 
                top: menuPosition.top - window.scrollY, 
                left: menuPosition.left - window.scrollX,
                zIndex: 9999 
              }}
              className="w-48 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-4 py-2 text-[9px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/5">Move To Status</p>
              {statusOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={(e) => handleStatusUpdate(e, opt.id as LeadStatus)}
                  className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between group/opt ${
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

    <div className="flex items-center justify-between mt-6 pt-4 border-t border-outline-variant/5">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-primary/5 flex items-center justify-center text-primary">
            <DollarSign size={14} />
          </div>
          <span className="text-sm font-black text-on-surface">
            {formatCurrency(lead.value)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">
          <Calendar size={12} />
          {lead.date.split('-').slice(1).reverse().join('/')}
        </div>
      </div>

      {/* Primary Context Action Button */}
      {action && (
        <div className="mt-4 pt-4 border-t border-dashed border-outline-variant/10">
          <button 
            onClick={(e) => handleStatusUpdate(e, action.next as LeadStatus)}
            className="w-full py-2.5 rounded-xl bg-on-surface text-surface-container-lowest text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-primary transition-all active:scale-95"
          >
            {action.icon}
            {action.label}
          </button>
        </div>
      )}

    </div>
  );
}
