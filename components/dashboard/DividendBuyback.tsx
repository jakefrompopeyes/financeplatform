'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';

export interface DividendItem {
  date: string;
  dividend: number;
  adjDividend?: number;
  recordDate?: string;
  paymentDate?: string;
  declarationDate?: string;
}

const COLORS = {
  dividend: '#8b5cf6', // Violet
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[140px]">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">${payload[0].value.toFixed(2)}</p>
      <p className="text-xs text-muted-foreground">per share</p>
    </div>
  );
};

export default function DividendBuyback({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  const [data, setData] = useState<{ dividends: DividendItem[]; error: string | null }>({ dividends: [], error: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/dividends?symbol=${encodeURIComponent(symbol)}&limit=24`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error && !json.dividends) {
          setData({ dividends: [], error: json.error });
          return;
        }
        setData({ dividends: json.dividends || [], error: null });
      })
      .catch((err) => { if (!cancelled) setData({ dividends: [], error: err?.message || 'Failed to load' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  const chartData = [...data.dividends].reverse().map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    dividend: d.dividend,
  }));
  
  const lastDividend = data.dividends[0];
  const annualized = lastDividend?.dividend
    ? data.dividends.length >= 4
      ? data.dividends.slice(0, 4).reduce((s, d) => s + d.dividend, 0)
      : lastDividend.dividend * 4
    : 0;
  const yieldPct = currentPrice && currentPrice > 0 && annualized > 0 ? (annualized / currentPrice) * 100 : null;

  // Calculate dividend growth
  const oldDividend = data.dividends.length >= 5 ? data.dividends[4]?.dividend : null;
  const dividendGrowth = oldDividend && lastDividend?.dividend 
    ? ((lastDividend.dividend - oldDividend) / oldDividend) * 100 
    : null;

  if (loading) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Dividends</h2>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading dividend history...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Dividends</h2>
          <div className="h-[280px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-md">{data.error}</p>
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
          <h2 className="text-lg font-semibold tracking-tight">Dividends</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Historical dividend payouts and yield analysis
          </p>
        </div>

        {data.dividends.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No dividend history for this symbol.</p>
              <p className="text-xs text-muted-foreground mt-1">This company may not pay dividends.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {lastDividend && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Last Dividend</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">${lastDividend.dividend.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(lastDividend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
              {yieldPct != null && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-medium">Est. Yield</span>
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${yieldPct >= 3 ? 'text-emerald-500' : 'text-foreground'}`}>
                    {yieldPct.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Annualized</p>
                </div>
              )}
              {annualized > 0 && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium">Annual Div.</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">${annualized.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Per share/year</p>
                </div>
              )}
              {dividendGrowth !== null && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-medium">Growth</span>
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${dividendGrowth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {dividendGrowth >= 0 ? '+' : ''}{dividendGrowth.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">vs 1 year ago</p>
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="dividendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.dividend} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.dividend} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `$${v}`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area
                    type="monotone"
                    dataKey="dividend"
                    stroke={COLORS.dividend}
                    strokeWidth={2.5}
                    fill="url(#dividendGradient)"
                    dot={{ r: 3, fill: COLORS.dividend, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                    activeDot={{ r: 5, fill: COLORS.dividend, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
