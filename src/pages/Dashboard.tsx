import React from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import InsightCard from '../components/InsightCard';
import MetricCard from '../components/MetricCard';
import CampaignTable from '../components/CampaignTable';
import ProfitChart from '../components/ProfitChart';
import { useDatabase } from '../context/DatabaseContext';

const FORECAST_DATA = [
  { day: 'Mon', profit: 40 },
  { day: 'Tue', profit: 55 },
  { day: 'Wed', profit: 45 },
  { day: 'Thu', profit: 70 },
  { day: 'Fri', profit: 85 },
  { day: 'Sat', profit: 75 },
  { day: 'Sun', profit: 95, isCurrent: true },
];

export default function DashboardPage() {
  const { adsData, insights, formatCurrency } = useDatabase();

  const totalSpend = adsData.reduce((acc, curr) => acc + curr.spend, 0);
  const totalRevenue = adsData.reduce((acc, curr) => acc + curr.revenue, 0);
  const globalROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0';
  const avgCTR = adsData.length > 0 ? (adsData.reduce((acc, curr) => acc + curr.CTR, 0) / adsData.length).toFixed(2) : '0';
  const avgCPM = adsData.length > 0 ? (adsData.reduce((acc, curr) => acc + curr.CPM, 0) / adsData.length).toFixed(2) : '0';

  const METRICS = [
    { label: 'Spend', value: formatCurrency(totalSpend), trend: -2.4, trendLabel: '-2.4% vs last week', isPrimary: false },
    { label: 'Revenue', value: formatCurrency(totalRevenue), trend: 12.5, trendLabel: '+12.5% vs last week', isPrimary: false },
    { label: 'ROAS', value: `${globalROAS}x`, trend: 4.2, trendLabel: '+4.2% vs last week', isPrimary: true },
    { label: 'CTR', value: `${avgCTR}%`, trend: -0.2, trendLabel: '-0.2% vs last week', isPrimary: false },
  ];

  return (
    <main className="mx-auto max-w-[1360px] px-6 lg:px-8">
      {/* Page Title */}
      <div className="mb-12">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Executive Snapshot</p>
        <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">
          Intelligence Overview
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-medium text-on-surface-variant">
          Aggregated performance data for the last 24 hours.
        </p>
      </div>

      {/* Critical Insights */}
      <section className="mb-16">
        <div className="panel-surface rounded-[2rem] p-8 lg:p-10">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-secondary">Priority Queue</p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface">Critical Insights & Actions</h2>
            </div>
            <p className="text-sm font-medium text-on-surface-variant">High-signal recommendations ranked for immediate operator attention.</p>
          </div>
          {insights.length === 0 ? (
            <p className="text-on-surface-variant">No critical insights at this time.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {insights.slice(0, 3).map((insight) => (
                <InsightCard 
                  key={insight.id} 
                  severity={insight.severity} 
                  title={insight.message} 
                  reasoning={insight.reasoning} 
                  actionLabel={insight.actionLabel}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {METRICS.map((metric, index) => (
          <MetricCard 
            key={index} 
            label={metric.label} 
            value={metric.value} 
            trend={metric.trend} 
            trendLabel={metric.trendLabel} 
            isPrimary={metric.isPrimary} 
          />
        ))}
      </div>

      {/* Active Campaigns */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-headline text-2xl font-bold text-on-surface">Active Campaigns</h3>
          <button className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white shadow-lg shadow-black/15 transition-all hover:scale-[1.02] active:scale-95">
            <Plus size={20} />
            New Campaign
          </button>
        </div>
        <CampaignTable campaigns={adsData as any} showActions={false} />
      </section>

      {/* Forecast and Side Insights */}
      <section className="grid grid-cols-12 gap-8 items-start mb-20">
        <div className="panel-surface col-span-12 rounded-[2rem] p-8 lg:col-span-8 lg:p-10">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h4 className="text-2xl font-bold font-headline text-on-surface">Profit Forecast</h4>
                <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary">
                  High Confidence Model
                </span>
              </div>
              <p className="text-sm font-medium text-on-surface-variant mt-2">Based on last 7 days performance trend</p>
            </div>
            <div className="text-right">
              <p className="text-on-surface-variant text-sm font-medium uppercase tracking-widest mb-1">Estimated 7-Day Profit</p>
              <span className="font-headline text-3xl font-black text-secondary">+{formatCurrency(14200)}</span>
            </div>
          </div>
          
          <div className="mt-6 mb-2">
            <ProfitChart data={FORECAST_DATA} />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="panel-surface rounded-[2rem] p-8">
            <h5 className="font-bold text-sm uppercase tracking-widest mb-4 text-on-surface-variant">Top Audience Segment</h5>
            <p className="text-2xl font-black font-headline text-on-surface">Tech Early Adopters</p>
            <p className="text-on-surface-variant text-sm mt-2">ROAS: 4.2x | Spend: {formatCurrency(1200)}</p>
          </div>
          
          <div className="relative overflow-hidden rounded-[2rem] border border-secondary/15 bg-secondary/10 p-8 transition-all group hover:shadow-md">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-secondary" />
            <div className="mb-4 flex items-center gap-2 text-secondary">
              <AlertTriangle size={18} strokeWidth={2.5} />
              <h5 className="font-bold text-sm uppercase tracking-widest">Ad Fatigue Alert</h5>
            </div>
            <p className="font-headline text-xl font-black text-on-surface">Video_Asset_01</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-on-surface-variant">
              Frequency is 3.8 and CTR is declining, indicating possible ad fatigue. Recommended to refresh creative promptly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
