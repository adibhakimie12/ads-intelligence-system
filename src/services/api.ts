import { AdsData } from '../types';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api');

export const fetchMetaAds = async (): Promise<AdsData[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/meta-ads`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch Meta Ads data:', error);
    return [];
  }
};

export const fetchGoogleAds = async (): Promise<AdsData[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/google-ads`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch Google Ads data:', error);
    return [];
  }
};
