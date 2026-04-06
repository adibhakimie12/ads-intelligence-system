import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import CampaignTable from '../components/CampaignTable';
import TrendChart from '../components/TrendChart';
import { Filter, FileDown, TrendingUp, TrendingDown, ArrowUpRight, Target, Zap, AlertCircle, PauseCircle, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';

export default function CampaignsPage() {
  const { adsData, formatCurrency } = useDatabase();
  const [activeFilter, setActiveFilter] = useState('All');
  const [timeRange, setTimeRange] = useState('7D');

  // Performance Trend Data based on time range
  const trendData = {
    '7D': [
      { label: 'Mon', value: 1200 },
      { label: 'Tue', value: 1500 },
      { label: 'Wed', value: 1100 },
      { label: 'Thu', value: 1800 },
      { label: 'Fri', value: 2200 },
      { label: 'Sat', value: 1900 },
      { label: 'Sun', value: 2400 },
    ],
    '30D': [
      { label: 'Week 1', value: 8500 },
      { label: 'Week 2', value: 10200 },
      { label: 'Week 3', value: 9800 },
      { label: 'Week 4', value: 12500 },
    ],
    '90D': [
      { label: 'Jan', value: 35000 },
      { label: 'Feb', value: 42000 },
      { label: 'Mar', value: 38000 },
    ]
  };

  const activeTrend = trendData[timeRange as keyof typeof trendData];

  // Calculate High-level KPIs
  const totalSpend = adsData.reduce((acc, ad) => acc + ad.spend, 0);
  const totalRevenue = adsData.reduce((acc, ad) => acc + ad.revenue, 0);
  const avgROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00';
  const avgCTR = adsData.length > 0 ? (adsData.reduce((acc, ad) => acc + ad.CTR, 0) / adsData.length).toFixed(2) : '0.00';

  // Count Lifecycle Statuses
  const counts = {
    scaling: adsData.filter(ad => ad.status === 'scaling').length,
    testing: adsData.filter(ad => ad.status === 'testing').length,
    underperforming: adsData.filter(ad => ad.status === 'underperforming').length,
    paused: adsData.filter(ad => ad.status === 'paused').length,
  };

  const filteredCampaigns = adsData.filter(ad => {
    if (activeFilter === 'All') return true;
    return ad.status === activeFilter.toLowerCase();
  });

  const KPICard = ({ title, value, trend, isPositive }: { title: string, value: string, trend: string, isPositive: boolean }) => (
    <div className="panel-surface rounded-[2rem] p-6 transition-shadow group hover:shadow-md">
      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-black font-headline text-on-surface">{value}</h3>
        <div className={`flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend}
        </div>
      </div>
    </div>
  );

  const SummaryCard = ({ title, count, desc, icon: Icon, color }: { title: string, count: number, desc: string, icon: any, color: string }) => (
    <div className="panel-surface flex items-center gap-4 rounded-[2rem] p-5 transition-colors group hover:border-primary-container/30">
      <div className={`p-3 rounded-xl bg-surface-container-low ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-on-surface">{count}</span>
          <span className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">{title}</span>
        </div>
        <p className="text-xs text-on-surface-variant/70 font-medium">{desc}</p>
      </div>
    </div>
  );

  const filters = ['All', 'Scaling', 'Testing', 'Underperforming', 'Paused'];

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-20 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="mb-2 flex items-center gap-2 text-secondary font-bold text-[11px] uppercase tracking-[0.24em]">
            <Target size={14} />
            Operations
          </div>
          <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">
            Campaign Performance
          </h1>
          <p className="text-on-surface-variant font-medium mt-2">
            Monitor, prioritize, and optimize all active campaigns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full border border-outline-variant/50 px-5 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high">
            <Filter size={18} />
            Filter
          </button>
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-90">
            <FileDown size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KPICard title="Total Spend" value={formatCurrency(totalSpend)} trend="+12%" isPositive={true} />
        <KPICard title="Revenue" value={formatCurrency(totalRevenue)} trend="+24%" isPositive={true} />
        <KPICard title="Avg. ROAS" value={`${avgROAS}x`} trend="+0.4" isPositive={true} />
        <KPICard title="Avg. CTR" value={`${avgCTR}%`} trend="-0.2%" isPositive={false} />
      </div>

      {/* Trend Section */}
      <div className="panel-surface mb-12 rounded-[2rem] p-8 lg:p-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black font-headline text-on-surface">Weekly Trend Analysis</h3>
              <p className="text-xs text-on-surface-variant font-medium">Performance visualization for the selected period.</p>
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 bg-surface-container-high rounded-xl">
            {['7D', '30D', '90D'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  timeRange === range 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <TrendChart data={activeTrend} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-12">
          {/* Lifecycle Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SummaryCard title="Scaling" count={counts.scaling} desc="High ROI / Ready to increase" icon={ArrowUpRight} color="text-secondary" />
            <SummaryCard title="Testing" count={counts.testing} desc="Early phase / Performance pending" icon={Zap} color="text-slate-600" />
            <SummaryCard title="Underperforming" count={counts.underperforming} desc="Below target / Attention needed" icon={AlertCircle} color="text-orange-600" />
            <SummaryCard title="Paused" count={counts.paused} desc="Stopped / Historical data" icon={PauseCircle} color="text-red-600" />
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-4">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                  activeFilter === filter 
                    ? 'bg-primary text-white shadow-lg shadow-black/15' 
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Table Section */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CampaignTable campaigns={filteredCampaigns} />
          </div>
        </div>

        {/* Sidebar: Growth Opportunities */}
        <div className="lg:col-span-4 space-y-6 sticky top-8">
          <div className="dark-panel relative overflow-hidden rounded-[2rem] p-8 text-white group">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary-container/15 blur-3xl transition-all duration-700 group-hover:bg-primary-container/25" />
            
            <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-primary shadow-lg shadow-black/20">
                  <Sparkles size={20} />
                </div>
              <h3 className="font-headline text-xl font-black text-white">Growth Opportunities</h3>
            </div>

            <div className="space-y-6 mb-10">
              <div className="flex gap-4">
                <CheckCircle2 size={18} className="mt-1 shrink-0 text-primary-container" />
                <div>
                  <p className="mb-1 text-sm font-bold text-white">Scale Budget</p>
                  <p className="text-xs leading-relaxed text-white/72">ROAS is 5.2x on Brand Core, suggesting immediate scalability by 20%.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 size={18} className="mt-1 shrink-0 text-primary-container" />
                <div>
                  <p className="mb-1 text-sm font-bold text-white">Improve Conversion</p>
                  <p className="text-xs leading-relaxed text-white/72">Website speed is impacting Meta Broad sales. Optimize landing page load.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 size={18} className="mt-1 shrink-0 text-primary-container" />
                <div>
                  <p className="mb-1 text-sm font-bold text-white">Optimize Targeting</p>
                  <p className="text-xs leading-relaxed text-white/72">Retargeting pool is saturated. Expand lookalike audience to 3%.</p>
                </div>
              </div>
            </div>

            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-container px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-primary transition-all hover:brightness-105">
              Apply All Insights
              <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="panel-surface rounded-[2rem] p-8">
            <h4 className="text-sm font-black text-on-surface uppercase tracking-widest mb-4">System Status</h4>
            <div className="flex items-center justify-between py-3 border-b border-outline-variant/5">
              <span className="text-xs text-on-surface-variant font-medium">Auto-Optimization</span>
              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-outline-variant/5">
              <span className="text-xs text-on-surface-variant font-medium">Last Sync</span>
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">2m ago</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
