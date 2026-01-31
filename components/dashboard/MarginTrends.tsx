'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface IncomePeriod {
  period: string;
  date?: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
}

interface MarginPoint {
  period: string;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

const COLORS = {
  gross: '#8b5cf6',      // Violet
  operating: '#06b6d4',  // Cyan
  net: '#10b981',        // Emerald
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

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[180px]">
      <p className="text-sm font-semibold text-foreground mb-3">{label}</p>
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-muted-foreground">
                {entry.dataKey === 'grossMargin' ? 'Gross' : entry.dataKey === 'operatingMargin' ? 'Operating' : 'Net'}
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">{entry.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function MarginTrends({ symbol }: { symbol: string }) {
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
        setData({ periods: json.periods || [], error: null });
      })
      .catch((err) => { if (!cancelled) setData({ periods: [], error: err?.message || 'Failed to load' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  const chartData: MarginPoint[] = data.periods
    .filter((p) => (p.revenue ?? 0) > 0)
    .map((p) => ({
      period: formatPeriodLabel(p.period, p.date),
      grossMargin: ((p.grossProfit ?? 0) / (p.revenue ?? 1)) * 100,
      operatingMargin: ((p.operatingIncome ?? 0) / (p.revenue ?? 1)) * 100,
      netMargin: ((p.netIncome ?? 0) / (p.revenue ?? 1)) * 100,
    }))
    .reverse();

  // Calculate latest margins for display
  const latestMargins = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  if (loading) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Margin Trends</h2>
          <div className="h-[320px] flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading margins...</span>
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
          <h2 className="text-lg font-semibold mb-4">Margin Trends</h2>
          <div className="h-[320px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-md">{data.error || 'No margin data.'}</p>
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
          <h2 className="text-lg font-semibold tracking-tight">Margin Trends</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Profitability margins over time (% of revenue)
          </p>
        </div>

        {/* Legend with current values */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.gross }} />
            <span className="text-xs text-muted-foreground">Gross Margin</span>
            {latestMargins && (
              <span className="text-xs font-semibold text-foreground ml-1">{latestMargins.grossMargin.toFixed(1)}%</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.operating }} />
            <span className="text-xs text-muted-foreground">Operating Margin</span>
            {latestMargins && (
              <span className="text-xs font-semibold text-foreground ml-1">{latestMargins.operatingMargin.toFixed(1)}%</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.net }} />
            <span className="text-xs text-muted-foreground">Net Margin</span>
            {latestMargins && (
              <span className={`text-xs font-semibold ml-1 ${latestMargins.netMargin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {latestMargins.netMargin.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="grossGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLORS.gross} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={COLORS.gross} />
                </linearGradient>
                <linearGradient id="operatingGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLORS.operating} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={COLORS.operating} />
                </linearGradient>
                <linearGradient id="netGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLORS.net} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={COLORS.net} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${v}%`}
                domain={['auto', 'auto']}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Line
                type="monotone"
                dataKey="grossMargin"
                stroke="url(#grossGradient)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS.gross, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 6, fill: COLORS.gross, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
              <Line
                type="monotone"
                dataKey="operatingMargin"
                stroke="url(#operatingGradient)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS.operating, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 6, fill: COLORS.operating, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
              <Line
                type="monotone"
                dataKey="netMargin"
                stroke="url(#netGradient)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS.net, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 6, fill: COLORS.net, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
