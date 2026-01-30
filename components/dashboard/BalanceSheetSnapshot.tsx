'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export interface BalanceSheetPeriod {
  period: string;
  date?: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  cashAndEquivalents: number | null;
}

function formatLarge(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(0)}`;
}

export default function BalanceSheetSnapshot({ symbol }: { symbol: string }) {
  const [data, setData] = useState<{ periods: BalanceSheetPeriod[]; error: string | null }>({ periods: [], error: null });
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/balance-sheet?symbol=${encodeURIComponent(symbol)}&limit=4`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error && !json.periods) {
          setData({ periods: [], error: json.error });
          return;
        }
        setData({ periods: json.periods || [], error: null });
        setSelectedIndex(0);
      })
      .catch((err) => { if (!cancelled) setData({ periods: [], error: err?.message || 'Failed to load' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  const period = data.periods[selectedIndex];

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Balance Sheet Snapshot</h2>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error || !period) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Balance Sheet Snapshot</h2>
          <p className="text-sm text-muted-foreground py-6 text-center">{data.error || 'No balance sheet data.'}</p>
        </CardContent>
      </Card>
    );
  }

  const assets = period.totalAssets ?? 0;
  const liabilities = period.totalLiabilities ?? 0;
  const equity = period.totalEquity ?? 0;
  const cash = period.cashAndEquivalents ?? 0;
  const debt = period.totalDebt ?? 0;

  const pieData = [
    ...(liabilities > 0 ? [{ name: 'Liabilities', value: liabilities, fill: 'hsl(0 84% 55%)' }] : []),
    ...(equity > 0 ? [{ name: 'Equity', value: equity, fill: 'hsl(142 76% 45%)' }] : []),
  ].filter((d) => d.value > 0);

  const tooltipStyle = { fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', padding: '8px 12px', backgroundColor: 'hsl(var(--card))' };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Balance Sheet Snapshot</h2>
          {data.periods.length > 1 && (
            <div className="flex gap-2">
              {data.periods.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${selectedIndex === i ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                  {p.period || p.date || `Period ${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">Assets = Liabilities + Equity. Key totals for the selected period.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Assets</span>
              <span className="text-sm font-medium tabular-nums">{formatLarge(assets)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Liabilities</span>
              <span className="text-sm font-medium tabular-nums">{formatLarge(liabilities)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Equity</span>
              <span className="text-sm font-medium tabular-nums">{formatLarge(equity)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Cash & Equivalents</span>
              <span className="text-sm font-medium tabular-nums">{formatLarge(cash)}</span>
            </div>
            {debt !== 0 && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Total Debt</span>
                <span className="text-sm font-medium tabular-nums">{formatLarge(debt)}</span>
              </div>
            )}
          </div>
          {pieData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} label={({ name }) => name}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatLarge(v)} contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
