'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface IncomePeriod {
  period: string;
  date?: string;
  revenue: number | null;
  netIncome: number | null;
}

function formatLarge(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(0)}`;
}

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
    period: p.period || p.date || '',
    revenue: p.revenue ?? 0,
    netIncome: p.netIncome ?? 0,
  }));

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Revenue vs Net Income</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error || chartData.length === 0) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Revenue vs Net Income</h2>
          <p className="text-sm text-muted-foreground py-6 text-center">{data.error || 'No data.'}</p>
        </CardContent>
      </Card>
    );
  }

  const tooltipStyle = { fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', padding: '8px 12px', backgroundColor: 'hsl(var(--card))' };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-2">Revenue vs Net Income</h2>
        <p className="text-xs text-muted-foreground mb-4">Actual revenue (bars) and net income (line) by period.</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="revenue" orientation="left" tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v))} />
              <YAxis yAxisId="ni" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v))} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [formatLarge(value), name === 'revenue' ? 'Revenue' : 'Net Income']}
                labelFormatter={(l) => `Period: ${l}`}
              />
              <Bar yAxisId="revenue" dataKey="revenue" fill="hsl(var(--primary) / 0.6)" name="revenue" radius={[4, 4, 0, 0]} />
              <Line yAxisId="ni" type="monotone" dataKey="netIncome" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={{ r: 4 }} name="netIncome" />
              <Legend formatter={(v) => (v === 'revenue' ? 'Revenue' : 'Net Income')} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
