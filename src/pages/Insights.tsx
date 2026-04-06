import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Target, MonitorPlay, MousePointerClick, MessageCircle, ArrowRight } from 'lucide-react';

const QUICK_SIGNALS = [
  {
    id: 1,
    title: 'Ads Performance',
    label: 'CPM High',
    status: 'alert',
    description: 'CPM is above benchmark, audience may be too broad or competitive',
    action: 'Adjust Audience',
    icon: Target
  },
  {
    id: 2,
    title: 'Creative Quality',
    label: 'Hook Weak',
    status: 'warning',
    description: 'CTR below 1%, first 3 seconds likely not engaging',
    action: 'Improve Hook',
    icon: MonitorPlay
  },
  {
    id: 3,
    title: 'Funnel / Website',
    label: 'Load Speed',
    status: 'good',
    description: 'No major drop-offs detected in funnel performance',
    action: 'Check Funnel',
    icon: MousePointerClick
  },
  {
    id: 4,
    title: 'Sales / WhatsApp',
    label: 'Lead Quality',
    status: 'alert',
    description: 'High number of unqualified leads, possible targeting issue',
    action: 'Fix Lead Quality',
    icon: MessageCircle
  }
];

export default function InsightsPage() {
  const { insights } = useDatabase();

  const categories = [
    { id: 'ads', title: 'Ads', desc: 'Performance and targeting optimization' },
    { id: 'creative', title: 'Creative', desc: 'Hook, angle, and engagement quality' },
    { id: 'funnel', title: 'Funnel', desc: 'Conversion and user journey performance' },
    { id: 'sales', title: 'Sales', desc: 'Lead quality and closing efficiency' }
  ] as const;

  return (
    <main className="max-w-[1280px] mx-auto px-8">
      <div className="mb-12">
        <h1 className="text-[3.5rem] font-extrabold tracking-tight font-headline text-on-surface leading-tight">
          System Insights
        </h1>
        <p className="text-on-surface-variant font-medium mt-2">
          Automated intelligence and rule-based recommendations grouped by category.
        </p>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-bold font-headline mb-6 text-on-surface">Quick Performance Signals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {QUICK_SIGNALS.map((signal) => {
            const Icon = signal.icon;
            const isAlert = signal.status === 'alert';
            const isWarning = signal.status === 'warning';
            
            return (
              <div key={signal.id} className="p-6 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 flex flex-col justify-between group hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-on-surface-variant font-medium">
                      <Icon size={16} />
                      <span className="text-[11px] font-bold uppercase tracking-widest">{signal.title}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md ${
                      isAlert ? 'bg-red-100 text-red-700' :
                      isWarning ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {signal.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-on-surface leading-relaxed mb-6">
                    {signal.description}
                  </p>
                </div>
                <button className={`text-sm font-bold flex items-center gap-1.5 transition-colors group-hover:underline ${
                  isAlert ? 'text-red-700 hover:text-red-900' :
                  isWarning ? 'text-amber-700 hover:text-amber-900' :
                  'text-blue-700 hover:text-blue-900'
                }`}>
                  {signal.action}
                  <ArrowRight size={14} className="mt-[1px]" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-12">
        {categories.map(category => {
          const categoryInsights = insights.filter(i => i.type === category.id);
          
          return (
            <div key={category.id} className="bg-surface-container-lowest rounded-2xl p-10 shadow-sm border border-outline-variant/10">
              <div className="mb-8 border-b border-outline-variant/10 pb-6">
                <h2 className="text-2xl font-black font-headline uppercase tracking-[0.1em] text-on-surface flex items-center gap-4">
                  {category.title}
                  <span className="text-[11px] uppercase font-black bg-primary/10 text-primary px-3 py-1 rounded-md border border-primary/20">
                    {categoryInsights.length} {categoryInsights.length === 1 ? 'Insight' : 'Insights'}
                  </span>
                </h2>
                <p className="text-on-surface-variant font-medium mt-3">{category.desc}</p>
              </div>

              {categoryInsights.length === 0 ? (
                <p className="text-on-surface-variant italic py-4">No active insights for this category.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryInsights.map(insight => (
                    <div key={insight.id} className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/5 flex flex-col h-full hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${insight.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {insight.priority} Priority
                          </span>
                          {insight.platform && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              insight.platform === 'meta' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {insight.platform}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-lg font-bold mb-2 font-headline leading-tight text-on-surface">{insight.message}</h3>
                        <p className="text-on-surface-variant text-sm leading-relaxed mb-6">{insight.reasoning}</p>
                      </div>
                      {insight.actionLabel && (
                        <div className="mt-auto flex justify-end">
                          <button className={`px-4 py-2 border rounded-xl text-xs font-bold uppercase tracking-[0.05em] flex items-center gap-2 transition-colors ${
                            insight.severity === 'attention' ? 'text-error border-error/30 hover:bg-error/10' :
                            insight.severity === 'efficiency' ? 'text-amber-700 border-amber-500/30 hover:bg-amber-500/10' :
                            insight.severity === 'performance' ? 'text-primary border-primary/30 hover:bg-primary/10' :
                            'text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-low'
                          }`}>
                            {insight.actionLabel}
                            <ArrowRight size={14} className="mt-[1px]" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
