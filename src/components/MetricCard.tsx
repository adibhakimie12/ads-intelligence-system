import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export interface MetricCardProps {
  key?: React.Key;
  label: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  isPrimary?: boolean;
}

export default function MetricCard({ label, value, trend, trendLabel, isPrimary }: MetricCardProps) {
  const isPositive = trend >= 0;
  const TrendIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div className={`group relative overflow-hidden rounded-[2rem] p-7 transition-all duration-300 ${isPrimary ? 'dark-panel text-white' : 'panel-surface'}`}>
      {isPrimary && <div className="absolute right-0 top-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-primary-container/20 blur-3xl pointer-events-none" />}
      <span className={`relative z-10 mb-4 block text-[11px] font-bold uppercase tracking-[0.24em] ${isPrimary ? 'text-white/70' : 'text-on-surface-variant'}`}>{label}</span>
      <span className={`${isPrimary ? 'text-[3.3rem]' : 'text-[2.6rem]'} relative z-10 mb-3 block font-headline font-black leading-none tracking-[-0.04em] ${isPrimary ? 'text-white' : 'text-on-surface'}`}>
        {value}
      </span>
      <div className={`relative z-10 mt-5 flex items-center gap-2 ${isPrimary ? (isPositive ? 'text-emerald-300' : 'text-red-300') : (isPositive ? 'text-emerald-700' : 'text-error')}`}>
        <TrendIcon size={14} strokeWidth={4} />
        <span className="text-xs font-semibold tracking-wide">
          {trendLabel}
        </span>
      </div>
    </div>
  );
}
