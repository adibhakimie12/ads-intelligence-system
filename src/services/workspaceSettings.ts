import { supabase } from './supabase';
import type { CurrencyCode, WorkspaceSettings } from '../types';

export const DEFAULT_WORKSPACE_SETTINGS = {
  system_name: 'Ads Intelligence HQ',
  currency: 'MYR' as CurrencyCode,
  timezone: 'GMT+08:00 Kuala Lumpur',
  attribution_window: '7-day click, 1-day view',
  meta_pixel_enabled: false,
  meta_conversions_enabled: false,
  google_analytics_enabled: false,
  google_tag_manager_enabled: false,
  ai_assistant_enabled: true,
  creative_analysis_enabled: true,
  lead_generation_enabled: true,
  warning_alerts_enabled: true,
  low_ctr_alert_enabled: true,
  high_cpm_alert_enabled: false,
  roas_drop_alert_enabled: true,
  daily_summary_alert_enabled: true,
} as const;

export const buildDefaultWorkspaceSettings = (workspaceId: string, systemName?: string): WorkspaceSettings => ({
  workspace_id: workspaceId,
  ...DEFAULT_WORKSPACE_SETTINGS,
  system_name: systemName || DEFAULT_WORKSPACE_SETTINGS.system_name,
});

export const getWorkspaceSettings = async (workspaceId: string, fallbackName?: string) => {
  if (!supabase) {
    return {
      data: buildDefaultWorkspaceSettings(workspaceId, fallbackName),
      error: 'Supabase is not configured yet.',
    };
  }

  const { data, error } = await supabase
    .from('workspace_settings')
    .select(`
      workspace_id,
      system_name,
      currency,
      timezone,
      attribution_window,
      meta_pixel_enabled,
      meta_conversions_enabled,
      google_analytics_enabled,
      google_tag_manager_enabled,
      ai_assistant_enabled,
      creative_analysis_enabled,
      lead_generation_enabled,
      warning_alerts_enabled,
      low_ctr_alert_enabled,
      high_cpm_alert_enabled,
      roas_drop_alert_enabled,
      daily_summary_alert_enabled,
      created_at,
      updated_at
    `)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    return {
      data: buildDefaultWorkspaceSettings(workspaceId, fallbackName),
      error: error.message,
    };
  }

  return {
    data: (data as WorkspaceSettings | null) || buildDefaultWorkspaceSettings(workspaceId, fallbackName),
    error: null,
  };
};

export const upsertWorkspaceSettings = async (settings: WorkspaceSettings) => {
  if (!supabase) {
    return { error: 'Supabase is not configured yet.' };
  }

  const { error } = await supabase
    .from('workspace_settings')
    .upsert(settings, {
      onConflict: 'workspace_id',
    });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
};
