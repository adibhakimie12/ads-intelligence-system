import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip, XAxis, YAxis } from 'recharts';

export interface TrendData {
  label: string;
  value: number;
}

export default function TrendChart({ data }: { data: TrendData[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barCategoryGap="35%">
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-on-surface-variant)', opacity: 0.5 }}
            dy={10}
          />
          <YAxis 
            hide
          />
          <Tooltip 
            cursor={{ fill: 'var(--color-surface-container-high)', opacity: 0.4 }}
            contentStyle={{ 
              borderRadius: '16px', 
              border: '1px solid var(--color-outline-variant)', 
              backgroundColor: 'var(--color-surface)', 
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              padding: '12px 16px'
            }}
            itemStyle={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-primary)' }}
            labelStyle={{ fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)' }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill="var(--color-primary)" 
                fillOpacity={0.8}
                className="hover:fill-opacity-100 transition-all cursor-pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
