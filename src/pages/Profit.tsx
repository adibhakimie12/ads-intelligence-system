import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import MetricCard from '../components/MetricCard';
import { Calculator, DollarSign, Target, Percent, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ProfitPage() {
  const { adsData, profitData, formatCurrency } = useDatabase();

  // Interactive Calculator State
  const [price, setPrice] = useState<number>(profitData.product_price);
  const [closingRate, setClosingRate] = useState<number>(profitData.closing_rate * 100);
  const [cpl, setCpl] = useState<number>(profitData.CPL);

  // Real-time Calculations
  const costPerSale = closingRate > 0 ? cpl / (closingRate / 100) : 0;
  const netProfitPerSale = price - costPerSale;
  const beCPL = price * (closingRate / 100);
  const unitMargin = price > 0 ? (netProfitPerSale / price) * 100 : 0;

  // Overall Business Metrics (Current)
  const totalRevenue = adsData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalAdSpend = adsData.reduce((acc, curr) => acc + curr.spend, 0);
  const totalNetProfit = totalRevenue - totalAdSpend;
  const overallMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPrice(isNaN(val) ? 0 : val);
  };

  const handleClosingRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setClosingRate(isNaN(val) ? 0 : val);
  };

  const handleCplChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCpl(isNaN(val) ? 0 : val);
  };

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-32 lg:px-8">
      {/* Title Section */}
      <div className="mb-12">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-secondary">Profit Intelligence</p>
        <h1 className="font-headline text-[3.6rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">
          Profit Analysis
        </h1>
        <p className="mt-3 text-sm font-medium text-on-surface-variant">
          Real-time business performance and interactive unit economic simulation.
        </p>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <MetricCard 
          label="Total Revenue" 
          value={formatCurrency(totalRevenue)} 
          trend={12.4} 
          trendLabel="+12.4% vs last week" 
        />
        <MetricCard 
          label="Total Ad Spend" 
          value={formatCurrency(totalAdSpend)} 
          trend={-3.2} 
          trendLabel="-3.2% vs last week" 
        />
        <MetricCard 
          label="Net Profit" 
          value={formatCurrency(totalNetProfit)} 
          trend={18.7} 
          trendLabel="+18.7% vs last week" 
          isPrimary={true}
        />
        <MetricCard 
          label="Profit Margin" 
          value={`${overallMargin.toFixed(1)}%`} 
          trend={2.5} 
          trendLabel="+2.5% vs last week" 
        />
      </div>

      {/* Interactive Calculator Section */}
      <section className="panel-surface mb-12 rounded-[2rem] p-8 lg:p-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Calculator size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight">Interactive Unit Profit Calculator</h3>
            <p className="text-xs text-on-surface-variant font-medium">Model your profitability scenarios in real-time.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Inputs */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                <DollarSign size={14} className="text-primary" />
                Product Price
              </label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">
                  {formatCurrency(0).replace(/[0-9,\s.]/g, '')}
                </span>
                <input 
                  type="number" 
                  value={price === 0 ? '' : price}
                  onChange={handlePriceChange}
                  className="w-full bg-surface-container-low border-2 border-outline-variant/20 focus:border-primary rounded-2xl px-12 py-5 text-2xl font-black font-headline text-on-surface outline-none transition-all placeholder:text-on-surface-variant/30"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                <Percent size={14} className="text-primary" />
                Closing Rate
              </label>
              <div className="relative group">
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">%</span>
                <input 
                  type="number" 
                  value={closingRate === 0 ? '' : closingRate}
                  onChange={handleClosingRateChange}
                  className="w-full bg-surface-container-low border-2 border-outline-variant/20 focus:border-primary rounded-2xl px-6 py-5 text-2xl font-black font-headline text-on-surface outline-none transition-all placeholder:text-on-surface-variant/30"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                <Target size={14} className="text-primary" />
                Cost per Lead
              </label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">
                  {formatCurrency(0).replace(/[0-9,\s.]/g, '')}
                </span>
                <input 
                  type="number" 
                  value={cpl === 0 ? '' : cpl}
                  onChange={handleCplChange}
                  className="w-full bg-surface-container-low border-2 border-outline-variant/20 focus:border-primary rounded-2xl px-12 py-5 text-2xl font-black font-headline text-on-surface outline-none transition-all placeholder:text-on-surface-variant/30"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Real-time Outputs */}
          <div className="rounded-3xl border border-secondary/15 bg-secondary/10 p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-primary/10 pb-4">
              <span className="text-xs font-bold text-on-surface-variant">Cost per Sale</span>
              <span className="text-xl font-black text-on-surface">{formatCurrency(costPerSale)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-primary/10 pb-4">
              <span className="text-xs font-bold text-on-surface-variant">Net Profit per Sale</span>
              <span className={`text-xl font-black ${netProfitPerSale < 0 ? 'text-error' : 'text-secondary'}`}>
                {formatCurrency(netProfitPerSale)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-primary/10 pb-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface-variant">Break-even CPL</span>
                <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Your safety margin</span>
              </div>
              <span className="text-xl font-black text-on-surface">{formatCurrency(beCPL)}</span>
            </div>
            
            <div className="pt-4 flex items-center gap-3">
              {cpl > beCPL ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                  <p className="text-xs font-bold text-red-700 leading-tight">Your current CPL is too high to be profitable.</p>
                </>
              ) : unitMargin > 30 ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                    <TrendingUp size={16} />
                  </div>
                  <p className="text-xs font-bold text-green-700 leading-tight">Your campaign is profitable and highly scalable!</p>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <p className="text-xs font-bold text-blue-700 leading-tight">Target: Increase closing rate to improve profit.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Results Section (Unit Profit & Margin) */}
      <div className={`rounded-3xl p-12 shadow-xl transition-all duration-500 ${netProfitPerSale < 0 ? 'bg-red-600 shadow-red-200' : 'dark-panel'} text-white`}>
        <div className="flex flex-col md:flex-row gap-12 items-baseline relative z-10">
          <div className="flex-grow">
            <h2 className="text-3xl font-black mb-6 font-headline uppercase tracking-wide flex items-center gap-4">
              {netProfitPerSale < 0 ? 'Loss Warning' : 'Target Unit Metrics'}
              {netProfitPerSale >= 0 && <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest font-black">AI Verified</span>}
            </h2>
            <div className="flex flex-col md:flex-row gap-12 items-baseline">
              <div>
                <span className="text-sm opacity-80 mb-2 block uppercase font-black tracking-widest">Net Profit Per Sale</span>
                <span className="text-[4rem] font-black leading-none drop-shadow-md">{formatCurrency(netProfitPerSale)}</span>
              </div>
              <div>
                <span className="text-sm opacity-80 mb-2 block uppercase font-black tracking-widest">Estimated Margin</span>
                <span className="text-[4rem] font-black leading-none drop-shadow-md">{unitMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div className="md:border-l border-white/20 md:pl-12 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Quick Insight</p>
            <p className="text-lg font-bold leading-relaxed max-w-[300px]">
              {netProfitPerSale < 0 
                ? "Switch to a different product or dramatically optimize your lead cost."
                : unitMargin < 20 
                  ? "Profitable but fragile. Scaling may increase CPL and wipe out the margin."
                  : "High confidence and scalable. You can safely increase budget by 25%."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
