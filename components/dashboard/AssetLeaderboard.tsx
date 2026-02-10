'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Trophy, RefreshCw } from 'lucide-react';

interface LeaderboardAsset {
  rank: number;
  id: string;
  symbol: string;
  name: string;
  image: string;
  type?: 'crypto' | 'stock';
  currentPrice: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.0001) return `$${price.toFixed(4)}`;
  return `$${price.toExponential(2)}`;
}

function formatPercent(pct: number): string {
  if (!Number.isFinite(pct)) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatMarketCap(cap: number): string {
  if (cap >= 1_000_000_000_000) return `$${(cap / 1_000_000_000_000).toFixed(2)}T`;
  if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(2)}B`;
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(0)}M`;
  return `$${cap.toLocaleString()}`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toLocaleString();
}

export default function AssetLeaderboard() {
  const [data, setData] = useState<LeaderboardAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load');
        setData([]);
        return;
      }
      setData(Array.isArray(json) ? json : []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5" />
            Top 50 by market cap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0 animate-pulse">
                <div className="h-5 w-6 bg-muted rounded" />
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="h-4 flex-1 max-w-[200px] bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5" />
            Asset Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5" />
          Top 50 by market cap
        </CardTitle>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium w-12">#</th>
                <th className="text-left py-3 px-4 font-medium">Asset</th>
                <th className="text-left py-3 px-4 font-medium w-20">Type</th>
                <th className="text-right py-3 px-4 font-medium">Price</th>
                <th className="text-right py-3 px-4 font-medium">24h %</th>
                <th className="text-right py-3 px-4 font-medium">Market cap</th>
                <th className="text-right py-3 px-4 font-medium">Volume (24h)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/80 hover:bg-accent/5 transition-colors"
                >
                  <td className="py-3 px-4 text-muted-foreground font-medium tabular-nums">
                    {row.rank}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                        {row.image ? (
                          <img
                            src={row.image}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                            {row.symbol.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{row.name}</span>
                        <span className="text-muted-foreground ml-1.5">{row.symbol}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        row.type === 'crypto'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {row.type === 'crypto' ? 'Crypto' : 'Stock'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium tabular-nums">
                    {formatPrice(row.currentPrice)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span
                      className={
                        row.priceChangePercentage24h >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {row.priceChangePercentage24h >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 inline mr-0.5 align-middle" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 inline mr-0.5 align-middle" />
                      )}
                      {formatPercent(row.priceChangePercentage24h)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
                    {formatMarketCap(row.marketCap)}
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
                    {formatVolume(row.volume24h)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
