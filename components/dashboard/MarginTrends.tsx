'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';

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
      period: p.period || p.date || '',
      grossMargin: ((p.grossProfit ?? 0) / (p.revenue ?? 1)) * 100,
      operatingMargin: ((p.operatingIncome ?? 0) / (p.revenue ?? 1)) * 100,
      netMargin: ((p.netIncome ?? 0) / (p.revenue ?? 1)) * 100,
    }))
    .reverse();

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Margin Trends</h2>
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
          <h2 className="text-lg font-semibold mb-4">Margin Trends</h2>
          <p className="text-sm text-muted-foreground py-6 text-center">{data.error || 'No margin data.'}</p>
        </CardContent>
      </Card>
    );
  }

  const tooltipStyle = { fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', padding: '8px 12px', backgroundColor: 'hsl(var(--card))' };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-2">Margin Trends</h2>
        <p className="text-xs text-muted-foreground mb-4">Gross, operating, and net margin over time (% of revenue).</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value.toFixed(1)}%`, '']} labelFormatter={(l) => `Period: ${l}`} />
              <Line type="monotone" dataKey="grossMargin" name="Gross margin" stroke="hsl(262 52% 47%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="operatingMargin" name="Operating margin" stroke="hsl(173 58% 39%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="netMargin" name="Net margin" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
