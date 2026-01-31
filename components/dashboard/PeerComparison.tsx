'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PeerMargins {
  symbol: string;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

const COLORS = {
  gross: '#8b5cf6',      // Violet
  operating: '#06b6d4',  // Cyan  
  net: '#10b981',        // Emerald
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[180px]">
      <p className="text-sm font-semibold text-foreground mb-3">{label}</p>
      <div className="space-y-2">
        {payload.map((entry, index) => {
          const name = entry.dataKey === 'grossMargin' ? 'Gross' : entry.dataKey === 'operatingMargin' ? 'Operating' : 'Net';
          const color = entry.dataKey === 'grossMargin' ? COLORS.gross : entry.dataKey === 'operatingMargin' ? COLORS.operating : COLORS.net;
          return (
            <div key={index} className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-muted-foreground">{name} Margin</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{entry.value.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function PeerComparison({
  symbol,
  peerSymbols = [],
  maxPeers = 2,
}: {
  symbol: string;
  peerSymbols?: string[];
  maxPeers?: number;
}) {
  const symbols = [symbol, ...peerSymbols.slice(0, maxPeers)];
  const [data, setData] = useState<PeerMargins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(
      symbols.map((s) =>
        fetch(`/api/income-statement?symbol=${encodeURIComponent(s)}&limit=1`).then((res) => res.json())
      )
    )
      .then((results) => {
        if (cancelled) return;
        const out: PeerMargins[] = [];
        for (let i = 0; i < symbols.length; i++) {
          const json = results[i];
          const periods = json?.periods ?? [];
          const p = periods[0];
          if (!p || !p.revenue || p.revenue <= 0) continue;
          const rev = p.revenue;
          out.push({
            symbol: symbols[i],
            grossMargin: ((p.grossProfit ?? 0) / rev) * 100,
            operatingMargin: ((p.operatingIncome ?? 0) / rev) * 100,
            netMargin: ((p.netIncome ?? 0) / rev) * 100,
          });
        }
        setData(out);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol, peerSymbols.join(','), maxPeers]);

  if (loading) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Peer Comparison (Margins)</h2>
          <div className="h-[320px] flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading peer data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || data.length === 0) {
    return (
      <Card className="mb-8 overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Peer Comparison (Margins)</h2>
          <div className="h-[320px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-md">{error || 'No margin data for comparison.'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the main symbol's data for highlighting
  const mainSymbolData = data.find(d => d.symbol === symbol);

  return (
    <Card className="mb-8 overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight">Peer Comparison (Margins)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Profitability margins comparison for latest period
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.gross }} />
            <span className="text-xs text-muted-foreground">Gross Margin</span>
            {mainSymbolData && (
              <span className="text-xs font-semibold text-foreground ml-1">{mainSymbolData.grossMargin.toFixed(1)}%</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.operating }} />
            <span className="text-xs text-muted-foreground">Operating Margin</span>
            {mainSymbolData && (
              <span className="text-xs font-semibold text-foreground ml-1">{mainSymbolData.operatingMargin.toFixed(1)}%</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.net }} />
            <span className="text-xs text-muted-foreground">Net Margin</span>
            {mainSymbolData && (
              <span className={`text-xs font-semibold ml-1 ${mainSymbolData.netMargin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {mainSymbolData.netMargin.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }} layout="vertical" barCategoryGap="20%">
              <defs>
                <linearGradient id="grossGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="operatingGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 'auto']}
              />
              <YAxis
                type="category"
                dataKey="symbol"
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => {
                  const isMain = payload.value === symbol;
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={4}
                      textAnchor="end"
                      fontSize={12}
                      fontWeight={isMain ? 600 : 400}
                      fill={isMain ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 4 }} />
              <Bar dataKey="grossMargin" name="Gross margin" fill="url(#grossGrad)" radius={[0, 4, 4, 0]} barSize={16} />
              <Bar dataKey="operatingMargin" name="Operating margin" fill="url(#operatingGrad)" radius={[0, 4, 4, 0]} barSize={16} />
              <Bar dataKey="netMargin" name="Net margin" fill="url(#netGrad)" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer note */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Add peers via Related Stocks or pass peerSymbols prop for comparison.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
