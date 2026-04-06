import { AdsData } from '../types';
import CampaignRow from './CampaignRow';

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case 'scaling': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'scheduled': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'testing': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'underperforming': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'paused': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
  }
};

const getDynamicStatus = (campaign: AdsData) => {
  if (campaign.delivery?.toLowerCase() === 'scheduled') return 'Scheduled';
  if (campaign.status?.toLowerCase() === 'scheduled') return 'Scheduled';
  if (campaign.status?.toLowerCase() === 'paused') return 'Paused';
  if (campaign.ROAS > 3) return 'Scaling';
  if (campaign.ROAS >= 1.5) return 'Testing';
  return 'Underperforming';
};

const getRecommendation = (campaign: AdsData) => {
  if (campaign.delivery?.toLowerCase() === 'scheduled' || campaign.status?.toLowerCase() === 'scheduled') return null;
  if (campaign.status?.toLowerCase() === 'paused') return null;
  if (campaign.ROAS < 1) return 'Pause Campaign';
  if (campaign.ROAS > 3) return 'Scale Budget';
  if (campaign.CTR < 1) return 'Improve Creative';
  if (campaign.CPM > 20) return 'Adjust Audience';
  return null;
};

export default function CampaignTable({ 
  campaigns, 
  getCreativeDriver,
  showActions = true,
  onView,
  onEdit,
  onDuplicate,
  onPause,
}: { 
  campaigns: AdsData[], 
  getCreativeDriver?: (campaign: AdsData) => {
    label: string;
    tone: string;
    detail?: string;
  } | null,
  showActions?: boolean,
  onView?: (campaign: AdsData) => void,
  onEdit?: (campaign: AdsData) => void,
  onDuplicate?: (campaign: AdsData) => void,
  onPause?: (campaign: AdsData) => void,
}) {
  return (
    <div className="panel-surface overflow-hidden rounded-[2rem]">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-outline-variant/20 scrollbar-track-transparent">
        <table className="w-full border-collapse min-w-[1900px]">
          <thead>
            <tr className="bg-primary/[0.03]">
              <th className="px-8 py-5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Campaign Name</th>
              <th className="px-8 py-5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Status</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Spend</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Reach</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Impressions</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Cost / Result</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">CTR</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">CTR Link</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Link Clicks</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">CPC Link</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">3s Plays</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">VV 25%</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">VV 50%</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">VV 75%</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Rate 75% VV</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">CPM</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">ROAS</th>
              <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Conv.</th>
              <th className="px-8 py-5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Creative Driver</th>
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
                getCreativeDriver={getCreativeDriver}
                showActions={showActions}
                onView={onView}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onPause={onPause}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
