import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Building2,
  ChevronDown,
  CreditCard,
  DollarSign,
  LogOut,
  Moon,
  RotateCcw,
  Sun,
  TrendingUp,
  User,
  Users,
  X,
  Palette,
  BadgeDollarSign,
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { CurrencyCode } from '../types';

const SETTINGS_SECTION_STORAGE_KEY = 'ads-intel-settings-section';
const SETTINGS_SECTION_EVENT = 'ads-intel:open-settings-section';

const Navigation = ({ onResetOnboarding }: { onResetOnboarding?: () => void }) => {
  const { currentPage, setCurrentPage, currency, setCurrency, pipelineAlerts } = useDatabase();
  const { user, isDemoMode, signOut } = useAuth();
  const { currentWorkspace, metaConnection } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const navItems = ['Dashboard', 'Insights', 'Creatives', 'Campaigns', 'Profit', 'Leads', 'Settings'] as const;

  const currencies: { code: CurrencyCode; label: string; symbol: string }[] = [
    { code: 'MYR', label: 'MYR', symbol: 'RM' },
    { code: 'USD', label: 'USD', symbol: '$' },
    { code: 'GBP', label: 'GBP', symbol: 'GBP' },
  ];
  const activeCurrency = currencies.find((item) => item.code === currency) || currencies[0];

  const formatRelativeTime = (isoDate?: string | null) => {
    if (!isoDate) return 'No sync yet';

    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(event.target as Node)) setShowUserMenu(false);
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifications = [
    ...pipelineAlerts.map((alert) => ({
      id: alert.id,
      icon: alert.severity === 'warning' ? AlertTriangle : alert.severity === 'success' ? TrendingUp : Users,
      color: alert.severity === 'warning' ? 'text-amber-500' : alert.severity === 'success' ? 'text-emerald-500' : 'text-blue-500',
      bg: alert.severity === 'warning' ? 'bg-amber-500/10' : alert.severity === 'success' ? 'bg-emerald-500/10' : 'bg-blue-500/10',
      message: alert.message,
      time: formatRelativeTime(metaConnection?.last_synced_at),
    })),
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

  const shellTone = theme === 'dark'
    ? 'border-slate-700/80 bg-slate-900/75'
    : 'border-outline-variant/40 bg-white/70';

  const dropdownTone = theme === 'dark'
    ? 'border-slate-700 bg-slate-900 shadow-black/30'
    : 'border-slate-200/80 bg-white shadow-black/5';

  const rowHoverTone = theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50';
  const mutedTextTone = theme === 'dark' ? 'text-slate-500' : 'text-slate-400';
  const strongTextTone = theme === 'dark' ? 'text-slate-100' : 'text-slate-800';
  const bodyTextTone = theme === 'dark' ? 'text-slate-200' : 'text-slate-700';

  const openSettingsSection = (section: 'account' | 'workspace' | 'billing' | 'notifications') => {
    localStorage.setItem(SETTINGS_SECTION_STORAGE_KEY, section);
    window.dispatchEvent(new CustomEvent(SETTINGS_SECTION_EVENT, { detail: { section } }));
    setCurrentPage('Settings');
    setShowUserMenu(false);
  };

  return (
    <header className="fixed top-0 z-50 w-full glass-nav">
      <nav className="mx-auto flex h-[76px] w-full max-w-[1360px] items-center justify-between px-6 font-headline tracking-tight lg:px-8">
        <div className="flex items-center gap-12">
          <button
            onClick={() => setCurrentPage('Dashboard')}
            className={`group flex items-center gap-3 rounded-full border px-3 py-2 shadow-sm transition-all ${
              theme === 'dark' ? 'hover:border-amber-400/40 hover:bg-slate-900' : 'hover:border-primary-container/40 hover:bg-white'
            } ${shellTone}`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[11px] font-black uppercase tracking-[0.28em] text-white">AI</span>
            <span className="text-left">
              <span className="block text-[15px] font-black tracking-tight text-on-surface">Ads Intel</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/70">
                {currentWorkspace?.name || 'Sales Intelligence'}
              </span>
            </span>
          </button>

          <div className={`hidden items-center gap-2 rounded-full border p-1.5 shadow-sm md:flex ${theme === 'dark' ? 'border-slate-700/70 bg-slate-900/60' : 'border-outline-variant/35 bg-white/65'}`}>
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

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
                if (showNotifications === false) setUnreadCount(0);
              }}
              className={`relative rounded-xl p-2 transition-colors active:scale-90 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            >
              <Bell className="h-5 w-5 text-on-surface-variant" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className={`absolute top-full right-0 mt-2 w-[360px] overflow-hidden rounded-2xl border shadow-xl animate-in fade-in slide-in-from-top-1 duration-200 ${dropdownTone}`}>
                <div className={`flex items-center justify-between border-b px-5 py-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                  <h3 className={`text-sm font-black ${strongTextTone}`}>Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className={`rounded-lg p-1 transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                  >
                    <X size={14} className={mutedTextTone} />
                  </button>
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                  {notifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${rowHoverTone} ${
                        index < unreadCount ? 'bg-primary/[0.02]' : ''
                      }`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${notification.bg}`}>
                        <notification.icon size={14} className={notification.color} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold leading-relaxed ${bodyTextTone}`}>{notification.message}</p>
                        <p className={`mt-1 text-[10px] font-medium ${mutedTextTone}`}>{notification.time}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`border-t px-5 py-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button className="w-full text-center text-xs font-bold text-primary transition-colors hover:text-primary/80">
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className={`h-9 w-9 cursor-pointer overflow-hidden rounded-full border-2 bg-surface-container-high shadow-sm transition-all hover:border-primary-container/40 active:scale-90 ${
                theme === 'dark' ? 'border-slate-700' : 'border-white/80'
              }`}
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAs1gv-p23FrTNjO0FB-W9MP6k8Ba0Va-6RXUT7QU-_EHiW-b6xl7CDNCUuraCa6ZRR_cWiSCV5KWoq7moO3XPbZWGHYYSSXTFGiTEQc8JcciYiWx3H2Pfm7fCntEoHI8TcgjYAWvCRUPGnCUJOvunAwSV6qNe9Xfz1WAultz6EjcnLThwa6V4jv21D2CLCFXS0ob50IwrTvL8JrhEX44wiTIqzVZN0L--OkG-eKsftE6-Q6IGwN6m9doGUPhpne1AAPLz5INeibpMf"
                alt="User Avatar"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </button>

            {showUserMenu && (
              <div className={`absolute top-full right-0 mt-2 w-72 rounded-[2rem] border py-2 shadow-xl animate-in fade-in slide-in-from-top-1 duration-200 ${dropdownTone}`}>
                <div className={`border-b px-4 py-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                  <p className={`text-sm font-bold ${strongTextTone}`}>{isDemoMode ? 'Demo Workspace' : user?.email?.split('@')[0] || 'Workspace User'}</p>
                  <p className={`text-[11px] ${mutedTextTone}`}>{isDemoMode ? 'demo@adsintel.local' : user?.email || 'Not signed in'}</p>
                </div>

                <div className={`border-b px-4 py-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${
                      theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Palette size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${bodyTextTone}`}>Appearance</p>
                      <p className={`text-[11px] ${mutedTextTone}`}>Switch between light and dark mode</p>
                      <div className={`mt-3 flex rounded-2xl border p-1 ${
                        theme === 'dark' ? 'border-slate-700 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
                      }`}>
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            theme === 'light'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          Light
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            theme === 'dark'
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-slate-500 hover:bg-white'
                          }`}
                        >
                          Dark
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`border-b px-4 py-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${
                      theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <BadgeDollarSign size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${bodyTextTone}`}>Currency</p>
                      <p className={`text-[11px] ${mutedTextTone}`}>Current: {activeCurrency.code} ({activeCurrency.symbol})</p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {currencies.map((item) => (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => setCurrency(item.code)}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                              currency === item.code
                                ? 'bg-primary text-white'
                                : theme === 'dark'
                                  ? 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {item.code}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => openSettingsSection('account')}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${rowHoverTone}`}
                  >
                    <User size={15} className={mutedTextTone} />
                    <span className={`text-sm font-medium ${bodyTextTone}`}>Account Settings</span>
                  </button>
                  <button
                    onClick={() => openSettingsSection('workspace')}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${rowHoverTone}`}
                  >
                    <Building2 size={15} className={mutedTextTone} />
                    <span className={`text-sm font-medium ${bodyTextTone}`}>Workspace Settings</span>
                  </button>
                  <button
                    onClick={() => openSettingsSection('billing')}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${rowHoverTone}`}
                  >
                    <CreditCard size={15} className={mutedTextTone} />
                    <span className={`text-sm font-medium ${bodyTextTone}`}>Billing & Plan</span>
                  </button>
                  <button
                    onClick={() => openSettingsSection('notifications')}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${rowHoverTone}`}
                  >
                    <BellRing size={15} className={mutedTextTone} />
                    <span className={`text-sm font-medium ${bodyTextTone}`}>Notification Settings</span>
                  </button>
                </div>

                <div className={`border-t pt-1 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                  {onResetOnboarding && (
                    <button
                      onClick={() => {
                        onResetOnboarding();
                        setShowUserMenu(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        theme === 'dark' ? 'hover:bg-blue-950/40' : 'hover:bg-blue-50'
                      }`}
                    >
                      <RotateCcw size={15} className="text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">Restart Onboarding</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      void signOut();
                      setShowUserMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      theme === 'dark' ? 'hover:bg-red-950/30' : 'hover:bg-red-50'
                    }`}
                  >
                    <LogOut size={15} className="text-red-400" />
                    <span className="text-sm font-medium text-red-500">{isDemoMode ? 'Exit Demo Mode' : 'Logout'}</span>
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
