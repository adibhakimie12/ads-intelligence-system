import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';
export interface ForecastData {
  day: string;
  profit: number;
  isCurrent?: boolean;
}

export default function ProfitChart({ data }: { data: ForecastData[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="25%" style={{ outline: 'none' }}>
          <Tooltip 
            cursor={{ fill: 'var(--color-surface-container-low)', opacity: 0.5 }}
            contentStyle={{ borderRadius: '12px', borderColor: 'var(--color-outline-variant)', backgroundColor: 'var(--color-surface)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} 
          />
          <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isCurrent ? 'var(--color-primary)' : 'var(--color-primary)'} 
                fillOpacity={entry.isCurrent ? 1 : 0.25}
                className={entry.isCurrent ? 'drop-shadow-md' : 'transition-opacity duration-300 hover:opacity-80'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
