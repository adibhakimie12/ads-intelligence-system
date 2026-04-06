import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTheme } from '../context/ThemeContext';

export interface TrendData {
  label: string;
  value: number;
}

export default function TrendChart({ data }: { data: TrendData[] }) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  const barFill = theme === 'dark' ? 'var(--color-primary-container)' : 'var(--color-primary)';
  const barFillOpacity = theme === 'dark' ? 0.95 : 0.8;
  const gridStroke = theme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(87, 83, 78, 0.12)';
  const tooltipBg = theme === 'dark' ? 'var(--color-surface-container-low)' : 'var(--color-surface)';
  const tooltipText = theme === 'dark' ? 'var(--color-on-surface)' : 'var(--color-primary)';

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setIsChartReady(element.clientWidth > 16 && element.clientHeight > 16);
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="h-64 min-h-[256px] min-w-0 w-full">
      {isChartReady && (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
          <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="4 6" />
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
                backgroundColor: tooltipBg,
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                padding: '12px 16px'
              }}
              itemStyle={{ fontWeight: 800, fontSize: '14px', color: tooltipText }}
              labelStyle={{ fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)' }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={barFill}
                  fillOpacity={barFillOpacity}
                  className="hover:fill-opacity-100 transition-all cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
