import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdsData, CreativeData, InsightData, ProfitData, RoutePage, CurrencyCode, LeadData } from '../types';

interface DatabaseContextType {
  currentPage: RoutePage;
  setCurrentPage: (page: RoutePage) => void;
  adsData: AdsData[];
  setAdsData: React.Dispatch<React.SetStateAction<AdsData[]>>;
  creatives: CreativeData[];
  setCreatives: React.Dispatch<React.SetStateAction<CreativeData[]>>;
  insights: InsightData[];
  setInsights: React.Dispatch<React.SetStateAction<InsightData[]>>;
  profitData: ProfitData;
  setProfitData: React.Dispatch<React.SetStateAction<ProfitData>>;
  isFetching: boolean;
  syncAdsData: (source: 'meta' | 'google' | 'all') => Promise<void>;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatCurrency: (value: number) => string;
  leads: LeadData[];
  setLeads: React.Dispatch<React.SetStateAction<LeadData[]>>;
  updateLead: (id: string, updates: Partial<LeadData>) => void;
  pipelineAlerts: { id: string; message: string; severity: 'warning' | 'info' | 'success' }[];
  getSmartRecommendation: (lead: LeadData) => string;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

// Initial Test Data
const initialAdsData: AdsData[] = [
  { id: '1', campaign_name: 'Meta_Winter_Sale_Broad', spend: 2450, CTR: 0.85, CPM: 12.50, ROAS: 1.2, conversions: 12, revenue: 2940, date: '2024-11-20', platform: 'meta', status: 'underperforming', recommendation: 'Improve Creative' },
  { id: '2', campaign_name: 'Google_Retargeting_Hot', spend: 1200, CTR: 2.50, CPM: 26.00, ROAS: 4.1, conversions: 45, revenue: 4920, date: '2024-11-20', platform: 'google', status: 'scaling', recommendation: 'Scale Budget' },
  { id: '3', campaign_name: 'Meta_LAL_Purchases_1%', spend: 850, CTR: 1.20, CPM: 18.00, ROAS: 2.5, conversions: 22, revenue: 2125, date: '2024-11-20', platform: 'meta', status: 'active', recommendation: 'Adjust Audience' },
  { id: '4', campaign_name: 'Google_Search_Brand_Core_Image', spend: 500, CTR: 4.50, CPM: 45.00, ROAS: 5.2, conversions: 30, revenue: 2600, date: '2024-11-20', platform: 'google', status: 'active' },
  { id: '5', campaign_name: 'Meta_Advantage_Plus_Catalog', spend: 3200, CTR: 1.80, CPM: 14.50, ROAS: 3.8, conversions: 88, revenue: 12160, date: '2024-11-20', platform: 'meta', status: 'scaling', recommendation: 'Scale Budget' },
  { id: '6', campaign_name: 'Google_Display_Prospecting', spend: 400, CTR: 0.40, CPM: 4.20, ROAS: 0.8, conversions: 5, revenue: 320, date: '2024-11-20', platform: 'google', status: 'paused', recommendation: 'Pause Campaign' },
  { id: '7', campaign_name: 'Meta_Video_Views_Cold', spend: 1500, CTR: 0.65, CPM: 8.50, ROAS: 1.1, conversions: 8, revenue: 1650, date: '2024-11-20', platform: 'meta', status: 'testing', recommendation: 'Improve Creative' },
  { id: '8', campaign_name: 'Google_PMax_Shopping_All', spend: 4500, CTR: 1.45, CPM: 19.20, ROAS: 3.2, conversions: 112, revenue: 14400, date: '2024-11-20', platform: 'google', status: 'scaling', recommendation: 'Scale Budget' },
];

const initialCreatives: CreativeData[] = [
  { id: '1', creative_name: 'Meta_Winter_Sale_Broad_Video', hook_type: 'Question', score: 85, status: 'WINNING', CTR: 2.1, ROAS: 3.5, imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=100&h=100', hook_strength: 92, message_clarity: 85, cta_presence: 78, fatigue: 'low' },
  { id: '2', creative_name: 'Google_Retargeting_Hot_Image', hook_type: 'Benefit', score: 45, status: 'TESTING', CTR: 0.8, ROAS: 1.1, imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=100&h=100', hook_strength: 45, message_clarity: 62, cta_presence: 81, fatigue: 'medium' },
];

const initialProfitData: ProfitData = {
  id: '1',
  product_price: 150,
  cost: 50, // Base Cost
  closing_rate: 0.2, // 20%
  CPL: 20,
  cogs: 45,
  operational_costs: 2500
};

const initialLeads: LeadData[] = [
  { id: 'l1', name: 'Ahmad Rafiq', source: 'meta', campaign: 'Meta_Winter_Sale_Broad', value: 450, status: 'new', date: '2024-11-21', score: 'medium', insight: 'High interest detected', recommendedAction: 'Send brochure', creative_name: 'Winter_Offer_V1', creative_type: 'video', quality_score: 'medium', ctr: 1.8, cpl: 12.5, conversionRate: 4.2 },
  { id: 'l2', name: 'Sarah Jenkins', source: 'google', campaign: 'Google_Search_Brand_Core_Image', value: 1200, status: 'new', date: '2024-11-21', score: 'high', insight: 'High value opportunity', recommendedAction: 'Follow up immediately', creative_name: 'Search_Brand_Core', creative_type: 'image', quality_score: 'high', ctr: 4.5, cpl: 8.2, conversionRate: 12.5 },
  { id: 'l3', name: 'Lim Wei Kang', source: 'meta', campaign: 'Meta_LAL_Purchases_1%', value: 300, status: 'contacted', date: '2024-11-20', score: 'low', insight: 'Returning visitor', recommendedAction: 'Low priority', creative_name: 'Product_Catalog_LAL', creative_type: 'image', quality_score: 'low', ctr: 0.9, cpl: 25.0, conversionRate: 1.5 },
  { id: 'l4', name: 'John Doe', source: 'google', campaign: 'Google_Retargeting_Hot', value: 850, status: 'contacted', date: '2024-11-20', score: 'medium', insight: 'Retargeting lead', recommendedAction: 'Send follow-up WhatsApp', creative_name: 'Retargeting_Dynamic', creative_type: 'video', quality_score: 'medium', ctr: 2.1, cpl: 15.5, conversionRate: 5.8 },
  { id: 'l5', name: 'Nurul Huda', source: 'meta', campaign: 'Meta_Advantage_Plus_Catalog', value: 2500, status: 'qualified', date: '2024-11-19', score: 'high', insight: 'High converting campaign', recommendedAction: 'Schedule Demo', creative_name: 'Smart_Catalog_V2', creative_type: 'image', quality_score: 'high', ctr: 3.2, cpl: 6.5, conversionRate: 18.2 },
  { id: 'l6', name: 'Michael Chen', source: 'google', campaign: 'Google_PMax_Shopping_All', value: 150, status: 'qualified', date: '2024-11-19', score: 'medium', insight: 'Price sensitive', recommendedAction: 'Send Offer', creative_name: 'PMax_Asset_Group_1', creative_type: 'image', quality_score: 'medium', ctr: 1.5, cpl: 18.0, conversionRate: 3.5 },
  { id: 'l7', name: 'Siti Aminah', source: 'meta', campaign: 'Meta_Winter_Sale_Broad', value: 1800, status: 'won', date: '2024-11-18', score: 'high', insight: 'Loyal customer', recommendedAction: 'Upsell opportunity', creative_name: 'Winter_Offer_V1', creative_type: 'video', quality_score: 'high', ctr: 2.4, cpl: 9.0, conversionRate: 22.0 },
  { id: 'l8', name: 'Robert Smith', source: 'google', campaign: 'Google_Search_Brand_Core_Image', value: 900, status: 'won', date: '2024-11-17', score: 'medium', insight: 'Standard conversion', recommendedAction: 'Nurture', creative_name: 'Search_Brand_Core', creative_type: 'image', quality_score: 'medium', ctr: 3.8, cpl: 11.2, conversionRate: 8.5 },
  { id: 'l9', name: 'David Lee', source: 'meta', campaign: 'Meta_LAL_Purchases_1%', value: 500, status: 'lost', date: '2024-11-16', score: 'low', insight: 'Low engagement source', recommendedAction: 'Archive', creative_name: 'Product_Catalog_LAL', creative_type: 'image', quality_score: 'low', ctr: 0.7, cpl: 32.0, conversionRate: 0.8 },
  { id: 'l10', name: 'Ali Bakar', source: 'meta', campaign: 'Meta_Winter_Sale_Broad', value: 400, status: 'contacted', date: '2024-11-20', score: 'medium', insight: 'Clicked link twice', recommendedAction: 'Call now', creative_name: 'Winter_Offer_V1', creative_type: 'video', quality_score: 'medium', ctr: 1.8, cpl: 12.5, conversionRate: 4.2 },
  { id: 'l11', name: 'Grace Ho', source: 'google', campaign: 'Google_Retargeting_Hot', value: 600, status: 'contacted', date: '2024-11-20', score: 'medium', insight: 'Requested more info', recommendedAction: 'Send WhatsApp', creative_name: 'Retargeting_Dynamic', creative_type: 'video', quality_score: 'medium', ctr: 2.1, cpl: 15.5, conversionRate: 5.8 },
  { id: 'l12', name: 'Siva Kumar', source: 'meta', campaign: 'Meta_Advantage_Plus_Catalog', value: 1100, status: 'contacted', date: '2024-11-20', score: 'high', insight: 'High value interest', recommendedAction: 'Face-to-face meeting', creative_name: 'Smart_Catalog_V2', creative_type: 'image', quality_score: 'high', ctr: 3.2, cpl: 6.5, conversionRate: 18.2 },
];

import { fetchMetaAds, fetchGoogleAds } from '../services/api';

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<RoutePage>('Dashboard');
  const [adsData, setAdsData] = useState<AdsData[]>(initialAdsData);
  const [creatives, setCreatives] = useState<CreativeData[]>(initialCreatives);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [profitData, setProfitData] = useState<ProfitData>(initialProfitData);
  const [leads, setLeads] = useState<LeadData[]>(initialLeads);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [currency, setCurrency] = useState<CurrencyCode>('MYR');

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

    switch (currency) {
      case 'USD': return `$${formatted}`;
      case 'GBP': return `£${formatted}`;
      case 'MYR': return `RM ${formatted}`;
      default: return `RM ${formatted}`;
    }
  };

  const syncAdsData = async (source: 'meta' | 'google' | 'all') => {
    setIsFetching(true);
    try {
      let newData: AdsData[] = [];
      if (source === 'meta' || source === 'all') {
        const metaData = await fetchMetaAds();
        newData = [...newData, ...metaData.map(ad => ({...ad, platform: 'meta' as const}))];
      }
      if (source === 'google' || source === 'all') {
        const googleData = await fetchGoogleAds();
        newData = [...newData, ...googleData.map(ad => ({...ad, platform: 'google' as const}))];
      }
      
      // Update ads data, but prevent wiping if API fails completely
      if (newData.length > 0) {
        setAdsData(newData);
      }
    } catch (error) {
      console.error('Failed to sync ads data:', error);
    } finally {
      setIsFetching(false);
    }
  };

  // Sync automatically from the server on initial load
  useEffect(() => {
    syncAdsData('all');
  }, []);

  // Rule Engine (Otak System)
  useEffect(() => {
    const generatedInsights: InsightData[] = [];
    
    // Evaluate Ads
    adsData.forEach((ad) => {
      const computedPlatform = ad.platform || (ad.campaign_name.toLowerCase().includes('meta') ? 'meta' : ad.campaign_name.toLowerCase().includes('google') ? 'google' : undefined);

      // IF CTR < 1% → create insight "Change creative"
      if (ad.CTR < 1.0) {
        generatedInsights.push({ 
          id: `ins_ctr_low_${ad.id}`, 
          type: 'creative', 
          severity: 'attention',
          message: `Change creative for ${ad.campaign_name}`, 
          reasoning: `CTR is ${ad.CTR}%, indicating weak creative hook`,
          priority: 'high', 
          action: `Change creative for ${ad.campaign_name}`,
          actionLabel: 'Improve Creative',
          platform: computedPlatform
        });
      }
      // IF CPM > 25 → create insight "Adjust audience"
      if (ad.CPM > 25) {
        generatedInsights.push({ 
          id: `ins_cpm_high_${ad.id}`, 
          type: 'ads', 
          severity: 'efficiency',
          message: `Adjust audience for ${ad.campaign_name}`, 
          reasoning: `CPM is above $25 benchmark, suggesting audience mismatch or high competition`,
          priority: 'medium', 
          action: `Adjust audience for ${ad.campaign_name}`,
          actionLabel: 'Adjust Audience',
          platform: computedPlatform
        });
      }
      // IF ROAS > 3 → create insight "Scale campaign"
      if (ad.ROAS > 3.0) {
        generatedInsights.push({ 
          id: `ins_scale_${ad.id}`, 
          type: 'sales', 
          severity: 'performance',
          message: `Scale campaign: ${ad.campaign_name}`, 
          reasoning: `ROAS is ${ad.ROAS}x (above target threshold), indicating campaign is highly scalable`,
          priority: 'high', 
          action: `Scale campaign: ${ad.campaign_name}`,
          actionLabel: 'Scale Budget',
          platform: computedPlatform
        });
      }
      // IF ROAS < 1.5 → create insight "Pause campaign"
      if (ad.ROAS < 1.5) {
        generatedInsights.push({ 
          id: `ins_pause_${ad.id}`, 
          type: 'ads', 
          severity: 'attention',
          message: `Pause campaign: ${ad.campaign_name}`, 
          reasoning: `ROAS is ${ad.ROAS}x, which is below breakeven threshold. Immediate action required.`,
          priority: 'high', 
          action: `Pause campaign: ${ad.campaign_name}`,
          actionLabel: 'Pause Campaign',
          platform: computedPlatform
        });
      }
    });
    
    setInsights(generatedInsights);
  }, [adsData, creatives]);

  const [pipelineAlerts, setPipelineAlerts] = useState<{ id: string; message: string; severity: 'warning' | 'info' | 'success' }[]>([]);

  useEffect(() => {
    const alerts: { id: string; message: string; severity: 'warning' | 'info' | 'success' }[] = [];
    
    // 1. High-Value Uncontacted Alert
    const highValueNew = leads.filter(l => l.status === 'new' && l.score === 'high');
    if (highValueNew.length > 0) {
      alerts.push({ 
        id: 'alert_high_value_new', 
        message: `Urgent: ${highValueNew.length} high-value leads uncontacted`, 
        severity: 'info' 
      });
    }

    // 2. Pipeline Stagnant Alert
    const stagnantLeads = leads.filter(l => l.status === 'contacted');
    if (stagnantLeads.length > 3) {
      alerts.push({ 
        id: 'alert_bottleneck_contacted', 
        message: `${stagnantLeads.length} leads stuck in Contacted > 3 days`, 
        severity: 'warning' 
      });
    }

    // 3. Winning Source Insight
    const topLead = [...leads].sort((a, b) => b.value - a.value)[0];
    if (topLead) {
      alerts.push({ 
        id: 'alert_top_source', 
        message: `Top campaign "${topLead.campaign}" generating high-quality leads`, 
        severity: 'success' 
      });
    }

    setPipelineAlerts(alerts.slice(0, 2)); // Keep it clean, show only top 2
  }, [leads]);

  const getSmartRecommendation = (lead: LeadData) => {
    if (lead.value >= 1000 && lead.conversionRate >= 10) {
      return "🔥 High Intensity: Call Now";
    }
    if (lead.value >= 500 || lead.quality_score === 'high') {
      return "⚡ Priority Follow-up Recommended";
    }
    if (lead.conversionRate < 3) {
      return "🧊 Monitor lead (low priority)";
    }
    return "Standard Follow-up: WhatsApp";
  };

  const updateLead = (id: string, updates: Partial<LeadData>) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, ...updates } : lead
    ));
  };

  return (
    <DatabaseContext.Provider value={{ 
      currentPage, 
      setCurrentPage, 
      adsData, 
      setAdsData, 
      creatives, 
      setCreatives, 
      insights, 
      setInsights, 
      profitData, 
      setProfitData, 
      isFetching, 
      syncAdsData,
      currency,
      setCurrency,
      formatCurrency,
      leads,
      setLeads,
      updateLead,
      pipelineAlerts,
      getSmartRecommendation
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
