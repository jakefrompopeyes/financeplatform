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

export interface IncomeStatementPeriod {
  period: string;
  date?: string;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda?: number | null;
  depreciationAndAmortization?: number | null;
  interestExpense?: number | null;
  incomeTaxExpense?: number | null;
}

interface WaterfallItem {
  name: string;
  shortName: string;
  base: number;
  value: number;
  type: 'start' | 'decrease' | 'subtotal' | 'end';
  displayValue: number;
  percentOfRevenue?: number;
}

// Modern color palette
const COLORS = {
  revenue: '#10b981',      // Emerald green
  decrease: '#f43f5e',     // Rose red
  subtotal: '#6366f1',     // Indigo
  end: '#8b5cf6',          // Violet
  gridLine: 'hsl(var(--border) / 0.5)',
};

function buildWaterfallData(period: IncomeStatementPeriod): WaterfallItem[] {
  const rev = period.revenue ?? 0;
  const cor = period.costOfRevenue ?? 0;
  const gp = period.grossProfit ?? (rev - cor);
  const opex = period.operatingExpenses ?? 0;
  const oi = period.operatingIncome ?? (gp - opex);
  const ni = period.netIncome ?? 0;
  const otherExpenses = oi - ni;

  const items: WaterfallItem[] = [];
  const calcPercent = (val: number) => rev > 0 ? Math.round((Math.abs(val) / rev) * 100) : 0;

  if (rev > 0) {
    items.push({ 
      name: 'Revenue', 
      shortName: 'Revenue',
      base: 0, 
      value: rev, 
      type: 'start',
      displayValue: rev,
      percentOfRevenue: 100
    });
  }
  
  if (cor > 0) {
    items.push({ 
      name: 'Cost of Revenue', 
      shortName: 'COGS',
      base: gp,
      value: cor,
      type: 'decrease',
      displayValue: -cor,
      percentOfRevenue: calcPercent(cor)
    });
  }
  
  if (gp !== 0 || items.length > 0) {
    items.push({ 
      name: 'Gross Profit', 
      shortName: 'Gross',
      base: 0, 
      value: Math.max(0, gp), 
      type: 'subtotal',
      displayValue: gp,
      percentOfRevenue: calcPercent(gp)
    });
  }
  
  if (opex > 0) {
    items.push({ 
      name: 'Operating Expenses', 
      shortName: 'OpEx',
      base: Math.max(0, oi),
      value: opex,
      type: 'decrease',
      displayValue: -opex,
      percentOfRevenue: calcPercent(opex)
    });
  }
  
  if (oi !== 0 || items.length > 0) {
    items.push({ 
      name: 'Operating Income', 
      shortName: 'Op. Income',
      base: 0, 
      value: Math.max(0, oi), 
      type: 'subtotal',
      displayValue: oi,
      percentOfRevenue: calcPercent(oi)
    });
  }
  
  if (otherExpenses > 0) {
    items.push({ 
      name: 'Tax & Other', 
      shortName: 'Tax/Other',
      base: Math.max(0, ni),
      value: otherExpenses,
      type: 'decrease',
      displayValue: -otherExpenses,
      percentOfRevenue: calcPercent(otherExpenses)
    });
  }
  
  if (ni !== 0 || items.length > 0) {
    items.push({ 
      name: 'Net Income', 
      shortName: 'Net Income',
      base: 0, 
      value: Math.max(0, ni), 
      type: 'end',
      displayValue: ni,
      percentOfRevenue: calcPercent(ni)
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
  // Extract year from date if available
  const year = date ? new Date(date).getFullYear() : null;
  
  // If period is just "FY" and we have a year, show "FY 2024"
  if (period === 'FY' && year) {
    return `FY ${year}`;
  }
  
  // If period is a quarter like "Q1", "Q2", etc. and we have a year
  if (period && /^Q[1-4]$/i.test(period) && year) {
    return `${period.toUpperCase()} ${year}`;
  }
  
  // If period looks like a full date, format it nicely
  if (period && /^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const d = new Date(period);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  
  // If we only have a date, format it
  if (date && (!period || period === date)) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  
  // Fallback to period or date
  return period || date || 'Period';
}

// Custom label component for bars
const CustomLabel = (props: { x?: number; y?: number; width?: number; height?: number; value?: number; payload?: WaterfallItem }) => {
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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: WaterfallItem }>; label?: string }) => {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload.find(p => p.payload)?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[160px]">
      <p className="text-sm font-semibold text-foreground mb-2">{data.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs text-muted-foreground">Amount</span>
          <span className={`text-sm font-bold ${data.displayValue >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatLarge(data.displayValue)}
          </span>
        </div>
        {data.percentOfRevenue !== undefined && (
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-muted-foreground">% of Revenue</span>
            <span className="text-sm font-medium text-foreground">{data.percentOfRevenue}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function IncomeWaterfall({ symbol }: { symbol: string }) {
  const [data, setData] = useState<{
    periods: IncomeStatementPeriod[];
    error: string | null;
  }>({ periods: [], error: null });
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/income-statement?symbol=${encodeURIComponent(symbol)}&limit=4`)
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
      .catch((err) => {
        if (!cancelled) setData({ periods: [], error: err?.message || 'Failed to load' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  const period = data.periods[selectedIndex];
  const waterfallData = period ? buildWaterfallData(period) : [];

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Revenue → Earnings Waterfall</h2>
          <div className="h-[340px] flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading financials...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error || data.periods.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Revenue → Earnings Waterfall</h2>
          <div className="h-[340px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {data.error || 'No income statement data for this symbol. It may require a higher FMP plan.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate net margin for display
  const netMargin = period && period.revenue && period.netIncome 
    ? ((period.netIncome / period.revenue) * 100).toFixed(1) 
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Revenue → Earnings Waterfall</h2>
            <p className="text-sm text-muted-foreground mt-1">
              How revenue flows through costs to net income
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
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.revenue }} />
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.decrease }} />
            <span className="text-xs text-muted-foreground">Costs & Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.subtotal }} />
            <span className="text-xs text-muted-foreground">Subtotals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.end }} />
            <span className="text-xs text-muted-foreground">Net Income</span>
          </div>
          {netMargin && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full">
              <span className="text-xs text-muted-foreground">Net Margin:</span>
              <span className={`text-xs font-semibold ${parseFloat(netMargin) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {netMargin}%
              </span>
            </div>
          )}
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
                {/* Gradient definitions for bars */}
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="decreaseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                <linearGradient id="subtotalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="endGradient" x1="0" y1="0" x2="0" y2="1">
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
              {/* Invisible base bar */}
              <Bar 
                dataKey="base" 
                stackId="waterfall" 
                fill="transparent" 
                name="base"
              />
              {/* Visible value bar */}
              <Bar 
                dataKey="value" 
                stackId="waterfall" 
                radius={[6, 6, 0, 0]} 
                name="Value"
              >
                {waterfallData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.type === 'start'
                        ? 'url(#revenueGradient)'
                        : entry.type === 'decrease'
                          ? 'url(#decreaseGradient)'
                          : entry.type === 'end'
                            ? 'url(#endGradient)'
                            : 'url(#subtotalGradient)'
                    }
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  />
                ))}
                <LabelList 
                  dataKey="value" 
                  content={<CustomLabel />}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer summary */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-semibold text-foreground">{formatLarge(period?.revenue ?? 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Gross Profit:</span>
              <span className="font-semibold text-foreground">{formatLarge(period?.grossProfit ?? 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Net Income:</span>
              <span className={`font-semibold ${(period?.netIncome ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatLarge(period?.netIncome ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
