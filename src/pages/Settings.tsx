import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Brain,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ChevronRight,
  CreditCard,
  Globe,
  Link2,
  Code2,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  TriangleAlert,
  User,
  WandSparkles,
  X,
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { checkMetaSetup } from '../services/metaSetup';
import { beginMetaConnection, selectPrimaryMetaAdAccount, syncPrimaryMetaAccount } from '../services/metaIntegration';
import { validateGoogleAiKey } from '../services/googleAiValidation';
import { validateOpenAiKey } from '../services/openAiValidation';
import { getWorkspaceSettings, upsertWorkspaceSettings } from '../services/workspaceSettings';
import { useTheme } from '../context/ThemeContext';
import { CurrencyCode } from '../types';
import type { PlanTier, UpgradeTrigger } from '../App';
import type { WorkspaceSettings } from '../types';

const API_KEYS_STORAGE_PREFIX = 'ads-intel-settings-api-keys';
const AI_CONNECTION_STORAGE_PREFIX = 'ads-intel-settings-ai-connections';
const TRACKING_CONFIG_STORAGE_PREFIX = 'ads-intel-settings-tracking-config';
const SETTINGS_SECTION_STORAGE_KEY = 'ads-intel-settings-section';
const SETTINGS_SECTION_EVENT = 'ads-intel:open-settings-section';

const buildApiKeysStorageKey = (workspaceId: string) => `${API_KEYS_STORAGE_PREFIX}:${workspaceId}`;
const buildAiConnectionStorageKey = (workspaceId: string) => `${AI_CONNECTION_STORAGE_PREFIX}:${workspaceId}`;
const buildTrackingConfigStorageKey = (workspaceId: string) => `${TRACKING_CONFIG_STORAGE_PREFIX}:${workspaceId}`;
const maskApiKey = (value: string) => {
  if (!value) return '';
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

type AiProviderStatus = 'not_tested' | 'testing' | 'connected' | 'error';

type AiConnectionState = {
  status: AiProviderStatus;
  message: string;
  checkedAt: string | null;
};

type TrackingProviderKey = 'meta_pixel' | 'meta_capi' | 'ga4' | 'gtm';

type TrackingConfig = {
  meta_pixel: {
    pixelId: string;
    landingPageUrl: string;
  };
  meta_capi: {
    pixelId: string;
    accessToken: string;
    testEventCode: string;
    landingPageUrl: string;
  };
  ga4: {
    measurementId: string;
    landingPageUrl: string;
  };
  gtm: {
    containerId: string;
    landingPageUrl: string;
  };
};

const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  meta_pixel: {
    pixelId: '',
    landingPageUrl: '',
  },
  meta_capi: {
    pixelId: '',
    accessToken: '',
    testEventCode: '',
    landingPageUrl: '',
  },
  ga4: {
    measurementId: '',
    landingPageUrl: '',
  },
  gtm: {
    containerId: '',
    landingPageUrl: '',
  },
};

type MetaSetupState = {
  isLoading: boolean;
  ready: boolean;
  error: string | null;
  checks: {
    metaOAuthConfigured: boolean;
    supabaseConfigured: boolean;
    tokenEncryptionConfigured: boolean;
  };
  missingMetaEnvVars: string[];
  missingSupabaseEnvVars: string[];
  redirectUri: string | null;
  postConnectRedirect: string | null;
};

const EMPTY_META_SETUP_STATE: MetaSetupState = {
  isLoading: true,
  ready: false,
  error: null,
  checks: {
    metaOAuthConfigured: false,
    supabaseConfigured: false,
    tokenEncryptionConfigured: false,
  },
  missingMetaEnvVars: [],
  missingSupabaseEnvVars: [],
  redirectUri: null,
  postConnectRedirect: null,
};

const EMPTY_AI_CONNECTION_STATE: AiConnectionState = {
  status: 'not_tested',
  message: 'Not tested yet.',
  checkedAt: null,
};

function ConnectionBadge({ status }: { status: AiProviderStatus }) {
  const { theme } = useTheme();
  const statusStyles = {
    not_tested: theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600',
    testing: theme === 'dark' ? 'bg-blue-950/50 text-blue-300' : 'bg-blue-50 text-blue-700',
    connected: theme === 'dark' ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
    error: theme === 'dark' ? 'bg-rose-950/50 text-rose-300' : 'bg-rose-50 text-rose-700',
  } as const;

  const labels = {
    not_tested: 'Not Tested',
    testing: 'Testing',
    connected: 'Connected',
    error: 'Failed',
  } as const;

  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[status]}`}>
      {labels[status]}
    </span>
  );
}

function Toggle({ enabled, onChange, id }: { enabled: boolean; onChange: (value: boolean) => void; id: string }) {
  const { theme } = useTheme();
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent transition ${
        enabled ? 'bg-blue-600' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <section className={`rounded-[2rem] border p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] ${
      theme === 'dark' ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
        }`}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div className="space-y-2">
      <div>
        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{label}</p>
        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{helper}</p>
      </div>
      {children}
    </div>
  );
}

function IntegrationRow({
  icon,
  title,
  subtitle,
  status,
  action,
  actionId,
  onAction,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: { label: string; tone: 'success' | 'warning' | 'neutral' };
  action: string;
  actionId: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const statusStyles = {
    success: theme === 'dark' ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
    warning: theme === 'dark' ? 'bg-amber-950/50 text-amber-300' : 'bg-amber-50 text-amber-700',
    neutral: theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600',
  } as const;

  return (
    <div className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
      theme === 'dark' ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50/80'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${
          theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'
        }`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{title}</p>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[status.tone]}`}>
              {status.label}
            </span>
          </div>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
        </div>
      </div>

      <button
        id={actionId}
        type="button"
        onClick={onAction}
        disabled={disabled}
        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
          disabled
            ? theme === 'dark'
              ? 'cursor-not-allowed bg-slate-700 text-slate-400'
              : 'cursor-not-allowed bg-slate-200 text-slate-500'
            : 'bg-blue-600 text-white hover:brightness-110'
        }`}
      >
        {action}
      </button>
    </div>
  );
}

function TrackingRow({
  icon,
  title,
  subtitle,
  connected,
  primaryAction,
  secondaryAction,
  onPrimary,
  onSecondary,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  connected: boolean;
  primaryAction: string;
  secondaryAction?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <div className={`flex flex-col gap-4 border-b py-4 last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between ${
      theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
        }`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{title}</p>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
              connected
                ? theme === 'dark' ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                : theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {connected ? 'Active' : 'Not Set'}
            </span>
          </div>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrimary}
          className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
            theme === 'dark'
              ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {primaryAction}
        </button>
        {secondaryAction && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className={`rounded-xl px-3 py-2 text-xs font-bold text-blue-600 transition ${
              theme === 'dark' ? 'hover:bg-blue-950/40' : 'hover:bg-blue-50'
            }`}
          >
            {secondaryAction}
          </button>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  helper,
  enabled,
  onChange,
  dotColor,
}: {
  id: string;
  label: string;
  helper: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  dotColor: string;
}) {
  const { theme } = useTheme();
  return (
    <div className={`flex items-center justify-between gap-4 border-b py-4 last:border-b-0 last:pb-0 first:pt-0 ${
      theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
        <div>
          <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{label}</p>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{helper}</p>
        </div>
      </div>
      <Toggle id={id} enabled={enabled} onChange={onChange} />
    </div>
  );
}

function TrackingConfigModal({
  title,
  subtitle,
  fields,
  values,
  onChange,
  onClose,
  onSave,
  snippet,
  copied,
  onCopySnippet,
  extraActionLabel,
  onExtraAction,
  extraActionDisabled,
}: {
  title: string;
  subtitle: string;
  fields: Array<{ key: string; label: string; placeholder: string; type?: 'text' | 'password'; helper?: string }>;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
  snippet: string;
  copied: boolean;
  onCopySnippet: () => void;
  extraActionLabel?: string;
  onExtraAction?: () => void;
  extraActionDisabled?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-sm">
      <div className={`w-full max-w-4xl rounded-[2rem] border p-6 shadow-2xl ${
        theme === 'dark' ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Tracking Setup</p>
            <h3 className="mt-2 text-2xl font-black">{title}</h3>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            {fields.map((field) => (
              <label key={field.key} className="block space-y-2">
                <span className="text-sm font-semibold">{field.label}</span>
                <input
                  type={field.type || 'text'}
                  value={values[field.key] || ''}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition ${
                    theme === 'dark'
                      ? 'border-slate-700 bg-slate-900 text-slate-100 focus:border-blue-500'
                      : 'border-slate-200 bg-slate-100 text-slate-900 focus:border-blue-300 focus:bg-white'
                  }`}
                />
                {field.helper && <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{field.helper}</p>}
              </label>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onSave}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:brightness-110"
              >
                Save Tracking Setup
              </button>
              {extraActionLabel && onExtraAction && (
                <button
                  type="button"
                  onClick={onExtraAction}
                  disabled={extraActionDisabled}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                    extraActionDisabled
                      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                      : 'bg-slate-900 text-white hover:opacity-90'
                  }`}
                >
                  {extraActionLabel}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                Close
              </button>
            </div>
          </div>

          <div className={`rounded-[1.5rem] border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Code2 size={18} className="text-blue-600" />
                <p className="text-sm font-bold">Landing Page Install Snippet</p>
              </div>
              <button
                type="button"
                onClick={onCopySnippet}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                  theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Put this into the landing page or website you use for ads so browser-side tracking can start firing.
            </p>
            <pre className={`mt-4 overflow-x-auto rounded-2xl p-4 text-xs leading-6 ${theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-800'}`}>
              <code>{snippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsPageProps {
  planTier: PlanTier;
  leadUsageCount: number;
  leadLimit: number;
  onUpgradeRequest: (trigger: UpgradeTrigger) => void;
}

export default function SettingsPage({
  planTier,
  leadUsageCount,
  leadLimit,
  onUpgradeRequest,
}: SettingsPageProps) {
  const { user, isDemoMode } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setAdsData, isFetching, syncAdsData, currency, setCurrency } = useDatabase();
  const { currentWorkspace, currentMembership, metaConnection, metaAdAccounts, refreshWorkspaceData } = useWorkspace();

  const [systemName, setSystemName] = useState('Ads Intelligence HQ');
  const [timezone, setTimezone] = useState('GMT+08:00 Kuala Lumpur');
  const [dateView, setDateView] = useState('7-day click, 1-day view');

  const [openAiKey, setOpenAiKey] = useState('');
  const [googleAiKey, setGoogleAiKey] = useState('');
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [creativeAnalysisEnabled, setCreativeAnalysisEnabled] = useState(true);
  const [leadGenerationEnabled, setLeadGenerationEnabled] = useState(true);

  const [warningAlerts, setWarningAlerts] = useState(true);
  const [lowCtrAlerts, setLowCtrAlerts] = useState(true);
  const [highCpmAlerts, setHighCpmAlerts] = useState(false);
  const [roasDropAlerts, setRoasDropAlerts] = useState(true);
  const [dailySummaryAlerts, setDailySummaryAlerts] = useState(true);

  const [metaPixelEnabled, setMetaPixelEnabled] = useState(false);
  const [metaConversionsEnabled, setMetaConversionsEnabled] = useState(false);
  const [googleAnalyticsEnabled, setGoogleAnalyticsEnabled] = useState(false);
  const [googleTagManagerEnabled, setGoogleTagManagerEnabled] = useState(false);

  const [isConnectingMeta, setIsConnectingMeta] = useState(false);
  const [isSelectingMetaAccount, setIsSelectingMetaAccount] = useState<string | null>(null);
  const [isSyncingWorkspaceMeta, setIsSyncingWorkspaceMeta] = useState(false);
  const [metaFeedback, setMetaFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [openAiFeedback, setOpenAiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [googleAiFeedback, setGoogleAiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingOpenAiKey, setIsTestingOpenAiKey] = useState(false);
  const [isTestingGoogleAiKey, setIsTestingGoogleAiKey] = useState(false);
  const [metaSetupState, setMetaSetupState] = useState<MetaSetupState>(EMPTY_META_SETUP_STATE);
  const [openAiConnectionState, setOpenAiConnectionState] = useState<AiConnectionState>(EMPTY_AI_CONNECTION_STATE);
  const [googleAiConnectionState, setGoogleAiConnectionState] = useState<AiConnectionState>(EMPTY_AI_CONNECTION_STATE);
  const [savedSettingsSnapshot, setSavedSettingsSnapshot] = useState<string | null>(null);
  const [hasHydratedAiStorage, setHasHydratedAiStorage] = useState(false);
  const [trackingConfig, setTrackingConfig] = useState<TrackingConfig>(DEFAULT_TRACKING_CONFIG);
  const [activeTrackingModal, setActiveTrackingModal] = useState<TrackingProviderKey | null>(null);
  const [trackingFeedback, setTrackingFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedTrackingSnippet, setCopiedTrackingSnippet] = useState<TrackingProviderKey | null>(null);
  const [isTestingMetaCapi, setIsTestingMetaCapi] = useState(false);

  const isFreePlan = planTier === 'free';
  const isWorkspaceOwner = currentMembership?.role === 'owner';
  const metaStatus = metaConnection?.status || 'not_connected';
  const isMetaConnected = metaStatus === 'connected';
  const primaryMetaAccountId =
    metaConnection?.connected_account_id ||
    metaAdAccounts.find((account) => account.is_primary)?.meta_ad_account_id ||
    null;

  const workspaceStatusLabel = useMemo(() => {
    if (!currentWorkspace) return 'No workspace';
    if (isMetaConnected) return 'Live';
    if (metaStatus === 'expired' || metaStatus === 'error') return 'Needs Attention';
    return 'Setup';
  }, [currentWorkspace, isMetaConnected, metaStatus]);

  const scrollToSettingsSection = (section: string | null) => {
    if (!section) return;

    const target = document.querySelector<HTMLElement>(`[data-settings-section="${section}"]`);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    localStorage.removeItem(SETTINGS_SECTION_STORAGE_KEY);
  };

  const connectedAiProviders = useMemo(
    () => [openAiConnectionState, googleAiConnectionState].filter((provider) => provider.status === 'connected').length,
    [googleAiConnectionState, openAiConnectionState]
  );

  const aiReadinessMessage = useMemo(() => {
    if (connectedAiProviders === 0) {
      return 'No AI provider is connected yet. Test an API key to unlock live AI features.';
    }

    if (!aiAssistantEnabled) {
      return 'An AI provider is connected, but the assistant is switched to manual mode.';
    }

    return `${connectedAiProviders} AI provider${connectedAiProviders === 1 ? '' : 's'} connected and ready for live prompts.`;
  }, [aiAssistantEnabled, connectedAiProviders]);

  const trackingStatuses = useMemo(() => ({
    meta_pixel: Boolean(trackingConfig.meta_pixel.pixelId.trim()),
    meta_capi: Boolean(trackingConfig.meta_capi.pixelId.trim() && trackingConfig.meta_capi.accessToken.trim()),
    ga4: Boolean(trackingConfig.ga4.measurementId.trim()),
    gtm: Boolean(trackingConfig.gtm.containerId.trim()),
  }), [trackingConfig]);

  const activeTrackingConfig = activeTrackingModal ? trackingConfig[activeTrackingModal] : null;

  const trackingSnippet = useMemo(() => {
    if (!activeTrackingModal || !activeTrackingConfig) return '';

    if (activeTrackingModal === 'meta_pixel') {
      return `<!-- Meta Pixel -->\n<script>\n!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?\n n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;\n n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;\n t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',\n 'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '${activeTrackingConfig.pixelId || 'YOUR_PIXEL_ID'}');\nfbq('track', 'PageView');\n</script>`;
    }

    if (activeTrackingModal === 'meta_capi') {
      return `// Example server-side Conversions API payload\nfetch('https://graph.facebook.com/v22.0/${activeTrackingConfig.pixelId || 'YOUR_PIXEL_ID'}/events', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    data: [{\n      event_name: 'Lead',\n      event_time: Math.floor(Date.now() / 1000),\n      action_source: 'website',\n      event_source_url: '${activeTrackingConfig.landingPageUrl || 'https://your-landing-page.com'}'\n    }],\n    access_token: '${activeTrackingConfig.accessToken || 'YOUR_CAPI_ACCESS_TOKEN'}',\n    test_event_code: '${activeTrackingConfig.testEventCode || 'OPTIONAL_TEST_EVENT_CODE'}'\n  })\n});`;
    }

    if (activeTrackingModal === 'ga4') {
      return `<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${activeTrackingConfig.measurementId || 'G-XXXXXXXXXX'}"></script>\n<script>\nwindow.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', '${activeTrackingConfig.measurementId || 'G-XXXXXXXXXX'}');\n</script>`;
    }

    return `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','${activeTrackingConfig.containerId || 'GTM-XXXXXXX'}');</script>`;
  }, [activeTrackingConfig, activeTrackingModal]);

  const applyWorkspaceSettings = (settings: WorkspaceSettings) => {
    setSystemName(settings.system_name);
    setCurrency(settings.currency);
    setTimezone(settings.timezone);
    setDateView(settings.attribution_window);
    setMetaPixelEnabled(settings.meta_pixel_enabled);
    setMetaConversionsEnabled(settings.meta_conversions_enabled);
    setGoogleAnalyticsEnabled(settings.google_analytics_enabled);
    setGoogleTagManagerEnabled(settings.google_tag_manager_enabled);
    setAiAssistantEnabled(settings.ai_assistant_enabled);
    setCreativeAnalysisEnabled(settings.creative_analysis_enabled);
    setLeadGenerationEnabled(settings.lead_generation_enabled);
    setWarningAlerts(settings.warning_alerts_enabled);
    setLowCtrAlerts(settings.low_ctr_alert_enabled);
    setHighCpmAlerts(settings.high_cpm_alert_enabled);
    setRoasDropAlerts(settings.roas_drop_alert_enabled);
    setDailySummaryAlerts(settings.daily_summary_alert_enabled);
  };

  const currentSettings = useMemo<WorkspaceSettings | null>(() => {
    if (!currentWorkspace) {
      return null;
    }

    return {
      workspace_id: currentWorkspace.id,
      system_name: systemName,
      currency,
      timezone,
      attribution_window: dateView,
      meta_pixel_enabled: metaPixelEnabled,
      meta_conversions_enabled: metaConversionsEnabled,
      google_analytics_enabled: googleAnalyticsEnabled,
      google_tag_manager_enabled: googleTagManagerEnabled,
      ai_assistant_enabled: aiAssistantEnabled,
      creative_analysis_enabled: creativeAnalysisEnabled,
      lead_generation_enabled: leadGenerationEnabled,
      warning_alerts_enabled: warningAlerts,
      low_ctr_alert_enabled: lowCtrAlerts,
      high_cpm_alert_enabled: highCpmAlerts,
      roas_drop_alert_enabled: roasDropAlerts,
      daily_summary_alert_enabled: dailySummaryAlerts,
    };
  }, [
    aiAssistantEnabled,
    creativeAnalysisEnabled,
    currency,
    currentWorkspace,
    dailySummaryAlerts,
    dateView,
    googleAnalyticsEnabled,
    googleTagManagerEnabled,
    highCpmAlerts,
    leadGenerationEnabled,
    lowCtrAlerts,
    metaConversionsEnabled,
    metaPixelEnabled,
    roasDropAlerts,
    systemName,
    timezone,
    warningAlerts,
  ]);

  const hasUnsavedChanges = useMemo(() => {
    if (!currentSettings || !savedSettingsSnapshot) {
      return false;
    }

    return JSON.stringify(currentSettings) !== savedSettingsSnapshot;
  }, [currentSettings, savedSettingsSnapshot]);

  const handleTestRule = (ctr: number, roas: number, cpm: number, conversions: number) => {
    setAdsData([{
      id: 'settings_test_campaign',
      campaign_name: 'Settings_Test_Campaign',
      spend: 1000,
      CTR: ctr,
      CPM: cpm,
      ROAS: roas,
      conversions,
      revenue: roas * 1000,
      date: new Date().toISOString(),
      platform: 'meta',
    }]);
  };

  useEffect(() => {
    if (!currentWorkspace) {
      setSavedSettingsSnapshot(null);
      setHasHydratedAiStorage(false);
      setTrackingConfig(DEFAULT_TRACKING_CONFIG);
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      setIsLoadingSettings(true);
      setHasHydratedAiStorage(false);
      setSaveFeedback(null);

      const { data, error } = await getWorkspaceSettings(currentWorkspace.id, currentWorkspace.name);
      if (cancelled) {
        return;
      }

      applyWorkspaceSettings(data);
      setSavedSettingsSnapshot(JSON.stringify(data));

      const storedKeys = localStorage.getItem(buildApiKeysStorageKey(currentWorkspace.id));
      if (storedKeys) {
        try {
          const parsed = JSON.parse(storedKeys) as { openAiKey?: string; googleAiKey?: string };
          setOpenAiKey(parsed.openAiKey || '');
          setGoogleAiKey(parsed.googleAiKey || '');
        } catch {
          setOpenAiKey('');
          setGoogleAiKey('');
        }
      } else {
        setOpenAiKey('');
        setGoogleAiKey('');
      }

      const storedConnections = localStorage.getItem(buildAiConnectionStorageKey(currentWorkspace.id));
      if (storedConnections) {
        try {
          const parsed = JSON.parse(storedConnections) as {
            openAi?: AiConnectionState;
            googleAi?: AiConnectionState;
          };
          setOpenAiConnectionState(parsed.openAi || EMPTY_AI_CONNECTION_STATE);
          setGoogleAiConnectionState(parsed.googleAi || EMPTY_AI_CONNECTION_STATE);
        } catch {
          setOpenAiConnectionState(EMPTY_AI_CONNECTION_STATE);
          setGoogleAiConnectionState(EMPTY_AI_CONNECTION_STATE);
        }
      } else {
        setOpenAiConnectionState(EMPTY_AI_CONNECTION_STATE);
        setGoogleAiConnectionState(EMPTY_AI_CONNECTION_STATE);
      }

      if (storedKeys) {
        try {
          const parsed = JSON.parse(storedKeys) as { openAiKey?: string; googleAiKey?: string };
          if (parsed.openAiKey && !storedConnections) {
            setOpenAiConnectionState({
              status: 'connected',
              message: `Key saved locally in this browser (${maskApiKey(parsed.openAiKey)}).`,
              checkedAt: null,
            });
          }
          if (parsed.googleAiKey && !storedConnections) {
            setGoogleAiConnectionState({
              status: 'connected',
              message: `Key saved locally in this browser (${maskApiKey(parsed.googleAiKey)}).`,
              checkedAt: null,
            });
          }
        } catch {
          // Ignore malformed local AI key cache.
        }
      }

      const storedTrackingConfig = localStorage.getItem(buildTrackingConfigStorageKey(currentWorkspace.id));
      if (storedTrackingConfig) {
        try {
          const parsed = JSON.parse(storedTrackingConfig) as Partial<TrackingConfig>;
          setTrackingConfig({
            meta_pixel: {
              ...DEFAULT_TRACKING_CONFIG.meta_pixel,
              ...(parsed.meta_pixel || {}),
            },
            meta_capi: {
              ...DEFAULT_TRACKING_CONFIG.meta_capi,
              ...(parsed.meta_capi || {}),
            },
            ga4: {
              ...DEFAULT_TRACKING_CONFIG.ga4,
              ...(parsed.ga4 || {}),
            },
            gtm: {
              ...DEFAULT_TRACKING_CONFIG.gtm,
              ...(parsed.gtm || {}),
            },
          });
        } catch {
          setTrackingConfig(DEFAULT_TRACKING_CONFIG);
        }
      } else {
        setTrackingConfig(DEFAULT_TRACKING_CONFIG);
      }

      if (error && error !== 'Supabase is not configured yet.') {
        setSaveFeedback({
          type: 'error',
          message: `Settings loaded with defaults because the saved record could not be read: ${error}`,
        });
      }

      setHasHydratedAiStorage(true);
      setIsLoadingSettings(false);
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [currentWorkspace]);

  useEffect(() => {
    if (!currentWorkspace || !hasHydratedAiStorage) {
      return;
    }

    localStorage.setItem(buildApiKeysStorageKey(currentWorkspace.id), JSON.stringify({
      openAiKey,
      googleAiKey,
    }));
  }, [currentWorkspace, googleAiKey, hasHydratedAiStorage, openAiKey]);

  useEffect(() => {
    if (!currentWorkspace || !hasHydratedAiStorage) {
      return;
    }

    localStorage.setItem(buildAiConnectionStorageKey(currentWorkspace.id), JSON.stringify({
      openAi: openAiConnectionState,
      googleAi: googleAiConnectionState,
    }));
  }, [currentWorkspace, googleAiConnectionState, hasHydratedAiStorage, openAiConnectionState]);

  useEffect(() => {
    if (!currentWorkspace || !hasHydratedAiStorage) {
      return;
    }

    localStorage.setItem(buildTrackingConfigStorageKey(currentWorkspace.id), JSON.stringify(trackingConfig));
  }, [currentWorkspace, hasHydratedAiStorage, trackingConfig]);

  useEffect(() => {
    let cancelled = false;

    const loadMetaSetup = async () => {
      setMetaSetupState((current) => ({
        ...current,
        isLoading: true,
        error: null,
      }));

      const result = await checkMetaSetup();
      if (cancelled) {
        return;
      }

      if (result.ok === false) {
        setMetaSetupState({
          ...EMPTY_META_SETUP_STATE,
          isLoading: false,
          error: result.error,
        });
        return;
      }

      setMetaSetupState({
        isLoading: false,
        ready: result.ready,
        error: null,
        checks: result.checks,
        missingMetaEnvVars: result.missingMetaEnvVars,
        missingSupabaseEnvVars: result.missingSupabaseEnvVars,
        redirectUri: result.redirectUri,
        postConnectRedirect: result.postConnectRedirect,
      });
    };

    void loadMetaSetup();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const applyPendingSection = () => {
      const pendingSection = localStorage.getItem(SETTINGS_SECTION_STORAGE_KEY);
      if (pendingSection) {
        window.setTimeout(() => scrollToSettingsSection(pendingSection), 80);
      }
    };

    const handleSectionEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ section?: string }>;
      window.setTimeout(() => scrollToSettingsSection(customEvent.detail?.section || null), 80);
    };

    applyPendingSection();
    window.addEventListener(SETTINGS_SECTION_EVENT, handleSectionEvent as EventListener);

    return () => {
      window.removeEventListener(SETTINGS_SECTION_EVENT, handleSectionEvent as EventListener);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const metaStatusParam = searchParams.get('meta_status');
    const metaMessageParam = searchParams.get('meta_message');

    if (!metaStatusParam) {
      return;
    }

    setMetaFeedback({
      type: metaStatusParam === 'connected' ? 'success' : 'error',
      message: metaStatusParam === 'connected'
        ? 'Meta Ads connected successfully. You can now select the main ad account and sync live data.'
        : metaMessageParam || 'Meta Ads connection failed. Please try again.',
    });

    void refreshWorkspaceData();

    searchParams.delete('meta_status');
    searchParams.delete('meta_message');
    const nextQuery = searchParams.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [refreshWorkspaceData]);

  const handleMetaConnect = async () => {
    if (!currentWorkspace) {
      setMetaFeedback({
        type: 'error',
        message: 'No active workspace was found for this account yet.',
      });
      return;
    }

    setIsConnectingMeta(true);
    setMetaFeedback(null);

    try {
      const result = await beginMetaConnection(currentWorkspace.id);

      if (!result.ok) {
        setMetaFeedback({
          type: 'error',
          message: result.error,
        });
        return;
      }

      window.location.href = result.url;
    } finally {
      setIsConnectingMeta(false);
    }
  };

  const handleSelectMetaAccount = async (adAccountId: string) => {
    if (!currentWorkspace) {
      setMetaFeedback({
        type: 'error',
        message: 'No active workspace was found for this account yet.',
      });
      return;
    }

    setIsSelectingMetaAccount(adAccountId);
    setMetaFeedback(null);

    try {
      const result = await selectPrimaryMetaAdAccount(currentWorkspace.id, adAccountId);

      if (!result.ok) {
        setMetaFeedback({
          type: 'error',
          message: result.error,
        });
        return;
      }

      setMetaFeedback({
        type: 'success',
        message: `${result.selectedAccount.name} is now the primary Meta ad account for this workspace.`,
      });
      await refreshWorkspaceData();
    } finally {
      setIsSelectingMetaAccount(null);
    }
  };

  const handleWorkspaceMetaSync = async () => {
    if (!currentWorkspace) {
      setMetaFeedback({
        type: 'error',
        message: 'No active workspace was found for this account yet.',
      });
      return;
    }

    setIsSyncingWorkspaceMeta(true);
    setMetaFeedback(null);

    try {
      const result = await syncPrimaryMetaAccount(currentWorkspace.id);

      if (!result.ok) {
        setMetaFeedback({
          type: 'error',
          message: result.error,
        });
        return;
      }

      setAdsData(result.campaigns);
      setMetaFeedback({
        type: 'success',
        message: `${result.campaigns.length} campaign snapshot${result.campaigns.length === 1 ? '' : 's'} synced from ${result.connectedAccount.name || 'the selected Meta account'}.`,
      });
      await refreshWorkspaceData();
    } finally {
      setIsSyncingWorkspaceMeta(false);
    }
  };

  const handleDiscardChanges = async () => {
    if (!currentWorkspace) {
      return;
    }

    const { data } = await getWorkspaceSettings(currentWorkspace.id, currentWorkspace.name);
    applyWorkspaceSettings(data);
    setSavedSettingsSnapshot(JSON.stringify(data));
    setSaveFeedback(null);
  };

  const handleSavePreferences = async () => {
    if (!currentSettings) {
      return;
    }

    setIsSavingSettings(true);
    setSaveFeedback(null);

    try {
      const result = await upsertWorkspaceSettings(currentSettings);
      if (result.error) {
        setSaveFeedback({
          type: 'error',
          message: result.error,
        });
        return;
      }

      setSavedSettingsSnapshot(JSON.stringify(currentSettings));
      setSaveFeedback({
        type: 'success',
        message: 'Workspace settings saved successfully. API keys stay only in this browser until a secure server-side vault route is added.',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTestOpenAiKey = async () => {
    const trimmedKey = openAiKey.trim();

    if (!trimmedKey) {
      setOpenAiFeedback({
        type: 'error',
        message: 'Enter an OpenAI API key first.',
      });
      return;
    }

    setIsTestingOpenAiKey(true);
    setOpenAiFeedback(null);
    setOpenAiConnectionState({
      status: 'testing',
      message: 'Testing OpenAI connection...',
      checkedAt: null,
    });

    try {
      const result = await validateOpenAiKey(trimmedKey);

      if (result.ok === false) {
        setOpenAiFeedback({
          type: 'error',
          message: result.error,
        });
        setOpenAiConnectionState({
          status: 'error',
          message: result.error,
          checkedAt: new Date().toISOString(),
        });
        return;
      }

      const sampleModels = result.sampleModels.length > 0
        ? ` Sample models: ${result.sampleModels.join(', ')}.`
        : '';

      setOpenAiFeedback({
        type: 'success',
        message: `${result.message} ${result.availableModelCount} model${result.availableModelCount === 1 ? '' : 's'} visible to this key.${sampleModels}`.trim(),
      });
      setOpenAiConnectionState({
        status: 'connected',
        message: `${result.availableModelCount} model${result.availableModelCount === 1 ? '' : 's'} visible to this key.`,
        checkedAt: new Date().toISOString(),
      });

      if (currentWorkspace) {
        const nextCheckedAt = new Date().toISOString();
        localStorage.setItem(buildApiKeysStorageKey(currentWorkspace.id), JSON.stringify({
          openAiKey: trimmedKey,
          googleAiKey,
        }));
        localStorage.setItem(buildAiConnectionStorageKey(currentWorkspace.id), JSON.stringify({
          openAi: {
            status: 'connected',
            message: `${result.availableModelCount} model${result.availableModelCount === 1 ? '' : 's'} visible to this key.`,
            checkedAt: nextCheckedAt,
          },
          googleAi: googleAiConnectionState,
        }));
      }
    } finally {
      setIsTestingOpenAiKey(false);
    }
  };

  const handleTestGoogleAiKey = async () => {
    const trimmedKey = googleAiKey.trim();

    if (!trimmedKey) {
      setGoogleAiFeedback({
        type: 'error',
        message: 'Enter a Google AI API key first.',
      });
      return;
    }

    setIsTestingGoogleAiKey(true);
    setGoogleAiFeedback(null);
    setGoogleAiConnectionState({
      status: 'testing',
      message: 'Testing Google AI connection...',
      checkedAt: null,
    });

    try {
      const result = await validateGoogleAiKey(trimmedKey);

      if (result.ok === false) {
        setGoogleAiFeedback({
          type: 'error',
          message: result.error,
        });
        setGoogleAiConnectionState({
          status: 'error',
          message: result.error,
          checkedAt: new Date().toISOString(),
        });
        return;
      }

      const responsePreview = result.responsePreview
        ? ` Response: "${result.responsePreview}".`
        : '';

      setGoogleAiFeedback({
        type: 'success',
        message: `${result.message} Model: ${result.model}.${responsePreview}`.trim(),
      });
      setGoogleAiConnectionState({
        status: 'connected',
        message: `${result.model} replied successfully.`,
        checkedAt: new Date().toISOString(),
      });

      if (currentWorkspace) {
        const nextCheckedAt = new Date().toISOString();
        localStorage.setItem(buildApiKeysStorageKey(currentWorkspace.id), JSON.stringify({
          openAiKey,
          googleAiKey: trimmedKey,
        }));
        localStorage.setItem(buildAiConnectionStorageKey(currentWorkspace.id), JSON.stringify({
          openAi: openAiConnectionState,
          googleAi: {
            status: 'connected',
            message: `${result.model} replied successfully.`,
            checkedAt: nextCheckedAt,
          },
        }));
      }
    } finally {
      setIsTestingGoogleAiKey(false);
    }
  };

  const handleDisconnectOpenAi = () => {
    setOpenAiKey('');
    setOpenAiFeedback({
      type: 'success',
      message: 'OpenAI key removed from this browser for the current workspace.',
    });
    setOpenAiConnectionState(EMPTY_AI_CONNECTION_STATE);

    if (currentWorkspace) {
      localStorage.setItem(buildApiKeysStorageKey(currentWorkspace.id), JSON.stringify({
        openAiKey: '',
        googleAiKey,
      }));
      localStorage.setItem(buildAiConnectionStorageKey(currentWorkspace.id), JSON.stringify({
        openAi: EMPTY_AI_CONNECTION_STATE,
        googleAi: googleAiConnectionState,
      }));
    }
  };

  const handleDisconnectGoogleAi = () => {
    setGoogleAiKey('');
    setGoogleAiFeedback({
      type: 'success',
      message: 'Google AI key removed from this browser for the current workspace.',
    });
    setGoogleAiConnectionState(EMPTY_AI_CONNECTION_STATE);

    if (currentWorkspace) {
      localStorage.setItem(buildApiKeysStorageKey(currentWorkspace.id), JSON.stringify({
        openAiKey,
        googleAiKey: '',
      }));
      localStorage.setItem(buildAiConnectionStorageKey(currentWorkspace.id), JSON.stringify({
        openAi: openAiConnectionState,
        googleAi: EMPTY_AI_CONNECTION_STATE,
      }));
    }
  };

  const updateTrackingValue = (provider: TrackingProviderKey, key: string, value: string) => {
    setTrackingConfig((previous) => ({
      ...previous,
      [provider]: {
        ...previous[provider],
        [key]: value,
      },
    }));
  };

  const handleSaveTrackingConfig = () => {
    if (!activeTrackingModal) return;

    if (activeTrackingModal === 'meta_pixel') {
      setMetaPixelEnabled(Boolean(trackingConfig.meta_pixel.pixelId.trim()));
    } else if (activeTrackingModal === 'meta_capi') {
      setMetaConversionsEnabled(Boolean(trackingConfig.meta_capi.pixelId.trim() && trackingConfig.meta_capi.accessToken.trim()));
    } else if (activeTrackingModal === 'ga4') {
      setGoogleAnalyticsEnabled(Boolean(trackingConfig.ga4.measurementId.trim()));
    } else if (activeTrackingModal === 'gtm') {
      setGoogleTagManagerEnabled(Boolean(trackingConfig.gtm.containerId.trim()));
    }

    setTrackingFeedback({
      type: 'success',
      message: `${activeTrackingModal.replace('_', ' ')} configuration saved for this workspace in this browser.`,
    });
    setActiveTrackingModal(null);
  };

  const handleCopyTrackingSnippet = async () => {
    if (!activeTrackingModal || !trackingSnippet) return;

    try {
      await navigator.clipboard.writeText(trackingSnippet);
      setCopiedTrackingSnippet(activeTrackingModal);
      setTimeout(() => setCopiedTrackingSnippet(null), 2000);
    } catch {
      setTrackingFeedback({
        type: 'error',
        message: 'Could not copy the tracking snippet automatically. Please copy it manually.',
      });
    }
  };

  const handleTestMetaCapi = async () => {
    const { pixelId, accessToken, testEventCode, landingPageUrl } = trackingConfig.meta_capi;
    if (!pixelId.trim() || !accessToken.trim()) {
      setTrackingFeedback({
        type: 'error',
        message: 'Meta CAPI test requires both a Pixel ID and a CAPI access token.',
      });
      return;
    }

    setIsTestingMetaCapi(true);
    try {
      const response = await fetch('/api/meta-capi-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pixelId: pixelId.trim(),
          accessToken: accessToken.trim(),
          testEventCode: testEventCode.trim(),
          landingPageUrl: landingPageUrl.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setTrackingFeedback({
          type: 'error',
          message: payload.error || 'Meta CAPI test failed.',
        });
        return;
      }

      setTrackingFeedback({
        type: 'success',
        message: payload.message || 'Meta CAPI test event sent successfully.',
      });
    } catch (error) {
      setTrackingFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Meta CAPI test failed.',
      });
    } finally {
      setIsTestingMetaCapi(false);
    }
  };

  return (
    <main className="mx-auto max-w-[920px] px-4 pb-16 sm:px-6 lg:px-8">
      <div className={`rounded-[2.25rem] border px-5 py-8 shadow-[0_22px_70px_rgba(15,23,42,0.08)] sm:px-8 ${
        theme === 'dark'
          ? 'border-slate-700 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)]'
          : 'border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]'
      }`}>
        <div className={`mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between ${
          theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Settings</p>
            <h1 className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${theme === 'dark' ? 'text-slate-50' : 'text-slate-950'}`}>Settings</h1>
            <p className={`mt-2 max-w-2xl text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Manage your system, tracking, AI connections, and alerts so backend features have a clear place to plug in.
            </p>
          </div>

          <div className={`flex items-center gap-2 self-start rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
            theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
          }`}>
            <span className={`h-2 w-2 rounded-full ${isMetaConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {workspaceStatusLabel}
          </div>
        </div>

        {metaFeedback && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${
              metaFeedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {metaFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
            <p>{metaFeedback.message}</p>
          </div>
        )}

        {saveFeedback && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${
              saveFeedback.type === 'success'
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {saveFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
            <p>{saveFeedback.message}</p>
          </div>
        )}

        {isLoadingSettings && (
          <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
            theme === 'dark'
              ? 'border-slate-700 bg-slate-800 text-slate-300'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}>
            Loading saved workspace settings...
          </div>
        )}

        <div className="space-y-6">
          <div data-settings-section="account">
            <SectionCard
              icon={User}
              title="Account Settings"
              description="Your signed-in identity, role, and onboarding controls"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${
                  theme === 'dark' ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50/80'
                }`}>
                  <p className={`text-xs font-black uppercase tracking-[0.24em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Email</p>
                  <p className={`mt-2 text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                    {isDemoMode ? 'demo@adsintel.local' : user?.email || 'Not signed in'}
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 ${
                  theme === 'dark' ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50/80'
                }`}>
                  <p className={`text-xs font-black uppercase tracking-[0.24em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Workspace Role</p>
                  <p className={`mt-2 text-sm font-semibold capitalize ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                    {isDemoMode ? 'demo owner' : currentMembership?.role || 'member'}
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 md:col-span-2 ${
                  theme === 'dark' ? 'border-slate-700 bg-slate-900/75' : 'border-slate-200 bg-white'
                }`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Restart onboarding</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Reopen the original setup flow for this browser if you want to review the first-time steps again.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('ads-intel-onboarded');
                        window.location.reload();
                      }}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                    >
                      Restart Onboarding
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div data-settings-section="workspace">
            <SectionCard
              icon={Building2}
              title="Workspace Settings"
              description="Workspace identity, currency, and reporting defaults"
            >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Workspace name" helper="Shown across dashboards and reports">
                <input
                  id="settings-system-name"
                  type="text"
                  value={systemName}
                  onChange={(event) => setSystemName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
                />
              </Field>

              <Field label="Currency" helper="Default currency used in charts and metrics">
                <select
                  id="settings-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
                >
                  <option value="MYR">MYR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </Field>

              <Field label="Timezone" helper="Used for report cutoffs and sync timestamps">
                <select
                  id="settings-timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
                >
                  <option>GMT+08:00 Kuala Lumpur</option>
                  <option>GMT+00:00 UTC</option>
                  <option>GMT-08:00 Pacific Time</option>
                </select>
              </Field>

              <Field label="Attribution window" helper="Useful later for backend analytics logic">
                <select
                  id="settings-date-view"
                  value={dateView}
                  onChange={(event) => setDateView(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
                >
                  <option>7-day click, 1-day view</option>
                  <option>1-day click</option>
                  <option>28-day click</option>
                </select>
              </Field>
            </div>
            </SectionCard>
          </div>

          <SectionCard
            icon={Sparkles}
            title="Appearance"
            description="Choose how the workspace looks in this browser"
          >
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${
                theme === 'dark' ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50/80'
              }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Theme mode</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Switch between the default light look and a darker workspace shell. This preference is saved locally on this device.
                    </p>
                  </div>
                  <div className={`flex rounded-2xl border p-1 ${
                    theme === 'dark' ? 'border-slate-700' : 'border-slate-300/70'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                        theme === 'light'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark'
                            ? 'text-slate-300 hover:bg-slate-700'
                            : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                        theme === 'dark'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark'
                            ? 'text-slate-300 hover:bg-slate-700'
                            : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Link2}
            title="Ads Integrations"
            description="Connect ad platforms and define which source should sync first"
          >
            <div className="space-y-4">
              <IntegrationRow
                icon={<span className="text-sm font-black text-blue-600">M</span>}
                title="Meta Ads"
                subtitle={
                  currentWorkspace
                    ? `${currentWorkspace.name}${primaryMetaAccountId ? ' - Primary account selected' : ' - Waiting for account selection'}`
                    : 'Workspace required before connecting Meta Ads'
                }
                status={{
                  label: isMetaConnected ? 'Connected' : 'Not Connected',
                  tone: isMetaConnected ? 'success' : 'warning',
                }}
                action={isConnectingMeta ? 'Connecting...' : isMetaConnected ? 'Reconnect' : 'Connect'}
                actionId="settings-connect-meta"
                onAction={handleMetaConnect}
                disabled={isConnectingMeta || !currentWorkspace || metaSetupState.isLoading || !metaSetupState.ready}
              />

              <IntegrationRow
                icon={<Globe size={18} />}
                title="Google Ads"
                subtitle="Demo sync is available now while the full Google OAuth connection is still being wired"
                status={{ label: 'Demo Sync', tone: 'neutral' }}
                action={isFetching ? 'Syncing...' : 'Sync Demo'}
                actionId="settings-sync-google"
                onAction={() => void syncAdsData('google')}
                disabled={isFetching}
              />

              <div className={`rounded-2xl border border-dashed px-4 py-4 ${
                theme === 'dark' ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-white'
              }`}>
                <div className={`mb-4 rounded-2xl border px-4 py-4 text-sm ${
                  metaSetupState.error
                    ? theme === 'dark' ? 'border-rose-500/30 bg-rose-950/30 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'
                    : metaSetupState.ready
                      ? theme === 'dark' ? 'border-emerald-500/30 bg-emerald-950/25 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : theme === 'dark' ? 'border-amber-500/30 bg-amber-950/25 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">Meta setup diagnostic</p>
                      <p className="mt-1 text-xs">
                        {metaSetupState.isLoading
                          ? 'Checking server configuration for Meta OAuth...'
                          : metaSetupState.error
                            ? metaSetupState.error
                            : metaSetupState.ready
                              ? 'Meta OAuth is configured. You can connect Ads Manager now.'
                              : 'Meta OAuth is not ready yet. Fix the missing items below before clicking Connect.'}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      metaSetupState.error
                        ? theme === 'dark' ? 'bg-rose-900/50 text-rose-200' : 'bg-rose-100 text-rose-700'
                        : metaSetupState.ready
                          ? theme === 'dark' ? 'bg-emerald-900/50 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                          : theme === 'dark' ? 'bg-amber-900/50 text-amber-200' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {metaSetupState.isLoading ? 'Checking' : metaSetupState.ready ? 'Ready' : 'Setup Needed'}
                    </span>
                  </div>

                  {!metaSetupState.isLoading && !metaSetupState.error && (
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className={`rounded-xl px-3 py-3 ${metaSetupState.checks.metaOAuthConfigured ? theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100/60' : theme === 'dark' ? 'bg-slate-800' : 'bg-white/80'}`}>
                          <p className="text-[11px] font-bold uppercase tracking-wider">Meta OAuth</p>
                          <p className="mt-1 text-xs">{metaSetupState.checks.metaOAuthConfigured ? 'Configured' : 'Missing config'}</p>
                        </div>
                        <div className={`rounded-xl px-3 py-3 ${metaSetupState.checks.supabaseConfigured ? theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100/60' : theme === 'dark' ? 'bg-slate-800' : 'bg-white/80'}`}>
                          <p className="text-[11px] font-bold uppercase tracking-wider">Supabase</p>
                          <p className="mt-1 text-xs">{metaSetupState.checks.supabaseConfigured ? 'Configured' : 'Missing config'}</p>
                        </div>
                        <div className={`rounded-xl px-3 py-3 ${metaSetupState.checks.tokenEncryptionConfigured ? theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100/60' : theme === 'dark' ? 'bg-slate-800' : 'bg-white/80'}`}>
                          <p className="text-[11px] font-bold uppercase tracking-wider">Token Encryption</p>
                          <p className="mt-1 text-xs">{metaSetupState.checks.tokenEncryptionConfigured ? 'Configured' : 'Missing config'}</p>
                        </div>
                      </div>

                      {metaSetupState.missingMetaEnvVars.length > 0 && (
                        <p className="text-xs">
                          Missing Meta env vars: {metaSetupState.missingMetaEnvVars.join(', ')}
                        </p>
                      )}

                      {metaSetupState.missingSupabaseEnvVars.length > 0 && (
                        <p className="text-xs">
                          Missing Supabase env vars: {metaSetupState.missingSupabaseEnvVars.join(', ')}
                        </p>
                      )}

                      {metaSetupState.redirectUri && (
                        <p className="text-xs">
                          Redirect URI: <span className="font-semibold">{metaSetupState.redirectUri}</span>
                        </p>
                      )}

                      {metaSetupState.postConnectRedirect && (
                        <p className="text-xs">
                          Post-connect redirect: <span className="font-semibold">{metaSetupState.postConnectRedirect}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Data actions</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Keep these buttons available now so backend sync flows already have clear entry points.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      id="settings-sync-meta-live"
                      type="button"
                      onClick={() => void handleWorkspaceMetaSync()}
                      disabled={!isMetaConnected || isSyncingWorkspaceMeta}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                        !isMetaConnected || isSyncingWorkspaceMeta
                          ? theme === 'dark' ? 'cursor-not-allowed bg-slate-700 text-slate-400' : 'cursor-not-allowed bg-slate-200 text-slate-500'
                          : 'bg-slate-900 text-white hover:opacity-90'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw size={14} className={isSyncingWorkspaceMeta ? 'animate-spin' : ''} />
                        {isSyncingWorkspaceMeta ? 'Syncing Meta' : 'Sync Meta Data'}
                      </span>
                    </button>
                    <button
                      id="settings-sync-all"
                      type="button"
                      onClick={() => void syncAdsData('all')}
                      disabled={isFetching}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                        isFetching
                          ? theme === 'dark' ? 'cursor-not-allowed bg-slate-700 text-slate-400' : 'cursor-not-allowed bg-slate-200 text-slate-500'
                          : 'bg-blue-600 text-white hover:brightness-110'
                      }`}
                    >
                      {isFetching ? 'Syncing All...' : 'Sync All Sources'}
                    </button>
                  </div>
                </div>

                {isMetaConnected && metaAdAccounts.length > 0 && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {metaAdAccounts.map((account) => {
                      const isPrimary = primaryMetaAccountId === account.meta_ad_account_id;
                      const isSaving = isSelectingMetaAccount === account.meta_ad_account_id;

                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => void handleSelectMetaAccount(account.meta_ad_account_id)}
                          disabled={isSaving}
                          className={`rounded-2xl border p-4 text-left transition ${
                            isPrimary
                              ? theme === 'dark' ? 'border-blue-500/40 bg-blue-950/30' : 'border-blue-200 bg-blue-50'
                              : theme === 'dark' ? 'border-slate-700 bg-slate-800 hover:border-slate-600' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          } ${isSaving ? 'cursor-wait opacity-70' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{account.ad_account_name}</p>
                              <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{account.meta_ad_account_id}</p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              isPrimary ? 'bg-blue-600 text-white' : theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600'
                            }`}>
                              {isSaving ? 'Saving' : isPrimary ? 'Primary' : 'Select'}
                            </span>
                          </div>
                          <div className={`mt-4 flex items-center gap-2 text-[11px] font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span>{account.account_currency || 'No currency'}</span>
                            <span className={`h-1 w-1 rounded-full ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`} />
                            <span>{account.account_status || 'Status unknown'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Target}
            title="Tracking & Analytics"
            description="Frontend controls for analytics tags and conversion endpoints"
          >
            <div>
              {trackingFeedback && (
                <div
                  className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                    trackingFeedback.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  {trackingFeedback.message}
                </div>
              )}
              <TrackingRow
                icon={<Target size={18} />}
                title="Meta Pixel"
                subtitle={trackingStatuses.meta_pixel
                  ? `Pixel ${trackingConfig.meta_pixel.pixelId} is ready for your landing page`
                  : 'Attach browser-side event tracking for landing pages and funnels'}
                connected={trackingStatuses.meta_pixel}
                primaryAction={trackingStatuses.meta_pixel ? 'Manage' : 'Add'}
                secondaryAction="Manage"
                onPrimary={() => setActiveTrackingModal('meta_pixel')}
                onSecondary={() => setActiveTrackingModal('meta_pixel')}
              />
              <TrackingRow
                icon={<ChevronRight size={18} />}
                title="Meta Conversions API"
                subtitle={trackingStatuses.meta_capi
                  ? `Server event delivery prepared for Pixel ${trackingConfig.meta_capi.pixelId}`
                  : 'Prepare server-side event delivery for higher attribution quality'}
                connected={trackingStatuses.meta_capi}
                primaryAction={trackingStatuses.meta_capi ? 'Manage' : 'Add'}
                secondaryAction="Connect"
                onPrimary={() => setActiveTrackingModal('meta_capi')}
                onSecondary={() => setActiveTrackingModal('meta_capi')}
              />
              <TrackingRow
                icon={<Globe size={18} />}
                title="Google Analytics 4"
                subtitle={trackingStatuses.ga4
                  ? `Measurement ID ${trackingConfig.ga4.measurementId} is ready for install`
                  : 'Track sessions, events, and conversion trends across the funnel'}
                connected={trackingStatuses.ga4}
                primaryAction={trackingStatuses.ga4 ? 'Manage' : 'Add'}
                secondaryAction="Manage"
                onPrimary={() => setActiveTrackingModal('ga4')}
                onSecondary={() => setActiveTrackingModal('ga4')}
              />
              <TrackingRow
                icon={<Link2 size={18} />}
                title="Google Tag Manager"
                subtitle={trackingStatuses.gtm
                  ? `Container ${trackingConfig.gtm.containerId} is ready for your site`
                  : 'Centralize tags so backend and marketing scripts stay organized'}
                connected={trackingStatuses.gtm}
                primaryAction={trackingStatuses.gtm ? 'Manage' : 'Add'}
                secondaryAction="Manage"
                onPrimary={() => setActiveTrackingModal('gtm')}
                onSecondary={() => setActiveTrackingModal('gtm')}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={Brain}
            title="AI Assistant"
            description="Workspace AI controls and local key storage for the next automation layer"
          >
            <div className="space-y-5">
              {isFreePlan && (
                <button
                  type="button"
                  onClick={() => onUpgradeRequest('locked_feature')}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    theme === 'dark' ? 'border-blue-500/30 bg-blue-950/30 hover:bg-blue-950/40' : 'border-blue-100 bg-blue-50 hover:bg-blue-100/80'
                  }`}
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Pro Feature</p>
                  <p className={`mt-2 text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Advanced AI workflows are easier to expand on Pro.</p>
                  <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Upgrade when you are ready to turn these frontend controls into live automation.
                  </p>
                </button>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="OpenAI API key" helper="Stored locally in this browser until a secure backend vault is added">
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                      theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
                    }`}>
                      <div>
                        <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>OpenAI status</p>
                        <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {openAiConnectionState.checkedAt
                            ? `Last checked ${new Date(openAiConnectionState.checkedAt).toLocaleString()}`
                            : 'Run a test to verify the key'}
                        </p>
                      </div>
                      <ConnectionBadge status={openAiConnectionState.status} />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        id="settings-openai-key"
                        type="password"
                        value={openAiKey}
                        onChange={(event) => {
                          setOpenAiKey(event.target.value);
                          setOpenAiFeedback(null);
                          setOpenAiConnectionState(EMPTY_AI_CONNECTION_STATE);
                        }}
                        placeholder="sk-..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleTestOpenAiKey()}
                          disabled={isTestingOpenAiKey}
                          className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                            isTestingOpenAiKey
                              ? 'cursor-wait bg-slate-200 text-slate-500'
                              : 'bg-slate-900 text-white hover:opacity-90'
                          }`}
                        >
                          {isTestingOpenAiKey ? 'Testing...' : openAiConnectionState.status === 'connected' ? 'Retest' : 'Connect'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectOpenAi}
                          disabled={!openAiKey && openAiConnectionState.status === 'not_tested'}
                          className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                            !openAiKey && openAiConnectionState.status === 'not_tested'
                              ? theme === 'dark' ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                              : theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>

                    {openAiFeedback && (
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs font-medium ${
                          openAiFeedback.type === 'success'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-rose-200 bg-rose-50 text-rose-800'
                        }`}
                      >
                        {openAiFeedback.message}
                      </div>
                    )}
                  </div>
                </Field>

                <Field label="Google AI API key" helper="Stored locally in this browser until secure server-side secret storage exists">
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                      theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
                    }`}>
                      <div>
                        <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>Google AI status</p>
                        <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {googleAiConnectionState.checkedAt
                            ? `Last checked ${new Date(googleAiConnectionState.checkedAt).toLocaleString()}`
                            : 'Run a test to verify the key'}
                        </p>
                      </div>
                      <ConnectionBadge status={googleAiConnectionState.status} />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        id="settings-google-ai-key"
                        type="password"
                        value={googleAiKey}
                        onChange={(event) => {
                          setGoogleAiKey(event.target.value);
                          setGoogleAiFeedback(null);
                          setGoogleAiConnectionState(EMPTY_AI_CONNECTION_STATE);
                        }}
                        placeholder="AIza..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleTestGoogleAiKey()}
                          disabled={isTestingGoogleAiKey}
                          className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                            isTestingGoogleAiKey
                              ? 'cursor-wait bg-slate-200 text-slate-500'
                              : 'bg-slate-900 text-white hover:opacity-90'
                          }`}
                        >
                          {isTestingGoogleAiKey ? 'Testing...' : googleAiConnectionState.status === 'connected' ? 'Retest' : 'Connect'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectGoogleAi}
                          disabled={!googleAiKey && googleAiConnectionState.status === 'not_tested'}
                          className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                            !googleAiKey && googleAiConnectionState.status === 'not_tested'
                              ? theme === 'dark' ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                              : theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>

                    {googleAiFeedback && (
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs font-medium ${
                          googleAiFeedback.type === 'success'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-rose-200 bg-rose-50 text-rose-800'
                        }`}
                      >
                        {googleAiFeedback.message}
                      </div>
                    )}
                  </div>
                </Field>
              </div>

              <div className={`rounded-2xl border px-4 py-4 ${
                theme === 'dark' ? 'border-slate-700 bg-slate-900/75' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className={`flex items-center justify-between gap-4 border-b pb-4 ${
                  theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <div>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>AI processing mode</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{aiReadinessMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiAssistantEnabled((current) => !current)}
                    className={`rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                      aiAssistantEnabled ? 'bg-blue-600 text-white' : theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'
                    }`}
                  >
                    {aiAssistantEnabled ? 'Automated Mode' : 'Manual Mode'}
                  </button>
                </div>

                <div className="pt-4">
                  <div className={`mb-4 rounded-2xl border border-dashed px-4 py-4 ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                  }`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>AI provider readiness</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {connectedAiProviders === 0
                            ? 'No provider connected yet.'
                            : `${connectedAiProviders} provider${connectedAiProviders === 1 ? '' : 's'} connected and ready.`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ConnectionBadge status={openAiConnectionState.status} />
                        <ConnectionBadge status={googleAiConnectionState.status} />
                      </div>
                    </div>
                  </div>
                  <TrackingRow
                    icon={<WandSparkles size={18} />}
                    title="AI Assistant Enabled"
                    subtitle={connectedAiProviders > 0 ? 'Generate summaries, suggestions, and assistant-driven guidance' : 'Connect OpenAI or Google AI first to run live assistant prompts'}
                    connected={aiAssistantEnabled && connectedAiProviders > 0}
                    primaryAction={aiAssistantEnabled ? 'Disable' : 'Enable'}
                    onPrimary={() => setAiAssistantEnabled((current) => !current)}
                  />
                  <TrackingRow
                    icon={<Sparkles size={18} />}
                    title="Creative Analysis"
                    subtitle={connectedAiProviders > 0 ? 'Analyze creatives, fatigue, and copy quality once prompts are enabled' : 'Requires at least one connected AI provider'}
                    connected={creativeAnalysisEnabled && connectedAiProviders > 0}
                    primaryAction={creativeAnalysisEnabled ? 'Disable' : 'Enable'}
                    onPrimary={() => setCreativeAnalysisEnabled((current) => !current)}
                  />
                  <TrackingRow
                    icon={<Brain size={18} />}
                    title="Lead Generation Support"
                    subtitle={connectedAiProviders > 0 ? 'Use AI to summarize leads and surface next best actions' : 'Requires at least one connected AI provider'}
                    connected={leadGenerationEnabled && connectedAiProviders > 0}
                    primaryAction={leadGenerationEnabled ? 'Disable' : 'Enable'}
                    onPrimary={() => setLeadGenerationEnabled((current) => !current)}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <div data-settings-section="notifications">
            <SectionCard
              icon={Bell}
              title="Notification Settings"
              description="Define which important signals should surface immediately"
            >
            <div>
              <ToggleRow
                id="settings-alert-warning"
                label="Warning ad alerts"
                helper="Use for general campaign issues and attention-needed events"
                enabled={warningAlerts}
                onChange={setWarningAlerts}
                dotColor="bg-emerald-500"
              />
              <ToggleRow
                id="settings-alert-low-ctr"
                label="Low CTR alert"
                helper="Notify when click-through rate drops below your working threshold"
                enabled={lowCtrAlerts}
                onChange={setLowCtrAlerts}
                dotColor="bg-amber-400"
              />
              <ToggleRow
                id="settings-alert-high-cpm"
                label="High CPM alert"
                helper="Flag rising costs before performance drops further"
                enabled={highCpmAlerts}
                onChange={setHighCpmAlerts}
                dotColor="bg-rose-400"
              />
              <ToggleRow
                id="settings-alert-roas-drop"
                label="ROAS drop alert"
                helper="Catch efficiency declines early and prepare automatic responses later"
                enabled={roasDropAlerts}
                onChange={setRoasDropAlerts}
                dotColor="bg-indigo-400"
              />
              <ToggleRow
                id="settings-alert-daily-summary"
                label="Daily summary email"
                helper="Bundle performance results into a recurring daily digest"
                enabled={dailySummaryAlerts}
                onChange={setDailySummaryAlerts}
                dotColor="bg-blue-400"
              />
            </div>
            </SectionCard>
          </div>

          <div data-settings-section="billing">
            <SectionCard
              icon={CreditCard}
              title="Billing & Plan"
              description="Plan visibility, usage, and upgrade actions for this workspace"
            >
              <div className={`rounded-[2rem] border px-5 py-5 ${
                theme === 'dark' ? 'border-slate-700 bg-slate-900/75' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                      Current plan: <span className="capitalize">{planTier}</span>
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Usage: {isFreePlan ? `${leadUsageCount}/${leadLimit}` : `${leadUsageCount}/unlimited`} leads. Meta connection, account selection, and sync are live; Google sync currently uses the demo-backed server route until OAuth is added.
                    </p>
                    {isWorkspaceOwner && (
                      <p className="mt-1 text-xs font-medium text-emerald-600">
                        Owner access detected. This workspace can manage plan changes directly.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      id="settings-test-low-ctr"
                      type="button"
                      onClick={() => handleTestRule(0.7, 1.2, 14, 6)}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                        theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Test Low CTR
                    </button>
                    <button
                      id="settings-test-high-roas"
                      type="button"
                      onClick={() => handleTestRule(2.8, 4.5, 12, 31)}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                        theme === 'dark' ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Test High ROAS
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpgradeRequest('billing')}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      {isFreePlan ? 'View Pro Plan' : 'Manage Plan'}
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleDiscardChanges()}
              disabled={!hasUnsavedChanges || isLoadingSettings || isSavingSettings}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                !hasUnsavedChanges || isLoadingSettings || isSavingSettings
                  ? 'cursor-not-allowed text-slate-300'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={() => void handleSavePreferences()}
              disabled={!hasUnsavedChanges || isLoadingSettings || isSavingSettings || !currentWorkspace}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition ${
                !hasUnsavedChanges || isLoadingSettings || isSavingSettings || !currentWorkspace
                  ? 'cursor-not-allowed bg-slate-300'
                  : 'bg-blue-600 hover:brightness-110'
              }`}
            >
              {isSavingSettings ? 'Saving...' : hasUnsavedChanges ? 'Save Preferences' : 'Preferences Saved'}
            </button>
          </div>
        </div>
      </div>

      {activeTrackingModal && activeTrackingConfig && (
        <TrackingConfigModal
          title={
            activeTrackingModal === 'meta_pixel'
              ? 'Meta Pixel'
              : activeTrackingModal === 'meta_capi'
                ? 'Meta Conversions API'
                : activeTrackingModal === 'ga4'
                  ? 'Google Analytics 4'
                  : 'Google Tag Manager'
          }
          subtitle={
            activeTrackingModal === 'meta_pixel'
              ? 'Install Meta Pixel on the website or landing page used by your ads so page views and browser events can be tracked.'
              : activeTrackingModal === 'meta_capi'
                ? 'Prepare server-side Meta events for better attribution quality when your landing page or backend sends conversion events.'
                : activeTrackingModal === 'ga4'
                  ? 'Install GA4 on the landing page to track sessions, events, and conversions across your funnel.'
                  : 'Install GTM when you want one tag container to manage all marketing and analytics scripts.'
          }
          fields={
            activeTrackingModal === 'meta_pixel'
              ? [
                  { key: 'pixelId', label: 'Meta Pixel ID', placeholder: '123456789012345' },
                  { key: 'landingPageUrl', label: 'Landing Page URL', placeholder: 'https://yourlandingpage.com', helper: 'Optional but helpful so this workspace records where the tag should be installed.' },
                ]
              : activeTrackingModal === 'meta_capi'
                ? [
                    { key: 'pixelId', label: 'Meta Pixel ID', placeholder: '123456789012345' },
                    { key: 'accessToken', label: 'CAPI Access Token', placeholder: 'EAAG...', type: 'password', helper: 'Found in Meta Events Manager -> Settings -> Conversions API.' },
                    { key: 'testEventCode', label: 'Test Event Code', placeholder: 'TEST12345', helper: 'Optional for validation while testing server events.' },
                    { key: 'landingPageUrl', label: 'Landing Page URL', placeholder: 'https://yourlandingpage.com' },
                  ]
                : activeTrackingModal === 'ga4'
                  ? [
                      { key: 'measurementId', label: 'GA4 Measurement ID', placeholder: 'G-XXXXXXXXXX' },
                      { key: 'landingPageUrl', label: 'Landing Page URL', placeholder: 'https://yourlandingpage.com' },
                    ]
                  : [
                      { key: 'containerId', label: 'GTM Container ID', placeholder: 'GTM-XXXXXXX' },
                      { key: 'landingPageUrl', label: 'Landing Page URL', placeholder: 'https://yourlandingpage.com' },
                    ]
          }
          values={activeTrackingConfig as Record<string, string>}
          onChange={(key, value) => updateTrackingValue(activeTrackingModal, key, value)}
          onClose={() => setActiveTrackingModal(null)}
          onSave={handleSaveTrackingConfig}
          snippet={trackingSnippet}
          copied={copiedTrackingSnippet === activeTrackingModal}
          onCopySnippet={() => void handleCopyTrackingSnippet()}
          extraActionLabel={activeTrackingModal === 'meta_capi' ? (isTestingMetaCapi ? 'Sending Test...' : 'Send Test Event') : undefined}
          onExtraAction={activeTrackingModal === 'meta_capi' ? () => void handleTestMetaCapi() : undefined}
          extraActionDisabled={activeTrackingModal === 'meta_capi' ? isTestingMetaCapi : undefined}
        />
      )}
    </main>
  );
}
