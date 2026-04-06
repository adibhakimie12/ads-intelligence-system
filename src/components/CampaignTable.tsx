import { AdsData } from '../types';
import CampaignRow from './CampaignRow';

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case 'scaling': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'testing': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'underperforming': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'paused': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
  }
};

const getDynamicStatus = (campaign: AdsData) => {
  if (campaign.status?.toLowerCase() === 'paused') return 'Paused';
  if (campaign.ROAS > 3) return 'Scaling';
  if (campaign.ROAS >= 1.5) return 'Testing';
  return 'Underperforming';
};

const getRecommendation = (campaign: AdsData) => {
  if (campaign.status?.toLowerCase() === 'paused') return null;
  if (campaign.ROAS < 1) return 'Pause Campaign';
  if (campaign.ROAS > 3) return 'Scale Budget';
  if (campaign.CTR < 1) return 'Improve Creative';
  if (campaign.CPM > 20) return 'Adjust Audience';
  return null;
};

export default function CampaignTable({ 
  campaigns, 
  showActions = true 
}: { 
  campaigns: AdsData[], 
  showActions?: boolean 
}) {
  return (
    <div className="panel-surface overflow-hidden rounded-[2rem]">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-outline-variant/20 scrollbar-track-transparent">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-primary/[0.03]">
              <th className="px-8 py-5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Campaign Name</th>
              <th className="px-8 py-5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Status</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Spend</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">CTR</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">CPM</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">ROAS</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Conv.</th>
              <th className="px-8 py-5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Recommendation</th>
              {showActions && <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high">
            {campaigns.map((campaign) => (
              <CampaignRow 
                key={campaign.id} 
                campaign={campaign} 
                getStatusStyles={getStatusStyles}
                getDynamicStatus={getDynamicStatus}
                getRecommendation={getRecommendation}
                showActions={showActions}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
