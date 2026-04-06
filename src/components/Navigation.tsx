import React, { useState, useRef, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { CurrencyCode } from '../types';
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  CreditCard,
  BellRing,
  LogOut,
  Building2,
  TrendingUp,
  AlertTriangle,
  Users,
  DollarSign,
  X,
  RotateCcw
} from 'lucide-react';

const Navigation = ({ onResetOnboarding }: { onResetOnboarding?: () => void }) => {
  const { currentPage, setCurrentPage, currency, setCurrency, pipelineAlerts, insights } = useDatabase();
  const navItems = ['Dashboard', 'Insights', 'Creatives', 'Campaigns', 'Profit', 'Leads', 'Settings'] as const;

  const currencies: { code: CurrencyCode; label: string; symbol: string }[] = [
    { code: 'MYR', label: 'MYR', symbol: 'RM' },
    { code: 'USD', label: 'USD', symbol: '$' },
    { code: 'GBP', label: 'GBP', symbol: '£' },
  ];
  const activeCurrency = currencies.find(c => c.code === currency) || currencies[0];

  // Dropdown states
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Refs for click-outside detection
  const currencyRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setShowCurrencyDropdown(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build notification items from system alerts
  const notifications = [
    ...pipelineAlerts.map(a => ({
      id: a.id,
      icon: a.severity === 'warning' ? AlertTriangle : a.severity === 'success' ? TrendingUp : Users,
      color: a.severity === 'warning' ? 'text-amber-500' : a.severity === 'success' ? 'text-emerald-500' : 'text-blue-500',
      bg: a.severity === 'warning' ? 'bg-amber-500/10' : a.severity === 'success' ? 'bg-emerald-500/10' : 'bg-blue-500/10',
      message: a.message,
      time: '2m ago',
    })),
    // Additional static system notifications
    {
      id: 'notif_budget',
      icon: DollarSign,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      message: 'Budget threshold reached on Meta_Winter_Sale_Broad',
      time: '15m ago',
    },
    {
      id: 'notif_perf',
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      message: 'Google_PMax_Shopping_All ROAS jumped to 4.2x',
      time: '1h ago',
    },
  ];

  return (
    <header className="fixed top-0 z-50 w-full glass-nav">
      <nav className="mx-auto flex h-[76px] w-full max-w-[1360px] items-center justify-between px-6 font-headline tracking-tight lg:px-8">
        <div className="flex items-center gap-12">
          <button
            onClick={() => setCurrentPage('Dashboard')}
            className="group flex items-center gap-3 rounded-full border border-outline-variant/40 bg-white/70 px-3 py-2 shadow-sm transition-all hover:border-primary-container/40 hover:bg-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[11px] font-black uppercase tracking-[0.28em] text-white">AI</span>
            <span className="text-left">
              <span className="block text-[15px] font-black tracking-tight text-on-surface">Ads Intel</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/70">Sales Intelligence</span>
            </span>
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-outline-variant/35 bg-white/65 p-1.5 shadow-sm md:flex">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => setCurrentPage(item)}
                className={`${
                  currentPage === item
                    ? 'rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white shadow-lg shadow-black/10'
                    : 'rounded-full px-4 py-2 text-[12px] font-bold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">

          {/* ─── Currency Dropdown ─── */}
          <div className="relative" ref={currencyRef}>
            <button
              onClick={() => { setShowCurrencyDropdown(!showCurrencyDropdown); setShowNotifications(false); setShowUserMenu(false); }}
              className="flex items-center gap-1.5 rounded-full border border-outline-variant/25 bg-white/70 px-3 py-2 text-xs font-bold shadow-sm transition-all hover:border-outline-variant/45"
            >
              <span className="text-on-surface">{activeCurrency.code}</span>
              <span className="text-on-surface-variant/50">({activeCurrency.symbol})</span>
              <ChevronDown size={12} className={`text-on-surface-variant/40 transition-transform duration-200 ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCurrencyDropdown && (
              <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-black/5 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Currency</p>
                {currencies.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => { setCurrency(c.code); setShowCurrencyDropdown(false); }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      currency === c.code ? 'bg-primary/5' : ''
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-700">{c.label} — {c.symbol}</span>
                    {currency === c.code && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Notification Bell ─── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowCurrencyDropdown(false); setShowUserMenu(false); if (showNotifications === false) setUnreadCount(0); }}
              className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors active:scale-90"
            >
              <Bell className="h-5 w-5 text-on-surface-variant" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-[360px] bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-black/5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-800">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {notifications.map((n, i) => (
                    <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors ${i < unreadCount ? 'bg-primary/[0.02]' : ''}`}>
                      <div className={`w-8 h-8 rounded-xl ${n.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <n.icon size={14} className={n.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-slate-100">
                  <button className="w-full text-center text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── User Avatar Menu ─── */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowCurrencyDropdown(false); setShowNotifications(false); }}
              className="h-9 w-9 cursor-pointer overflow-hidden rounded-full border-2 border-white/80 bg-surface-container-high shadow-sm transition-all hover:border-primary-container/40 active:scale-90"
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAs1gv-p23FrTNjO0FB-W9MP6k8Ba0Va-6RXUT7QU-_EHiW-b6xl7CDNCUuraCa6ZRR_cWiSCV5KWoq7moO3XPbZWGHYYSSXTFGiTEQc8JcciYiWx3H2Pfm7fCntEoHI8TcgjYAWvCRUPGnCUJOvunAwSV6qNe9Xfz1WAultz6EjcnLThwa6V4jv21D2CLCFXS0ob50IwrTvL8JrhEX44wiTIqzVZN0L--OkG-eKsftE6-Q6IGwN6m9doGUPhpne1AAPLz5INeibpMf"
                alt="User Avatar"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-black/5 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800">Adib Hakimi</p>
                  <p className="text-[11px] text-slate-400">admin@adsintel.io</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setCurrentPage('Settings'); setShowUserMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <User size={15} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Account Settings</span>
                  </button>
                  <button
                    onClick={() => { setCurrentPage('Settings'); setShowUserMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Building2 size={15} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Workspace Settings</span>
                  </button>
                  <button
                    onClick={() => { setCurrentPage('Settings'); setShowUserMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <CreditCard size={15} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Billing & Plan</span>
                  </button>
                  <button
                    onClick={() => { setCurrentPage('Settings'); setShowUserMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <BellRing size={15} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Notification Settings</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  {onResetOnboarding && (
                    <button
                      onClick={() => { onResetOnboarding(); setShowUserMenu(false); }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left"
                    >
                      <RotateCcw size={15} className="text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">Restart Onboarding</span>
                    </button>
                  )}
                  <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50 transition-colors text-left">
                    <LogOut size={15} className="text-red-400" />
                    <span className="text-sm font-medium text-red-500">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </nav>
    </header>
  );
};

export default Navigation;
