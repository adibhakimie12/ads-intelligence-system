import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Sparkles, Trophy, ZapOff, MousePointer2, Filter, Plus, FileDown, Rocket } from 'lucide-react';

const CREATIVE_SUMMARY = [
  {
    id: 1,
    title: 'Top Performer',
    description: 'High engagement creatives performing well',
    icon: Trophy,
    color: 'text-primary',
    bg: 'bg-primary/10'
  },
  {
    id: 2,
    title: 'Creative Fatigue',
    description: 'Some creatives showing performance drop',
    icon: ZapOff,
    color: 'text-orange-600',
    bg: 'bg-orange-100'
  },
  {
    id: 3,
    title: 'Weak Hooks',
    description: 'Low engagement in first seconds',
    icon: MousePointer2,
    color: 'text-amber-600',
    bg: 'bg-amber-100'
  }
];

const AIProgressBar = ({ label, value }: { label: string, value: number }) => {
  const isStrong = value >= 70;
  return (
    <div className="flex flex-col gap-1.5 mb-2">
      <div className="flex justify-between text-[11px] tracking-widest uppercase font-bold">
        <span className="text-on-surface-variant">{label}</span>
        <span className={isStrong ? 'text-blue-600' : 'text-orange-500'}>{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-[800ms] ease-out rounded-full ${isStrong ? 'bg-blue-600' : 'bg-orange-500'}`} 
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  );
};

export default function CreativesPage() {
  const { creatives } = useDatabase();
  const sortedCreatives = [...creatives].sort((a, b) => {
    const scoreA = a.hook_strength + a.message_clarity + a.cta_presence;
    const scoreB = b.hook_strength + b.message_clarity + b.cta_presence;
    return scoreB - scoreA;
  });

  return (
    <main className="mx-auto max-w-[1360px] px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Creative Intelligence</p>
          <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">
            Creatives Library
          </h1>
          <p className="mt-3 text-sm font-medium text-on-surface-variant">
            Analyze and optimize your top performing visual assets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
            <Filter size={18} />
            Filter
          </button>
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary/90">
            <Plus size={18} />
            Upload Creative
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {CREATIVE_SUMMARY.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="panel-surface flex items-start gap-4 rounded-[2rem] p-6 transition-shadow group hover:shadow-md">
              <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-on-surface mb-1">{item.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {sortedCreatives.map((creative) => (
          <div key={creative.id} className="panel-surface flex flex-col overflow-hidden rounded-[2rem]">
            <div className="relative aspect-[4/5] bg-surface-container-low overflow-hidden">
              <img
                src={creative.imageUrl || 'https://via.placeholder.com/400x500'}
                alt={creative.creative_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm border border-black/5 backdrop-blur-md ${
                  creative.status === 'WINNING' ? 'bg-green-100/90 text-green-800' :
                  creative.status === 'TESTING' ? 'bg-blue-100/90 text-blue-800' :
                  creative.status === 'FATIGUE DETECTED' ? 'bg-orange-100/90 text-orange-800' :
                  creative.status === 'KILL' ? 'bg-red-100/90 text-red-800' :
                  'bg-surface-container-high/90 text-on-surface'
                }`}>
                  {creative.status}
                </span>
              </div>
              {(() => {
                const name = creative.creative_name.toLowerCase();
                const isMeta = name.includes('video') || name.includes('meta');
                const isGoogle = name.includes('image') || name.includes('google');
                if (!isMeta && !isGoogle) return null;
                
                return (
                  <div className="absolute top-4 right-4 animate-in fade-in duration-500">
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.15em] shadow-sm backdrop-blur-md border border-white/10 ${
                      isMeta ? 'bg-blue-600/80 text-white' : 'bg-orange-600/80 text-white'
                    }`}>
                      {isMeta ? 'Meta' : 'Google'}
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="p-8 flex flex-col gap-6 flex-grow">
              <div>
                <h3 className="font-bold text-xl mb-6">{creative.creative_name}</h3>
                <div className="flex flex-col gap-4">
                  <AIProgressBar label="Hook Strength" value={creative.hook_strength} />
                  <AIProgressBar label="Message Clarity" value={creative.message_clarity} />
                  <AIProgressBar label="CTA Presence" value={creative.cta_presence} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Creativity Fatigue</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${
                      creative.fatigue === 'low' ? 'bg-blue-500' :
                      creative.fatigue === 'medium' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`} />
                    <span className={`text-xs font-bold capitalize ${
                      creative.fatigue === 'low' ? 'text-blue-600' :
                      creative.fatigue === 'medium' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {creative.fatigue} fatigue
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-2">
                <button className="flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant/30 px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-primary transition-all hover:border-primary-container/30 hover:bg-primary/5 hover:shadow-sm">
                  <Sparkles size={16} />
                  Improve Suggestions
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-surface mt-24 mb-16 flex flex-col items-center justify-between gap-8 rounded-[2rem] p-10 md:flex-row md:gap-12 md:p-12">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black font-headline text-on-surface mb-2">Ready to scale?</h2>
          <p className="text-on-surface-variant font-medium">Your top creatives are performing well this week.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <button className="flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant/50 px-8 py-4 text-sm font-bold uppercase tracking-[0.14em] text-on-surface transition-all hover:bg-surface-container-high sm:w-auto">
            <FileDown size={20} />
            Download Report
          </button>
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_8px_30px_rgb(25,28,29,0.12)] transition-all hover:bg-primary/90 hover:shadow-lg sm:w-auto">
            <Rocket size={20} />
            Launch Campaign
          </button>
        </div>
      </div>
    </main>
  );
}
