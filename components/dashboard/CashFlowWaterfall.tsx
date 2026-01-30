'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

export interface CashFlowPeriod {
  period: string;
  date?: string;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  dividendPaid: number | null;
  netBorrowings: number | null;
  netChangeInCash: number | null;
}

interface WaterfallItem {
  name: string;
  value: number;
  type: 'positive' | 'negative' | 'subtotal';
  absValue: number;
}

function buildWaterfallData(period: CashFlowPeriod): WaterfallItem[] {
  const ocf = period.operatingCashFlow ?? 0;
  const capex = period.capitalExpenditure ?? 0;
  const fcf = period.freeCashFlow ?? (ocf - Math.abs(capex));
  const div = period.dividendPaid ?? 0;
  const divAbs = div <= 0 ? Math.abs(div) : div;
  const netChange = period.netChangeInCash ?? 0;

  const items: WaterfallItem[] = [];
  if (ocf !== 0) items.push({ name: 'Operating Cash Flow', value: ocf, type: ocf >= 0 ? 'positive' : 'negative', absValue: Math.abs(ocf) });
  if (capex !== 0) items.push({ name: 'CapEx', value: capex, type: 'negative', absValue: Math.abs(capex) });
  if (fcf !== 0 || items.length > 0) items.push({ name: 'Free Cash Flow', value: fcf, type: 'subtotal', absValue: Math.abs(fcf) });
  if (divAbs > 0) items.push({ name: 'Dividends', value: -divAbs, type: 'negative', absValue: divAbs });
  if (netChange !== 0 || items.length > 0) items.push({ name: 'Net Change in Cash', value: netChange, type: 'subtotal', absValue: Math.abs(netChange) });
  return items.filter((i) => i.value !== 0 || i.type === 'subtotal');
}

function formatLarge(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(0)}`;
}

export default function CashFlowWaterfall({ symbol }: { symbol: string }) {
  const [data, setData] = useState<{ periods: CashFlowPeriod[]; error: string | null }>({ periods: [], error: null });
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/cash-flow?symbol=${encodeURIComponent(symbol)}&limit=4`)
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
  const waterfallData = period ? buildWaterfallData(period) : [];

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Cash Flow Waterfall</h2>
          <div className="h-72 flex items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error || data.periods.length === 0) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Cash Flow Waterfall</h2>
          <p className="text-sm text-muted-foreground py-6 text-center">{data.error || 'No cash flow data.'}</p>
        </CardContent>
      </Card>
    );
  }

  const tooltipStyle = { fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', padding: '8px 12px', backgroundColor: 'hsl(var(--card))' };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Cash Flow Waterfall</h2>
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
        <p className="text-xs text-muted-foreground mb-4">Operating cash flow, CapEx, free cash flow, dividends, and net change in cash.</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }} barCategoryGap="20%">
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => (v.length > 16 ? v.slice(0, 14) + '…' : v)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(0)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v))} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatLarge(value), '']} labelFormatter={(label) => label} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Value">
                {waterfallData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.type === 'subtotal' ? 'hsl(var(--primary))' : entry.value >= 0 ? 'hsl(142 76% 45%)' : 'hsl(0 84% 55%)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
