'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ArrowRightLeft,
  Zap,
  RefreshCw,
} from 'lucide-react';

// ── Types ──

interface Asset {
  symbol: string;
  name: string;
  category: 'equities' | 'fixed-income' | 'commodities' | 'crypto' | 'currency' | 'money-market' | 'sector';
  price: number;
  dayChange: number;
  dayChangePct: number;
  weekChangePct: number | null;
  monthChangePct: number | null;
  threeMonthChangePct: number | null;
  ytdChangePct: number | null;
  yearChangePct: number | null;
}

interface FredPoint { date: string; value: number }

interface FlowData {
  assets: Asset[];
  narrative: string[];
  moneyMarketFund: {
    current: number;
    previous: number;
    weekChange: number;
    monthChange: number;
    history: FredPoint[];
  } | null;
  overnightRRP: {
    current: number;
    history: FredPoint[];
  } | null;
  fedFundsRate: number | null;
  lastUpdated: string;
}

type Period = 'dayChangePct' | 'weekChangePct' | 'monthChangePct' | 'ytdChangePct';

const PERIOD_LABELS: Record<Period, string> = {
  dayChangePct: '1D',
  weekChangePct: '1W',
  monthChangePct: '1M',
  ytdChangePct: 'YTD',
};

const CATEGORY_LABELS: Record<string, string> = {
  equities: 'Equities',
  'fixed-income': 'Fixed Income',
  'money-market': 'Money Market',
  commodities: 'Commodities',
  crypto: 'Crypto',
  currency: 'Currency',
};

const CATEGORY_ORDER = ['equities', 'fixed-income', 'money-market', 'commodities', 'crypto', 'currency'];

// ── Helpers ──

function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function fmtPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(4)}`;
}

function pctColor(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'text-muted-foreground';
  if (value > 0.05) return 'text-green-500';
  if (value < -0.05) return 'text-red-500';
  return 'text-muted-foreground';
}

function heatmapBg(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'bg-muted/40';
  if (value > 2) return 'bg-green-500/30 border-green-500/40';
  if (value > 1) return 'bg-green-500/20 border-green-500/30';
  if (value > 0.3) return 'bg-green-500/10 border-green-500/20';
  if (value > -0.3) return 'bg-muted/30 border-border';
  if (value > -1) return 'bg-red-500/10 border-red-500/20';
  if (value > -2) return 'bg-red-500/20 border-red-500/30';
  return 'bg-red-500/30 border-red-500/40';
}

// For the flow arrows between categories
function getCategoryAvg(assets: Asset[], category: string, period: Period): number | null {
  const items = assets.filter((a) => a.category === category);
  const values = items.map((a) => a[period]).filter((v): v is number => v != null && Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ── Component ──

export default function MoneyFlowDashboard() {
  const [data, setData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('dayChangePct');

  const fetchData = async () => {
    try {
      setError(null);
      const res = await fetch('/api/money-flow');
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000); // 2min refresh
    return () => clearInterval(interval);
  }, []);

  // Derived data
  const assetClasses = useMemo(() => {
    if (!data) return [];
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      assets: data.assets.filter((a) => a.category === cat),
    }));
  }, [data]);

  const sectors = useMemo(() => {
    if (!data) return [];
    return data.assets
      .filter((a) => a.category === 'sector')
      .sort((a, b) => (b[selectedPeriod] ?? 0) - (a[selectedPeriod] ?? 0));
  }, [data, selectedPeriod]);

  // Flow arrows: which categories are gaining/losing
  const flowArrows = useMemo(() => {
    if (!data) return [];
    const avgs = CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      avg: getCategoryAvg(data.assets, cat, selectedPeriod),
    })).filter((c) => c.avg != null);

    const sorted = [...avgs].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
    return sorted;
  }, [data, selectedPeriod]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-8">
        {/* Narrative skeleton */}
        <Card className="animate-pulse">
          <CardContent className="py-6">
            <div className="h-5 bg-muted rounded w-3/4 mb-3" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </CardContent>
        </Card>
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-12 bg-muted rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
            <p className="text-lg mb-2">Unable to load money flow data</p>
            {error && <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Period Selector ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                selectedPeriod === p
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Flow Narrative ── */}
      <Card className="border-l-4 border-l-primary/60">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Capital Flow Signals
              </h3>
              {data.narrative.map((line, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Flow Direction Bar ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-normal text-secondary flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Capital Flow Direction ({PERIOD_LABELS[selectedPeriod]})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 justify-center py-2">
            {flowArrows.map((item) => {
              const val = item.avg ?? 0;
              const maxHeight = 80;
              const absVal = Math.min(Math.abs(val), 5);
              const height = Math.max((absVal / 5) * maxHeight, 8);
              const isPositive = val >= 0;
              return (
                <div key={item.category} className="flex flex-col items-center gap-2 min-w-[80px]">
                  {/* Bar */}
                  <div className="relative flex flex-col items-center" style={{ height: maxHeight + 20 }}>
                    {/* Zero line */}
                    <div className="absolute top-1/2 w-full h-px bg-border" />
                    {/* Bar itself */}
                    <div
                      className={`absolute w-14 rounded-md transition-all ${
                        isPositive
                          ? 'bg-green-500/20 border border-green-500/40'
                          : 'bg-red-500/20 border border-red-500/40'
                      }`}
                      style={{
                        height: `${height}px`,
                        ...(isPositive
                          ? { bottom: '50%', marginBottom: '1px' }
                          : { top: '50%', marginTop: '1px' }),
                      }}
                    />
                    {/* Value label */}
                    <span
                      className={`absolute text-xs font-semibold ${pctColor(val)}`}
                      style={
                        isPositive
                          ? { bottom: `calc(50% + ${height + 4}px)` }
                          : { top: `calc(50% + ${height + 4}px)` }
                      }
                    >
                      {fmtPct(val)}
                    </span>
                  </div>
                  {/* Label */}
                  <span className="text-xs text-muted-foreground text-center font-medium">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Asset Class Performance Grid ── */}
      <div>
        <h2 className="text-lg font-normal text-foreground mb-4">Asset Class Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {assetClasses.map(({ category, label, assets }) => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {assets.map((asset) => {
                  const val = asset[selectedPeriod];
                  return (
                    <div
                      key={asset.symbol}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${heatmapBg(
                        val
                      )}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ChangeIcon value={val} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{asset.symbol}</p>
                          <p className="text-xs text-muted-foreground">{asset.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{fmtPrice(asset.price)}</p>
                        <p className={`text-xs font-semibold ${pctColor(val)}`}>
                          {fmtPct(val)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── FRED Money Market Insight ── */}
      {data.moneyMarketFund && (
        <div>
          <h2 className="text-lg font-normal text-foreground mb-4">Money Market & Liquidity (FRED)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Money Market Fund Total Assets */}
            <Card>
              <CardContent className="py-5">
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  Money Market Fund Assets
                </p>
                <p className="text-3xl font-light text-foreground">
                  ${(data.moneyMarketFund.current / 1000).toFixed(2)}T
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-sm font-semibold ${
                      data.moneyMarketFund.weekChange >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {data.moneyMarketFund.weekChange >= 0 ? '+' : ''}
                    ${(data.moneyMarketFund.weekChange / 1000).toFixed(2)}T
                  </span>
                  <span className="text-xs text-muted-foreground">QoQ change</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Source: FRED MMMFFAQ027S (quarterly)
                </p>
              </CardContent>
            </Card>

            {/* Overnight Reverse Repo */}
            {data.overnightRRP && (
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                    Overnight Reverse Repo
                  </p>
                  <p className="text-3xl font-light text-foreground">
                    ${data.overnightRRP.current.toFixed(0)}B
                  </p>
                  <div className="mt-2">
                    <div className="w-full bg-muted/40 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full bg-primary/60 transition-all"
                        style={{
                          width: `${Math.min(
                            (data.overnightRRP.current / 2500) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>$0B</span>
                      <span>$2.5T peak</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Source: FRED RRPONTSYD (daily)
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Fed Funds Rate */}
            {data.fedFundsRate != null && (
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                    Fed Funds Rate
                  </p>
                  <p className="text-3xl font-light text-foreground">
                    {data.fedFundsRate.toFixed(2)}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {data.fedFundsRate >= 5
                      ? 'Restrictive — high rates attract cash to money markets'
                      : data.fedFundsRate >= 3
                      ? 'Moderately restrictive — money markets still attractive'
                      : data.fedFundsRate >= 1
                      ? 'Neutral zone — money market yields less compelling'
                      : 'Near zero — no incentive to hold cash, pushes into risk'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Source: FRED FEDFUNDS
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Sector Rotation Heatmap ── */}
      <div>
        <h2 className="text-lg font-normal text-foreground mb-4">Sector Rotation</h2>
        <Card>
          <CardContent className="py-5">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 mb-3 px-2">
              <div className="col-span-3 text-xs font-medium text-muted-foreground">Sector</div>
              <div className="col-span-2 text-xs font-medium text-muted-foreground text-right">Price</div>
              <div className="col-span-2 text-xs font-medium text-muted-foreground text-right">1D</div>
              <div className="col-span-2 text-xs font-medium text-muted-foreground text-right">1W</div>
              <div className="col-span-2 text-xs font-medium text-muted-foreground text-right">1M</div>
              <div className="col-span-1 text-xs font-medium text-muted-foreground text-right">Bar</div>
            </div>
            {/* Rows */}
            <div className="space-y-1">
              {sectors.map((sector, idx) => {
                const val = sector[selectedPeriod] ?? 0;
                const barWidth = Math.min(Math.abs(val) * 15, 100);
                return (
                  <div
                    key={sector.symbol}
                    className={`grid grid-cols-12 gap-2 items-center px-2 py-2.5 rounded-lg transition-colors ${
                      idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                    }`}
                  >
                    <div className="col-span-3 flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{sector.name}</p>
                        <p className="text-xs text-muted-foreground">{sector.symbol}</p>
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-sm font-medium text-foreground">{fmtPrice(sector.price)}</p>
                    </div>
                    <div className={`col-span-2 text-right text-sm font-semibold ${pctColor(sector.dayChangePct)}`}>
                      {fmtPct(sector.dayChangePct)}
                    </div>
                    <div className={`col-span-2 text-right text-sm font-semibold ${pctColor(sector.weekChangePct)}`}>
                      {fmtPct(sector.weekChangePct)}
                    </div>
                    <div className={`col-span-2 text-right text-sm font-semibold ${pctColor(sector.monthChangePct)}`}>
                      {fmtPct(sector.monthChangePct)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <div className="w-full h-3 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            val >= 0 ? 'bg-green-500/60' : 'bg-red-500/60'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sector Heatmap Visual Grid ── */}
      <div>
        <h2 className="text-lg font-normal text-foreground mb-4">
          Sector Heatmap ({PERIOD_LABELS[selectedPeriod]})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {sectors.map((sector) => {
            const val = sector[selectedPeriod];
            return (
              <div
                key={sector.symbol}
                className={`rounded-xl border p-4 text-center transition-all hover:scale-[1.02] ${heatmapBg(
                  val
                )}`}
              >
                <p className="text-xs font-bold text-foreground mb-0.5">{sector.symbol}</p>
                <p className="text-xs text-muted-foreground mb-2 truncate">{sector.name}</p>
                <p className={`text-lg font-bold ${pctColor(val)}`}>{fmtPct(val)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>
          Data sourced from ETF proxies. Last updated:{' '}
          {new Date(data.lastUpdated).toLocaleTimeString()}.
          Refresh every 2 minutes.
        </p>
      </div>
    </div>
  );
}

// Small sub-component for the directional icon
function ChangeIcon({ value }: { value: number | null | undefined }) {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < 0.05) {
    return <Minus className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
  }
  if (value > 0) {
    return <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />;
  }
  return <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />;
}
