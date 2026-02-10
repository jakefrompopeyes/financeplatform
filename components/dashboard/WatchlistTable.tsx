'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  X,
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  ChevronUp,
  ChevronDown,
  Plus,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from 'recharts';

const STOCK_LOGO_BASE = 'https://financialmodelingprep.com/image-stock';

/* ── Types ── */

interface WatchlistAsset {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  type: 'stock' | 'crypto';
  viewedAt?: number;
  image?: string;
  volume?: number;
  marketCap?: number;
  pe?: number | null;
  eps?: number | null;
  priceToSales?: number | null;
  priceToBook?: number | null;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  sparkline?: { close: number }[];
}

type ViewMode = 'watchlist' | 'recent';
type SortKey = 'symbol' | 'price' | 'changePercent' | 'volume' | 'marketCap' | 'pe' | 'eps' | 'priceToSales' | 'priceToBook';
type SortDir = 'asc' | 'desc';

/* ── Helpers ── */

function formatPrice(price: number | undefined, type: string) {
  if (price == null) return '—';
  if (type === 'crypto' && price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatChange(change: number | undefined) {
  if (change == null || !Number.isFinite(change)) return '';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

function formatPercent(pct: number | undefined) {
  if (pct == null || !Number.isFinite(pct)) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatVolume(vol: number | undefined) {
  if (vol == null) return '—';
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toLocaleString();
}

function formatMarketCap(cap: number | undefined | null) {
  if (cap == null) return '—';
  if (cap >= 1_000_000_000_000) return `$${(cap / 1_000_000_000_000).toFixed(2)}T`;
  if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(2)}B`;
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(0)}M`;
  return `$${cap.toLocaleString()}`;
}

/* ── Mini sparkline ── */

function Sparkline({ data, positive }: { data: { close: number }[]; positive: boolean }) {
  if (!data || data.length < 2) return <div className="w-[100px] h-[32px]" />;
  return (
    <div className="w-[100px] h-[32px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="close"
            stroke={positive ? '#22c55e' : '#ef4444'}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── 52-week range bar ── */

function FiftyTwoWeekBar({
  low,
  high,
  current,
}: {
  low?: number;
  high?: number;
  current?: number;
}) {
  if (low == null || high == null || current == null || high === low)
    return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary/60"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background shadow-sm"
          style={{ left: `calc(${pct}% - 5px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatPrice(low, 'stock')}</span>
        <span>{formatPrice(high, 'stock')}</span>
      </div>
    </div>
  );
}

/* ── Sortable header cell ── */

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = 'right',
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group ${
        align === 'right' ? 'ml-auto' : ''
      }`}
    >
      {label}
      {active ? (
        currentDir === 'asc' ? (
          <ChevronUp className="w-3 h-3 text-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-foreground" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  );
}

/* ── Main component ── */

export default function WatchlistTable() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('watchlist');
  const [watchlist, setWatchlist] = useState<WatchlistAsset[]>([]);
  const [recentAssets, setRecentAssets] = useState<WatchlistAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const watchlistRef = useRef<WatchlistAsset[]>([]);
  const recentAssetsRef = useRef<WatchlistAsset[]>([]);

  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { recentAssetsRef.current = recentAssets; }, [recentAssets]);

  /* ── Load from localStorage ── */

  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      setWatchlist(JSON.parse(saved));
    } else {
      setWatchlist([
        { symbol: 'AAPL', type: 'stock' },
        { symbol: 'GOOGL', type: 'stock' },
        { symbol: 'MSFT', type: 'stock' },
        { symbol: 'AMZN', type: 'stock' },
        { symbol: 'NVDA', type: 'stock' },
        { symbol: 'TSLA', type: 'stock' },
        { symbol: 'META', type: 'stock' },
        { symbol: 'NFLX', type: 'stock' },
        { symbol: 'JPM', type: 'stock' },
        { symbol: 'V', type: 'stock' },
        { symbol: 'BTC', type: 'crypto' },
        { symbol: 'ETH', type: 'crypto' },
        { symbol: 'SOL', type: 'crypto' },
        { symbol: 'XRP', type: 'crypto' },
        { symbol: 'ADA', type: 'crypto' },
        { symbol: 'DOGE', type: 'crypto' },
      ]);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('recentlyViewed');
    if (saved) setRecentAssets(JSON.parse(saved));
  }, []);

  /* ── Fetch enriched data ── */

  const fetchEnrichedData = useCallback(async (assets: WatchlistAsset[]) => {
    return await Promise.all(
      assets.map(async (asset) => {
        try {
          if (asset.type === 'stock') {
            const res = await fetch(
              `/api/stock-details?symbol=${asset.symbol}&includeHistorical=true&range=1week`
            );
            if (res.ok) {
              const d = await res.json();
              return {
                ...asset,
                name: d.name || asset.symbol,
                price: parseFloat(d.price),
                change: parseFloat(d.change),
                changePercent: (() => {
                  const p = d.changePercent ?? d.percent_change;
                  const n = p != null ? Number(p) : NaN;
                  return Number.isFinite(n) ? n : undefined;
                })(),
                image: d.image ?? `${STOCK_LOGO_BASE}/${asset.symbol}.png`,
                volume: d.volume ?? undefined,
                marketCap: d.marketCap ?? undefined,
                pe: d.pe ?? null,
                eps: d.eps ?? null,
                priceToSales: d.priceToSales ?? null,
                priceToBook: d.priceToBook ?? null,
                fiftyTwoWeekHigh: d.fiftyTwoWeekHigh ?? undefined,
                fiftyTwoWeekLow: d.fiftyTwoWeekLow ?? undefined,
                sparkline:
                  Array.isArray(d.historical) && d.historical.length > 0
                    ? d.historical.map((h: any) => ({ close: h.close }))
                    : undefined,
              };
            }
          } else if (asset.type === 'crypto') {
            const cryptoMap: Record<string, string> = {
              BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin',
              SOL: 'solana', XRP: 'ripple', ADA: 'cardano',
              DOGE: 'dogecoin', DOT: 'polkadot',
            };
            const cryptoId = cryptoMap[asset.symbol] || asset.symbol.toLowerCase();
            const res = await fetch('/api/crypto-prices');
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : data?.prices ?? [];
              const crypto = list.find(
                (c: any) => (c.id || c.symbol?.toLowerCase()) === cryptoId
              );
              if (crypto) {
                const price = crypto.currentPrice ?? crypto.current_price;
                const change = crypto.priceChange24h ?? crypto.price_change_24h;
                const pct = crypto.priceChangePercentage24h ?? crypto.price_change_percentage_24h;
                const img = crypto.image;
                const imageUrl = typeof img === 'string' ? img : img?.small || img?.large || '';
                const mcap = crypto.marketCap ?? crypto.market_cap;
                const vol = crypto.volume24h ?? crypto.totalVolume ?? crypto.total_volume;
                const high = crypto.ath ?? crypto.high24h ?? crypto.high_24h;
                const low = crypto.atl ?? crypto.low24h ?? crypto.low_24h;

                // sparkline7d is a flat array of prices from the API
                const sparkRaw = crypto.sparkline7d ?? crypto.sparkline_in_7d?.price ?? [];
                let sparkline: { close: number }[] | undefined;
                if (Array.isArray(sparkRaw) && sparkRaw.length > 0) {
                  // Sample down to ~30 points to keep it lightweight
                  const step = Math.max(1, Math.floor(sparkRaw.length / 30));
                  sparkline = sparkRaw
                    .filter((_: number, i: number) => i % step === 0)
                    .map((p: number) => ({ close: p }));
                }
                return {
                  ...asset,
                  name: crypto.name || asset.symbol,
                  price: price != null ? Number(price) : undefined,
                  change: change != null ? Number(change) : undefined,
                  changePercent: pct != null && Number.isFinite(Number(pct)) ? Number(pct) : undefined,
                  image: imageUrl || undefined,
                  volume: vol != null ? Number(vol) : undefined,
                  marketCap: mcap != null ? Number(mcap) : undefined,
                  pe: null,
                  eps: null,
                  priceToSales: null,
                  priceToBook: null,
                  fiftyTwoWeekHigh: high != null ? Number(high) : undefined,
                  fiftyTwoWeekLow: low != null ? Number(low) : undefined,
                  sparkline,
                };
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching data for ${asset.symbol}:`, err);
        }
        return asset;
      })
    );
  }, []);

  /* ── Fetch on mount + interval ── */

  useEffect(() => {
    if (watchlist.length === 0) return;
    let mounted = true;

    const run = async () => {
      const enriched = await fetchEnrichedData(watchlistRef.current);
      if (mounted) {
        setWatchlist(enriched);
        setLoading(false);
      }
    };

    run();
    const iv = setInterval(run, 60_000);
    return () => { mounted = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length, fetchEnrichedData]);

  useEffect(() => {
    if (recentAssets.length === 0) return;
    let mounted = true;

    const run = async () => {
      const enriched = await fetchEnrichedData(recentAssetsRef.current);
      if (mounted) setRecentAssets(enriched);
    };

    run();
    const iv = setInterval(run, 60_000);
    return () => { mounted = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentAssets.length, fetchEnrichedData]);

  /* ── Persist watchlist ── */

  useEffect(() => {
    if (watchlist.length > 0) {
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }
  }, [watchlist]);

  /* ── Sorting ── */

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'symbol' ? 'asc' : 'desc');
    }
  };

  const currentList = viewMode === 'watchlist' ? watchlist : recentAssets;

  const sorted = [...currentList].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === 'string' && typeof bv === 'string')
      return av.localeCompare(bv) * dir;
    return ((av as number) - (bv as number)) * dir;
  });

  /* ── Remove ── */

  const handleRemove = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist((prev) => prev.filter((a) => a.symbol !== symbol));
    toast.success(`${symbol} removed from watchlist`);
  };

  /* ── Row click ── */

  const handleRowClick = (asset: WatchlistAsset) => {
    if (asset.type === 'stock') {
      router.push(`/stock/${asset.symbol}`);
    } else {
      const cryptoMap: Record<string, string> = {
        BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin',
        SOL: 'solana', XRP: 'ripple', ADA: 'cardano',
        DOGE: 'dogecoin', DOT: 'polkadot',
      };
      const id = cryptoMap[asset.symbol] || asset.symbol.toLowerCase();
      router.push(`/crypto/${id}`);
    }
  };

  /* ── Render ── */

  return (
    <Card className="border-0 shadow-none overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 pt-5 pb-3">
        <h2 className="text-xl font-semibold text-foreground">
          {viewMode === 'watchlist' ? 'Watchlist' : 'Recently Viewed'}
        </h2>

        {/* Toggle */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/20">
          <div className="flex items-center gap-1.5">
            <Star className={`h-3.5 w-3.5 transition-colors ${viewMode === 'watchlist' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs font-medium transition-colors ${viewMode === 'watchlist' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Watchlist
            </span>
          </div>
          <Switch
            checked={viewMode === 'recent'}
            onCheckedChange={(checked) => setViewMode(checked ? 'recent' : 'watchlist')}
          />
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium transition-colors ${viewMode === 'recent' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Recent
            </span>
            <Clock className={`h-3.5 w-3.5 transition-colors ${viewMode === 'recent' ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Column headers */}
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left font-medium px-5 py-3 w-[220px]">
                <SortHeader label="Asset" sortKey="symbol" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
              </th>
              <th className="text-right font-medium px-3 py-3">
                <SortHeader label="Price" sortKey="price" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-right font-medium px-3 py-3">
                <SortHeader label="Change" sortKey="changePercent" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-center font-medium px-3 py-3 hidden lg:table-cell">
                <span className="text-xs font-medium text-muted-foreground">7D Chart</span>
              </th>
              <th className="text-right font-medium px-3 py-3 hidden md:table-cell">
                <SortHeader label="Volume" sortKey="volume" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-right font-medium px-3 py-3 hidden md:table-cell">
                <SortHeader label="Mkt Cap" sortKey="marketCap" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-right font-medium px-3 py-3 hidden xl:table-cell">
                <SortHeader label="P/E" sortKey="pe" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-right font-medium px-3 py-3 hidden xl:table-cell">
                <SortHeader label="P/S" sortKey="priceToSales" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-right font-medium px-3 py-3 hidden xl:table-cell">
                <SortHeader label="P/B" sortKey="priceToBook" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-right font-medium px-3 py-3 hidden xl:table-cell">
                <SortHeader label="EPS" sortKey="eps" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-center font-medium px-3 py-3 hidden xl:table-cell">
                <span className="text-xs font-medium text-muted-foreground">52W Range</span>
              </th>
              {viewMode === 'watchlist' && (
                <th className="w-10 px-2 py-3" />
              )}
            </tr>
          </thead>

          <tbody>
            {loading && watchlist.length > 0 ? (
              // Skeleton rows
              Array.from({ length: watchlist.length }).map((_, i) => (
                <tr key={i} className="border-b border-border/50 animate-pulse">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted" />
                      <div>
                        <div className="h-4 w-14 bg-muted rounded mb-1" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4"><div className="h-4 w-16 bg-muted rounded ml-auto" /></td>
                  <td className="px-3 py-4"><div className="h-4 w-14 bg-muted rounded ml-auto" /></td>
                  <td className="px-3 py-4 hidden lg:table-cell"><div className="h-8 w-[100px] bg-muted rounded mx-auto" /></td>
                  <td className="px-3 py-4 hidden md:table-cell"><div className="h-4 w-14 bg-muted rounded ml-auto" /></td>
                  <td className="px-3 py-4 hidden md:table-cell"><div className="h-4 w-16 bg-muted rounded ml-auto" /></td>
                  <td className="px-3 py-4 hidden xl:table-cell"><div className="h-4 w-10 bg-muted rounded ml-auto" /></td>
                  <td className="px-3 py-4 hidden xl:table-cell"><div className="h-4 w-10 bg-muted rounded ml-auto" /></td>
                  <td className="px-3 py-4 hidden xl:table-cell"><div className="h-4 w-10 bg-muted rounded ml-auto" /></td>
                  <td className="px-3 py-4 hidden xl:table-cell"><div className="h-4 w-12 bg-muted rounded ml-auto" /></td>
                  <td className="px-3 py-4 hidden xl:table-cell"><div className="h-4 w-[120px] bg-muted rounded mx-auto" /></td>
                  <td className="w-10 px-2 py-4" />
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-16 text-muted-foreground">
                  {viewMode === 'watchlist'
                    ? 'Your watchlist is empty. Search for assets to add them.'
                    : 'No recently viewed assets.'}
                </td>
              </tr>
            ) : (
              sorted.map((asset) => {
                const positive = (asset.changePercent ?? 0) >= 0;
                const colorClass = positive ? 'text-green-500' : 'text-red-500';

                return (
                  <tr
                    key={`${asset.symbol}-${asset.viewedAt || ''}`}
                    onClick={() => handleRowClick(asset)}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer group"
                  >
                    {/* Asset */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {asset.image ? (
                          <img
                            src={asset.image}
                            alt=""
                            className="w-8 h-8 rounded-lg object-contain bg-muted/40 flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                            {asset.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{asset.symbol}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {asset.name || asset.type}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-3.5 text-right font-medium tabular-nums">
                      {formatPrice(asset.price, asset.type)}
                    </td>

                    {/* Change */}
                    <td className="px-3 py-3.5 text-right">
                      <div className={`flex items-center justify-end gap-1 ${colorClass}`}>
                        {positive ? (
                          <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-sm font-medium tabular-nums">
                            {formatPercent(asset.changePercent)}
                          </span>
                          <span className="text-[10px] tabular-nums opacity-70">
                            {formatChange(asset.change)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Sparkline */}
                    <td className="px-3 py-3.5 hidden lg:table-cell">
                      <div className="flex justify-center">
                        <Sparkline data={asset.sparkline ?? []} positive={positive} />
                      </div>
                    </td>

                    {/* Volume */}
                    <td className="px-3 py-3.5 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                      {formatVolume(asset.volume)}
                    </td>

                    {/* Market Cap */}
                    <td className="px-3 py-3.5 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                      {formatMarketCap(asset.marketCap)}
                    </td>

                    {/* P/E */}
                    <td className="px-3 py-3.5 text-right text-muted-foreground tabular-nums hidden xl:table-cell">
                      {asset.pe != null && Number.isFinite(asset.pe)
                        ? asset.pe.toFixed(1)
                        : '—'}
                    </td>

                    {/* P/S */}
                    <td className="px-3 py-3.5 text-right text-muted-foreground tabular-nums hidden xl:table-cell">
                      {asset.priceToSales != null && Number.isFinite(asset.priceToSales)
                        ? asset.priceToSales.toFixed(1)
                        : '—'}
                    </td>

                    {/* P/B */}
                    <td className="px-3 py-3.5 text-right text-muted-foreground tabular-nums hidden xl:table-cell">
                      {asset.priceToBook != null && Number.isFinite(asset.priceToBook)
                        ? asset.priceToBook.toFixed(1)
                        : '—'}
                    </td>

                    {/* EPS */}
                    <td className="px-3 py-3.5 text-right text-muted-foreground tabular-nums hidden xl:table-cell">
                      {asset.eps != null && Number.isFinite(asset.eps)
                        ? `$${asset.eps.toFixed(2)}`
                        : '—'}
                    </td>

                    {/* 52-Week Range */}
                    <td className="px-3 py-3.5 hidden xl:table-cell">
                      <div className="flex justify-center">
                        <FiftyTwoWeekBar
                          low={asset.fiftyTwoWeekLow}
                          high={asset.fiftyTwoWeekHigh}
                          current={asset.price}
                        />
                      </div>
                    </td>

                    {/* Remove */}
                    {viewMode === 'watchlist' && (
                      <td className="w-10 px-2 py-3.5">
                        <button
                          onClick={(e) => handleRemove(asset.symbol, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
                          aria-label={`Remove ${asset.symbol}`}
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <div className="px-5 py-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          {viewMode === 'watchlist'
            ? `${watchlist.length} asset${watchlist.length !== 1 ? 's' : ''} · Click a row to view details · Use search to add more`
            : `${recentAssets.length} recently viewed`}
        </p>
      </div>
    </Card>
  );
}
