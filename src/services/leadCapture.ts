import { readJsonResponse } from './apiResponse';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api');

export interface LeadCaptureEvent {
  id: string;
  workspaceId: string;
  platform: 'meta' | 'google';
  campaign: string;
  contactName?: string;
  contactPhone?: string;
  creativeName?: string;
  creativeType?: 'video' | 'image';
  adsetName?: string;
  value?: number;
  ctr?: number;
  cpl?: number;
  conversionRate?: number;
  score?: 'high' | 'medium' | 'low';
  qualityScore?: 'high' | 'medium' | 'low';
  insight?: string;
  recommendedAction?: string;
  sourceEvent?: string;
  capturedAt: string;
  consumedAt?: string | null;
}

export class LeadCaptureApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'LeadCaptureApiError';
    this.status = status;
  }
}

export const fetchPendingLeadCaptures = async (workspaceId: string) => {
  const response = await fetch(`${API_BASE_URL}/lead-capture?workspaceId=${encodeURIComponent(workspaceId)}`);
  const parsed = await readJsonResponse(response, 'Lead capture API');

  if (!parsed.ok) {
    throw new LeadCaptureApiError(parsed.error, parsed.status);
  }

  const payload = parsed.data;

  if (!response.ok) {
    throw new LeadCaptureApiError(payload.error || 'Failed to load pending lead captures.', response.status);
  }

  return (Array.isArray(payload.events) ? payload.events : []) as LeadCaptureEvent[];
};

export const consumeLeadCapture = async (eventId: string) => {
  const response = await fetch(`${API_BASE_URL}/lead-capture/${encodeURIComponent(eventId)}/consume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const parsed = await readJsonResponse(response, 'Lead capture API');

  if (!parsed.ok) {
    throw new LeadCaptureApiError(parsed.error, parsed.status);
  }

  const payload = parsed.data;

  if (!response.ok) {
    throw new LeadCaptureApiError(payload.error || 'Failed to mark lead capture as imported.', response.status);
  }

  return payload;
};

export const createLeadCapture = async (payload: {
  workspaceId: string;
  platform: 'meta' | 'google';
  campaign: string;
  contactName?: string;
  contactPhone?: string;
  creativeName?: string;
  creativeType?: 'video' | 'image';
  adsetName?: string;
  value?: number;
  ctr?: number;
  cpl?: number;
  conversionRate?: number;
  score?: 'high' | 'medium' | 'low';
  qualityScore?: 'high' | 'medium' | 'low';
  insight?: string;
  recommendedAction?: string;
  sourceEvent?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/lead-capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const parsed = await readJsonResponse(response, 'Lead capture API');

  if (!parsed.ok) {
    throw new LeadCaptureApiError(parsed.error, parsed.status);
  }

  const data = parsed.data;

  if (!response.ok) {
    throw new LeadCaptureApiError(data.error || 'Failed to create lead capture event.', response.status);
  }

  return data as { ok: true; event: LeadCaptureEvent };
};
