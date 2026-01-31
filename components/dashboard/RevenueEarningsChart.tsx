'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface IncomePeriod {
  period: string;
  date?: string;
  revenue: number | null;
  netIncome: number | null;
}

const COLORS = {
  revenue: '#6366f1',    // Indigo
  netIncome: '#10b981',  // Emerald
};

function formatPeriodLabel(period?: string, date?: string): string {
  const year = date ? new Date(date).getFullYear() : null;
  if (period === 'FY' && year) return `FY ${year}`;
  if (period && /^Q[1-4]$/i.test(period) && year) return `${period.toUpperCase()} ${year}`;
  if (period && /^\d{4}-\d{2}-\d{2}$/.test(period)) {
    return new Date(period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (date && (!period || period === date)) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return period || date || 'Period';
}

function formatLarge(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string }) => {
  if (!active || !payload || payload.length === 0) return null;

  const revenue = payload.find(p => p.dataKey === 'revenue')?.value ?? 0;
  const netIncome = payload.find(p => p.dataKey === 'netIncome')?.value ?? 0;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[180px]">
      <p className="text-sm font-semibold text-foreground mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.revenue }} />
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{formatLarge(revenue)}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.netIncome }} />
            <span className="text-xs text-muted-foreground">Net Income</span>
          </div>
          <span className={`text-sm font-semibold ${netIncome >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatLarge(netIncome)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function RevenueEarningsChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<{ periods: IncomePeriod[]; error: string | null }>({ periods: [], error: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/income-statement?symbol=${encodeURIComponent(symbol)}&limit=8`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error && !json.periods) {
          setData({ periods: [], error: json.error });
          return;
        }
        setData({ periods: (json.periods || []).reverse(), error: null });
      })
      .catch((err) => { if (!cancelled) setData({ periods: [], error: err?.message || 'Failed to load' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  const chartData = data.periods.map((p) => ({
    period: formatPeriodLabel(p.period, p.date),
    revenue: p.revenue ?? 0,
    netIncome: p.netIncome ?? 0,
  }));

  // Calculate growth rates
  const latestRevenue = chartData.length > 0 ? chartData[chartData.length - 1].revenue : 0;
  const prevRevenue = chartData.length > 1 ? chartData[chartData.length - 2].revenue : 0;
  const revenueGrowth = prevRevenue > 0 ? ((latestRevenue - prevRevenue) / prevRevenue) * 100 : null;

  if (loading) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Revenue vs Net Income</h2>
          <div className="h-[320px] flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading revenue data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error || chartData.length === 0) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Revenue vs Net Income</h2>
          <div className="h-[320px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-md">{data.error || 'No data.'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight">Revenue vs Net Income</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Historical revenue and profitability over time
          </p>
        </div>

        {/* Legend with current values */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.revenue }} />
            <span className="text-xs text-muted-foreground">Revenue</span>
            <span className="text-xs font-semibold text-foreground ml-1">{formatLarge(latestRevenue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.netIncome }} />
            <span className="text-xs text-muted-foreground">Net Income</span>
            <span className={`text-xs font-semibold ml-1 ${(chartData[chartData.length - 1]?.netIncome ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatLarge(chartData[chartData.length - 1]?.netIncome ?? 0)}
            </span>
          </div>
          {revenueGrowth !== null && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full">
              <span className="text-xs text-muted-foreground">YoY Growth:</span>
              <span className={`text-xs font-semibold ${revenueGrowth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(0)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v))}
                width={45}
              />
              <YAxis
                yAxisId="ni"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(0)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v))}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 4 }} />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                fill="url(#revenueBarGradient)"
                name="revenue"
                radius={[6, 6, 0, 0]}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              />
              <Line
                yAxisId="ni"
                type="monotone"
                dataKey="netIncome"
                stroke={COLORS.netIncome}
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS.netIncome, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 6, fill: COLORS.netIncome, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                name="netIncome"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
