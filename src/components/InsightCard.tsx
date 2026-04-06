import { motion } from 'motion/react';
import { AlertTriangle, TrendingUp, Rocket, Info, ArrowRight } from 'lucide-react';

import React from 'react';

interface InsightCardProps {
  key?: React.Key;
  severity: string;
  title: string;
  reasoning: string;
  actionLabel?: string;
  platform?: 'meta' | 'google';
}

const iconMap: Record<string, any> = {
  attention: { icon: AlertTriangle, color: 'text-error', bg: 'bg-error-container/30', label: 'ATTENTION REQUIRED' },
  efficiency: { icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100', label: 'EFFICIENCY WARNING' },
  performance: { icon: Rocket, color: 'text-primary', bg: 'bg-primary-container/30', label: 'PERFORMANCE HIGH' },
};

export default function InsightCard({ severity, title, reasoning, actionLabel, platform }: InsightCardProps) {
  const config = iconMap[severity] || {
    icon: Info,
    color: 'text-on-surface-variant',
    bg: 'bg-surface-variant/30',
    label: 'SYSTEM INSIGHT',
  };
  const Icon = config.icon;

  const getButtonStyles = (sev: string) => {
    switch (sev) {
      case 'attention': return 'text-error border-error/30 hover:bg-error/10';
      case 'efficiency': return 'text-amber-700 border-amber-500/30 hover:bg-amber-500/10';
      case 'performance': return 'text-primary border-primary/30 hover:bg-primary/10';
      default: return 'text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-low';
    }
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -4 }}
      className="panel-surface flex h-full flex-col gap-4 rounded-[2rem] p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${config.bg} ${config.color}`}>
            <Icon size={20} className="drop-shadow-sm" />
          </div>
          <p className={`text-[10px] font-black ${config.color} uppercase tracking-[0.22em]`}>{config.label}</p>
        </div>
        {platform && (
          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
            platform === 'meta' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {platform}
          </span>
        )}
      </div>
      <div className="flex-grow">
        <h3 className="mb-2 font-headline text-xl font-bold leading-tight text-on-surface">{title}</h3>
        <p className="text-sm font-medium leading-relaxed text-on-surface-variant">{reasoning}</p>
      </div>
      
      {actionLabel && (
        <div className="mt-2 flex justify-end">
          <button className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${getButtonStyles(severity)}`}>
            {actionLabel}
            <ArrowRight size={14} className="mt-[1px]" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
