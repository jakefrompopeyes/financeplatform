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
  LabelList,
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
  shortName: string;
  base: number;
  value: number;
  type: 'start' | 'decrease' | 'subtotal' | 'end';
  displayValue: number;
}

const COLORS = {
  positive: '#10b981',
  negative: '#f43f5e',
  subtotal: '#6366f1',
  end: '#8b5cf6',
};

function buildWaterfallData(period: CashFlowPeriod): WaterfallItem[] {
  const ocf = period.operatingCashFlow ?? 0;
  const capex = Math.abs(period.capitalExpenditure ?? 0);
  const fcf = period.freeCashFlow ?? (ocf - capex);
  const div = Math.abs(period.dividendPaid ?? 0);
  const netChange = period.netChangeInCash ?? 0;

  const items: WaterfallItem[] = [];

  // Operating Cash Flow - starts at 0
  if (ocf !== 0) {
    items.push({
      name: 'Operating Cash Flow',
      shortName: 'Op. CF',
      base: 0,
      value: Math.abs(ocf),
      type: ocf >= 0 ? 'start' : 'decrease',
      displayValue: ocf,
    });
  }

  // CapEx - "falls" from OCF to FCF
  if (capex > 0) {
    items.push({
      name: 'Capital Expenditure',
      shortName: 'CapEx',
      base: Math.max(0, fcf),
      value: capex,
      type: 'decrease',
      displayValue: -capex,
    });
  }

  // Free Cash Flow - subtotal
  if (fcf !== 0 || items.length > 0) {
    items.push({
      name: 'Free Cash Flow',
      shortName: 'FCF',
      base: 0,
      value: Math.max(0, fcf),
      type: 'subtotal',
      displayValue: fcf,
    });
  }

  // Dividends - "falls" from FCF
  if (div > 0) {
    const afterDiv = fcf - div;
    items.push({
      name: 'Dividends Paid',
      shortName: 'Dividends',
      base: Math.max(0, afterDiv),
      value: div,
      type: 'decrease',
      displayValue: -div,
    });
  }

  // Net Change in Cash - final
  if (netChange !== 0 || items.length > 0) {
    items.push({
      name: 'Net Change in Cash',
      shortName: 'Net Change',
      base: 0,
      value: Math.max(0, Math.abs(netChange)),
      type: 'end',
      displayValue: netChange,
    });
  }

  return items;
}

function formatLarge(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

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

const CustomLabel = (props: { x?: number; y?: number; width?: number; height?: number; payload?: WaterfallItem }) => {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload || height < 20) return null;
  
  const displayVal = formatCompact(payload.displayValue);
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  return (
    <text
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="white"
      fontSize={11}
      fontWeight={600}
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
    >
      {displayVal}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: WaterfallItem }> }) => {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload.find(p => p.payload)?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[160px]">
      <p className="text-sm font-semibold text-foreground mb-2">{data.name}</p>
      <div className="flex justify-between items-center gap-4">
        <span className="text-xs text-muted-foreground">Amount</span>
        <span className={`text-sm font-bold ${data.displayValue >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {formatLarge(data.displayValue)}
        </span>
      </div>
    </div>
  );
};

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
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Cash Flow Waterfall</h2>
          <div className="h-[340px] flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading cash flow...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error || data.periods.length === 0) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Cash Flow Waterfall</h2>
          <div className="h-[340px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-md">{data.error || 'No cash flow data.'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fcf = period?.freeCashFlow ?? 0;

  return (
    <Card className="mb-8 overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Cash Flow Waterfall</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Operating cash flow to free cash flow breakdown
            </p>
          </div>
          {data.periods.length > 1 && (
            <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
              {data.periods.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    selectedIndex === i
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                >
                  {formatPeriodLabel(p.period, p.date)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.positive }} />
            <span className="text-xs text-muted-foreground">Inflows</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.negative }} />
            <span className="text-xs text-muted-foreground">Outflows</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.subtotal }} />
            <span className="text-xs text-muted-foreground">Subtotals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.end }} />
            <span className="text-xs text-muted-foreground">Net Change</span>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full">
            <span className="text-xs text-muted-foreground">Free Cash Flow:</span>
            <span className={`text-xs font-semibold ${fcf >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatLarge(fcf)}
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterfallData}
              margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
              barCategoryGap="15%"
              stackOffset="none"
            >
              <defs>
                <linearGradient id="cfPositiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="cfNegativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                <linearGradient id="cfSubtotalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="cfEndGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="shortName"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => {
                  if (v >= 1e12) return `${(v / 1e12).toFixed(0)}T`;
                  if (v >= 1e9) return `${(v / 1e9).toFixed(0)}B`;
                  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
                  return String(v);
                }}
                domain={[0, 'auto']}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 4 }} />
              <Bar dataKey="base" stackId="waterfall" fill="transparent" name="base" />
              <Bar dataKey="value" stackId="waterfall" radius={[6, 6, 0, 0]} name="Value">
                {waterfallData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.type === 'start'
                        ? 'url(#cfPositiveGradient)'
                        : entry.type === 'decrease'
                          ? 'url(#cfNegativeGradient)'
                          : entry.type === 'end'
                            ? 'url(#cfEndGradient)'
                            : 'url(#cfSubtotalGradient)'
                    }
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  />
                ))}
                <LabelList dataKey="value" content={<CustomLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer summary */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Operating CF:</span>
              <span className="font-semibold text-foreground">{formatLarge(period?.operatingCashFlow ?? 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">CapEx:</span>
              <span className="font-semibold text-foreground">{formatLarge(period?.capitalExpenditure ?? 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Net Change:</span>
              <span className={`font-semibold ${(period?.netChangeInCash ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatLarge(period?.netChangeInCash ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
