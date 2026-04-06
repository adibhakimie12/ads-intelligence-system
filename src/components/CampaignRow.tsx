import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { AdsData } from '../types';
import { MoreVertical, ExternalLink, Edit2, Pause, Copy } from 'lucide-react';

interface CampaignRowProps {
  key?: React.Key;
  campaign: AdsData;
  getStatusStyles: (status: string) => string;
  getDynamicStatus: (campaign: AdsData) => string;
  getRecommendation: (campaign: AdsData) => string | null;
  showActions?: boolean;
}

export default function CampaignRow({ 
  campaign, 
  getStatusStyles, 
  getDynamicStatus, 
  getRecommendation,
  showActions = true 
}: CampaignRowProps) {
  const { formatCurrency } = useDatabase();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const status = getDynamicStatus(campaign);
  const rec = getRecommendation(campaign);

  return (
    <tr className="group transition-colors hover:bg-primary/[0.035]">
      <td className="px-8 py-6">
        <div className="flex items-center gap-3">
          <span className="font-bold text-on-surface">{campaign.campaign_name}</span>
          {(campaign.platform || (campaign.campaign_name.toLowerCase().includes('meta') ? 'meta' : campaign.campaign_name.toLowerCase().includes('google') ? 'google' : null)) && (
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
              (campaign.platform || (campaign.campaign_name.toLowerCase().includes('meta') ? 'meta' : 'google')) === 'meta' 
                ? 'bg-blue-100 text-blue-700 border border-blue-200/50' 
                : 'bg-orange-100 text-orange-700 border border-orange-200/50'
            }`}>
              {campaign.platform || (campaign.campaign_name.toLowerCase().includes('meta') ? 'meta' : 'google')}
            </span>
          )}
        </div>
      </td>
      <td className="px-8 py-6">
        <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusStyles(status)}`}>
          {status}
        </span>
      </td>
      <td className="px-8 py-6 text-right font-medium text-on-surface">{formatCurrency(campaign.spend)}</td>
      <td className="px-8 py-6 text-right font-medium text-on-surface">{campaign.CTR}%</td>
      <td className="px-8 py-6 text-right font-medium text-on-surface">{formatCurrency(campaign.CPM)}</td>
      <td className="px-8 py-6 text-right font-headline font-extrabold text-on-surface">
        <span className={campaign.ROAS > 2.0 ? 'text-secondary' : ''}>{campaign.ROAS}x</span>
      </td>
      <td className="px-8 py-6 text-right font-medium text-on-surface">{campaign.conversions}</td>
      <td className="px-8 py-6 text-center">
        {rec ? (
          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${
            rec === 'Scale Budget' ? 'bg-green-100 text-green-700 border-green-200' :
            rec === 'Improve Creative' ? 'bg-amber-100 text-amber-700 border-amber-200' :
            rec === 'Adjust Audience' ? 'bg-blue-100 text-blue-700 border-blue-200' :
            'bg-red-100/10 text-red-700 border-red-500/20'
          }`}>
            {rec}
          </span>
        ) : (
          <span className="text-on-surface-variant/40 text-[10px] uppercase font-bold tracking-widest italic">Monitoring</span>
        )}
      </td>
      {showActions && (
        <td className="px-8 py-6 text-right relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors flex ml-auto"
            aria-label="Actions"
          >
            <MoreVertical size={20} className="opacity-70 group-hover:opacity-100" />
          </button>
          
          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-8 top-16 w-56 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="p-2 text-left">
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors rounded-xl group/item">
                    <ExternalLink size={16} className="text-on-surface-variant group-hover/item:text-primary transition-colors" />
                    View Details
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors rounded-xl group/item">
                    <Edit2 size={16} className="text-on-surface-variant group-hover/item:text-primary transition-colors" />
                    Edit Campaign
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors rounded-xl group/item">
                    <Copy size={16} className="text-on-surface-variant group-hover/item:text-primary transition-colors" />
                    Duplicate Campaign
                  </button>
                  <div className="h-px bg-outline-variant/10 my-1 mx-2" />
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors rounded-xl group/item">
                    <Pause size={16} className="group-hover/item:text-red-700 transition-colors" />
                    Pause Campaign
                  </button>
                </div>
              </div>
            </>
          )}
        </td>
      )}
    </tr>
  );
}
