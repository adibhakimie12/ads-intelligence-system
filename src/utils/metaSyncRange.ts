export type MetaSyncRange = 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'maximum';

const META_SYNC_RANGE_STORAGE_PREFIX = 'ads-intel-meta-sync-range';

export const getMetaSyncRangeStorageKey = (workspaceId?: string | null) =>
  `${META_SYNC_RANGE_STORAGE_PREFIX}:${workspaceId || 'default'}`;

export const getStoredMetaSyncRange = (workspaceId?: string | null): MetaSyncRange => {
  if (typeof window === 'undefined') {
    return 'today';
  }

  const stored = window.localStorage.getItem(getMetaSyncRangeStorageKey(workspaceId));
  if (stored === 'today' || stored === 'yesterday' || stored === 'last_7d' || stored === 'last_30d' || stored === 'maximum') {
    return stored;
  }

  return 'today';
};

export const storeMetaSyncRange = (workspaceId: string | null | undefined, value: MetaSyncRange) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getMetaSyncRangeStorageKey(workspaceId), value);
};

export const getMetaSyncRangeLabel = (value: MetaSyncRange) => {
  switch (value) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'last_7d':
      return 'Last 7 Days';
    case 'last_30d':
      return 'Last 30 Days';
    case 'maximum':
      return 'Maximum / Lifetime';
    default:
      return 'Today';
  }
};

export const isAggregateMetaSyncRange = (value: MetaSyncRange) =>
  value === 'last_7d' || value === 'last_30d' || value === 'maximum';
