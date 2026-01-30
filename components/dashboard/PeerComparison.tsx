'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PeerMargins {
  symbol: string;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

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
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Peer Comparison (Margins)</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || data.length === 0) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Peer Comparison (Margins)</h2>
          <p className="text-sm text-muted-foreground py-6 text-center">{error || 'No margin data for comparison.'}</p>
        </CardContent>
      </Card>
    );
  }

  const tooltipStyle = { fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', padding: '8px 12px', backgroundColor: 'hsl(var(--card))' };
  const colors = ['hsl(var(--primary))', 'hsl(262 52% 47%)', 'hsl(173 58% 39%)'];

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-2">Peer Comparison (Margins)</h2>
        <p className="text-xs text-muted-foreground mb-4">Gross, operating, and net margin vs peers (latest period). Add peers via Related Stocks or pass peerSymbols prop.</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }} layout="vertical" barCategoryGap="12%">
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
              <YAxis type="category" dataKey="symbol" width={48} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatPct(value), '']} />
              <Bar dataKey="grossMargin" name="Gross margin" fill={colors[0]} radius={[0, 2, 2, 0]} />
              <Bar dataKey="operatingMargin" name="Operating margin" fill={colors[1]} radius={[0, 2, 2, 0]} />
              <Bar dataKey="netMargin" name="Net margin" fill={colors[2]} radius={[0, 2, 2, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
