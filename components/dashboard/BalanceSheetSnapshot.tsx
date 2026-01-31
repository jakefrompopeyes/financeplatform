'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export interface BalanceSheetPeriod {
  period: string;
  date?: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  cashAndEquivalents: number | null;
}

const COLORS = {
  liabilities: '#f43f5e',  // Rose
  equity: '#10b981',       // Emerald
  cash: '#6366f1',         // Indigo
  debt: '#f97316',         // Orange
};

function formatLarge(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toFixed(0)}`;
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

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; fill: string } }> }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[140px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
        <span className="text-sm font-medium text-foreground">{data.name}</span>
      </div>
      <p className="text-lg font-bold text-foreground pl-4">{formatLarge(data.value)}</p>
    </div>
  );
};

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
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Balance Sheet Snapshot</h2>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading balance sheet...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.error || !period) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Balance Sheet Snapshot</h2>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-md">{data.error || 'No balance sheet data.'}</p>
          </div>
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
    ...(liabilities > 0 ? [{ name: 'Liabilities', value: liabilities, fill: COLORS.liabilities }] : []),
    ...(equity > 0 ? [{ name: 'Equity', value: equity, fill: COLORS.equity }] : []),
  ].filter((d) => d.value > 0);

  // Calculate debt-to-equity ratio
  const debtToEquity = equity > 0 && debt > 0 ? (debt / equity) : null;

  return (
    <Card className="mb-8 overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Balance Sheet Snapshot</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Assets = Liabilities + Equity breakdown
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

        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left side - Key metrics */}
          <div className="space-y-1">
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Total Assets</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{formatLarge(assets)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.liabilities }} />
                <span className="text-sm text-muted-foreground">Total Liabilities</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-rose-500">{formatLarge(liabilities)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.equity }} />
                <span className="text-sm text-muted-foreground">Total Equity</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-emerald-500">{formatLarge(equity)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.cash }} />
                <span className="text-sm text-muted-foreground">Cash & Equivalents</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-indigo-500">{formatLarge(cash)}</span>
            </div>
            {debt !== 0 && (
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.debt }} />
                  <span className="text-sm text-muted-foreground">Total Debt</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-orange-500">{formatLarge(debt)}</span>
              </div>
            )}
            
            {/* Ratio badges */}
            <div className="flex flex-wrap gap-2 pt-4">
              {debtToEquity !== null && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
                  <span className="text-xs text-muted-foreground">Debt/Equity:</span>
                  <span className={`text-xs font-semibold ${debtToEquity <= 1 ? 'text-emerald-500' : debtToEquity <= 2 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {debtToEquity.toFixed(2)}x
                  </span>
                </div>
              )}
              {assets > 0 && equity > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
                  <span className="text-xs text-muted-foreground">Equity Ratio:</span>
                  <span className="text-xs font-semibold text-foreground">
                    {((equity / assets) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Pie chart */}
          {pieData.length > 0 && (
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-[220px] h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient id="liabilitiesGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fb7185" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </linearGradient>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.name === 'Liabilities' ? 'url(#liabilitiesGradient)' : 'url(#equityGradient)'}
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Assets</span>
                  <span className="text-lg font-bold tabular-nums mt-0.5">{formatLarge(assets)}</span>
                </div>
              </div>
              {/* Legend under chart */}
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.liabilities }} />
                  <span className="text-xs text-muted-foreground">Liabilities</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.equity }} />
                  <span className="text-xs text-muted-foreground">Equity</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
