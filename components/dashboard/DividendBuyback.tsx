'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export interface DividendItem {
  date: string;
  dividend: number;
  adjDividend?: number;
  recordDate?: string;
  paymentDate?: string;
  declarationDate?: string;
}

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

  const chartData = [...data.dividends].reverse().map((d) => ({ date: d.date, dividend: d.dividend }));
  const lastDividend = data.dividends[0];
  const annualized = lastDividend?.dividend
    ? data.dividends.length >= 4
      ? data.dividends.slice(0, 4).reduce((s, d) => s + d.dividend, 0)
      : lastDividend.dividend * 4
    : 0;
  const yieldPct = currentPrice && currentPrice > 0 && annualized > 0 ? (annualized / currentPrice) * 100 : null;

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Dividends</h2>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Dividends</h2>
          <p className="text-sm text-muted-foreground py-6 text-center">{data.error}</p>
        </CardContent>
      </Card>
    );
  }

  const tooltipStyle = { fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', padding: '8px 12px', backgroundColor: 'hsl(var(--card))' };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-2">Dividends</h2>
        <p className="text-xs text-muted-foreground mb-4">Historical dividend payouts. Buyback data may appear in Cash Flow (e.g. repurchase of common stock).</p>
        {data.dividends.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No dividend history for this symbol.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {lastDividend && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Last dividend</p>
                  <p className="text-lg font-semibold tabular-nums">${lastDividend.dividend.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{lastDividend.date}</p>
                </div>
              )}
              {yieldPct != null && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Est. yield</p>
                  <p className="text-lg font-semibold tabular-nums">{yieldPct.toFixed(2)}%</p>
                </div>
              )}
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Dividend']} labelFormatter={(l) => `Date: ${l}`} />
                  <Line type="monotone" dataKey="dividend" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Dividend" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
