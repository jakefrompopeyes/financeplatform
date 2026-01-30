'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Calendar, Sparkles, ArrowLeft, Star, Share2, Megaphone, Target, MessageSquare, FileText, Award, UserCheck, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import StockAI from '@/components/dashboard/StockAI';
import RelatedStocks from '@/components/dashboard/RelatedStocks';
import IncomeWaterfall from '@/components/dashboard/IncomeWaterfall';
import FutureEarnings from '@/components/dashboard/FutureEarnings';
import CashFlowWaterfall from '@/components/dashboard/CashFlowWaterfall';
import MarginTrends from '@/components/dashboard/MarginTrends';
import RevenueEarningsChart from '@/components/dashboard/RevenueEarningsChart';
import BalanceSheetSnapshot from '@/components/dashboard/BalanceSheetSnapshot';
import DividendBuyback from '@/components/dashboard/DividendBuyback';
import PeerComparison from '@/components/dashboard/PeerComparison';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import TradingViewWidget from '@/components/TradingViewWidget';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface StockDetails {
  symbol: string;
  name: string;
  image?: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  averageVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  exchange: string;
  currency: string;
  timestamp: number;
  historical: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

interface InsiderTrade {
  filingDate: string | null;
  transactionDate: string | null;
  reportingName: string | null;
  typeOfOwner: string | null;
  transactionType: string | null;
  securitiesTransacted: number | null;
  price: number | null;
  value: number | null;
  symbol: string;
  link: string | null;
}

interface InsiderTradingData {
  symbol: string;
  trades: InsiderTrade[];
}

/** Get Monday 00:00 of the week for a date string (ISO week). */
function getWeekKey(dateStr: string | null): string {
  if (!dateStr) return 'unknown';
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

/** Format week range for display (Mon–Sun). */
function formatWeekLabel(weekKey: string): string {
  if (weekKey === 'unknown') return 'Unknown';
  const mon = new Date(weekKey + 'T00:00:00');
  if (Number.isNaN(mon.getTime())) return weekKey;
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const a = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const b = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return a === b ? a : `${a} – ${b}`;
}

interface InsiderTradeGroup {
  weekKey: string;
  weekLabel: string;
  count: number;
  buyCount: number;
  sellCount: number;
  sharesBought: number;
  sharesSold: number;
  valueBought: number;
  valueSold: number;
  participants: string[];
  firstLink: string | null;
  weekTrades: InsiderTrade[];
}

function groupInsiderTradesByWeek(trades: InsiderTrade[]): InsiderTradeGroup[] {
  const byWeek = new Map<string, InsiderTrade[]>();
  for (const t of trades) {
    const dateStr = t.transactionDate || t.filingDate;
    const key = getWeekKey(dateStr);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(t);
  }
  const groups: InsiderTradeGroup[] = [];
  const sortedKeys = Array.from(byWeek.keys()).sort().reverse();
  for (const weekKey of sortedKeys) {
    const weekTrades = byWeek.get(weekKey)!;
    let buyCount = 0;
    let sellCount = 0;
    let sharesBought = 0;
    let sharesSold = 0;
    let valueBought = 0;
    let valueSold = 0;
    const names = new Set<string>();
    let firstLink: string | null = null;
    for (const t of weekTrades) {
      const isBuy = t.transactionType && /p|acqui|purchase|buy/i.test(String(t.transactionType));
      const shares = t.securitiesTransacted ?? 0;
      const val = t.value ?? 0;
      if (isBuy) {
        buyCount++;
        sharesBought += shares;
        valueBought += val;
      } else {
        sellCount++;
        sharesSold += shares;
        valueSold += val;
      }
      if (t.reportingName) names.add(t.reportingName);
      if (t.link && !firstLink) firstLink = t.link;
    }
    groups.push({
      weekKey,
      weekLabel: formatWeekLabel(weekKey),
      count: weekTrades.length,
      buyCount,
      sellCount,
      sharesBought,
      sharesSold,
      valueBought,
      valueSold,
      participants: Array.from(names),
      firstLink,
      weekTrades,
    });
  }
  return groups;
}

interface AnalystData {
  symbol: string;
  priceTargetSummary: {
    lastMonthAvg: number | null;
    lastQuarterAvg: number | null;
    lastYearAvg: number | null;
    allTimeAvg: number | null;
    analystCount: number | null;
  } | null;
  priceTargetConsensus: {
    high: number | null;
    low: number | null;
    median: number | null;
    consensus: number | null;
  } | null;
  gradesConsensus: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  } | null;
  grades: { date: string | null; analyst: string | null; action: string | null; from: string | null; to: string | null; company: string | null }[];
  analystEstimates: { date: string | null; revenueEst: number | null; epsEst: number | null; period: string | null }[];
  quarterlyEstimates?: { date: string | null; revenueEst: number | null; epsEst: number | null; period: string | null }[];
  ratingsSnapshot: { rating: string | null; ratingScore: number | null } | null;
}

const timeRanges = [
  { label: '1D', value: '1D', interval: '5' },
  { label: '1W', value: '1W', interval: '15' },
  { label: '1M', value: '1M', interval: 'D' },
  { label: '3M', value: '3M', interval: 'D' },
  { label: '1Y', value: '12M', interval: 'W' },
];

export default function StockPage({ params }: { params: { symbol: string } }) {
  const router = useRouter();
  const symbol = params.symbol.toUpperCase();
  const [stockData, setStockData] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ code?: number; retryAfter?: number; symbol?: string } | null>(null);
  const [selectedRange, setSelectedRange] = useState('1M');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [analystData, setAnalystData] = useState<AnalystData | null>(null);
  const [analystLoading, setAnalystLoading] = useState(false);
  const [insiderData, setInsiderData] = useState<InsiderTradingData | null>(null);
  const [insiderLoading, setInsiderLoading] = useState(false);
  const [expandedInsiderWeeks, setExpandedInsiderWeeks] = useState<Set<string>>(new Set());

  const toggleInsiderWeek = (weekKey: string) => {
    setExpandedInsiderWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekKey)) next.delete(weekKey);
      else next.add(weekKey);
      return next;
    });
  };

  const syncWatchlistState = useCallback(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('watchlist');
    const list = saved ? JSON.parse(saved) : [];
    const inList = list.some((item: { symbol: string; type: string }) => item.symbol === symbol && item.type === 'stock');
    setIsInWatchlist(!!inList);
  }, [symbol]);

  useEffect(() => {
    syncWatchlistState();
  }, [syncWatchlistState]);

  const toggleWatchlist = () => {
    const saved = localStorage.getItem('watchlist');
    const list = saved ? JSON.parse(saved) : [];
    if (isInWatchlist) {
      const next = list.filter((item: { symbol: string }) => item.symbol !== symbol);
      localStorage.setItem('watchlist', JSON.stringify(next));
      setIsInWatchlist(false);
      toast.success(`${symbol} removed from watchlist`);
    } else {
      const next = [...list, { symbol, type: 'stock' as const }];
      localStorage.setItem('watchlist', JSON.stringify(next));
      setIsInWatchlist(true);
      toast.success(`${symbol} added to watchlist`);
    }
  };

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard'));
  };

  useEffect(() => {
    fetchStockDetails();
    
    // Add to recently viewed
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const filtered = recentlyViewed.filter((item: any) => item.symbol !== symbol);
    const updated = [
      { 
        symbol, 
        type: 'stock',
        viewedAt: Date.now() 
      },
      ...filtered
    ].slice(0, 10);
    localStorage.setItem('recentlyViewed', JSON.stringify(updated));
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    setAnalystLoading(true);
    fetch(`/api/stock-analyst?symbol=${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setAnalystData(data as AnalystData);
        else setAnalystData(null);
      })
      .catch(() => setAnalystData(null))
      .finally(() => setAnalystLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    setInsiderLoading(true);
    fetch(`/api/insider-trading?symbol=${symbol}&limit=30`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && data.trades) setInsiderData(data as InsiderTradingData);
        else setInsiderData(null);
      })
      .catch(() => setInsiderData(null))
      .finally(() => setInsiderLoading(false));
  }, [symbol]);

  const fetchStockDetails = async () => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      // Don't fetch historical data since TradingView loads its own
      const response = await fetch(`/api/stock-details?symbol=${symbol}&includeHistorical=false`);
      const data = await response.json();

      if (data.error) {
        if (data.code === 429) {
          setError(data.error);
          setErrorDetails({
            code: 429,
            retryAfter: data.retryAfter,
            symbol: data.symbol ?? symbol,
          });
        } else {
          setError(data.error);
          setErrorDetails(response.status ? { code: response.status, symbol } : null);
        }
        setStockData(null);
      } else {
        setStockData(data);
      }
    } catch (err) {
      setError('Failed to fetch stock details. Please try again later.');
      setErrorDetails(null);
      setStockData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | null, decimals = 2) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatLargeNumber = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const formatVolume = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toString();
  };

  const isPositive = stockData ? stockData.changePercent >= 0 : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !stockData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-[1400px]">
          <Link href="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Card className="p-12 text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Error Loading Stock</h2>
            <p className="text-muted-foreground mb-4">{error || 'Failed to load stock data'}</p>
            {(errorDetails?.symbol || errorDetails?.retryAfter != null || errorDetails?.code) && (
              <div className="text-left bg-muted/50 rounded-lg p-4 mb-6 text-sm space-y-1">
                {errorDetails.symbol && (
                  <p><span className="font-medium text-muted-foreground">Symbol:</span> {errorDetails.symbol}</p>
                )}
                {errorDetails.code != null && (
                  <p><span className="font-medium text-muted-foreground">Error code:</span> {errorDetails.code}</p>
                )}
                {errorDetails.retryAfter != null && (
                  <p><span className="font-medium text-muted-foreground">Suggested wait:</span> {errorDetails.retryAfter} seconds</p>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={fetchStockDetails} disabled={loading}>
                {loading ? 'Loading…' : 'Try again'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to Dashboard</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div id="main-content" className="min-h-screen bg-background" tabIndex={-1}>
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <ThemeToggle />
          </div>

          {/* Stock Title and Price */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {stockData.image && (
                  <img
                    src={stockData.image}
                    alt=""
                    className="w-12 h-12 rounded-lg object-contain bg-muted/50 flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div>
                  <h1 className="text-4xl font-light">{stockData.symbol}</h1>
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                    {stockData.exchange}
                  </span>
                </div>
              </div>
              <p className="text-xl text-muted-foreground mb-1">{stockData.name}</p>
              <p className="text-sm text-muted-foreground">Currency: {stockData.currency}</p>
            </div>

            <div className="text-left lg:text-right">
              <div className="text-5xl font-light mb-2">
                ${formatNumber(stockData.price)}
              </div>
              <div className={cn(
                "flex items-center gap-2 text-lg",
                isPositive ? "text-green-500" : "text-red-500"
              )}>
                {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <span>{isPositive ? '+' : ''}{formatNumber(stockData.change)}</span>
                <span>({isPositive ? '+' : ''}{formatNumber(stockData.changePercent)}%)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                As of {new Date(stockData.timestamp * 1000).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            <Button onClick={() => setIsAIOpen(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Ask AI About {stockData.symbol}
            </Button>
            <Button variant="outline" onClick={toggleWatchlist} className="gap-2">
              <Star className={cn("w-4 h-4", isInWatchlist && "fill-current")} />
              {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
            </Button>
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {/* AI Assistant */}
        <StockAI 
          stockData={stockData}
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
        />

        {/* TradingView Chart */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Price Chart</h2>
              <div className="flex gap-2">
                {timeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setSelectedRange(range.value)}
                    className={cn(
                      "px-4 py-1 rounded-md text-xs font-medium transition-colors",
                      selectedRange === range.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full" style={{ height: '600px' }}>
              <TradingViewWidget 
                symbol={
                  stockData.exchange && stockData.exchange !== 'N/A'
                    ? `${stockData.exchange}:${stockData.symbol}`
                    : stockData.symbol
                }
                interval={timeRanges.find(r => r.value === selectedRange)?.interval || 'D'}
                range={selectedRange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Key Statistics + Related Stocks + 52-Week Range */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 lg:col-span-1">
            <Card className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Activity className="w-3 h-3 shrink-0" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Open</span>
                </div>
                <div className="text-sm font-medium tabular-nums">${formatNumber(stockData.open)}</div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3 shrink-0" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Day High</span>
                </div>
                <div className="text-sm font-medium tabular-nums">${formatNumber(stockData.high)}</div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <TrendingDown className="w-3 h-3 shrink-0" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Day Low</span>
                </div>
                <div className="text-sm font-medium tabular-nums">${formatNumber(stockData.low)}</div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Prev Close</span>
                </div>
                <div className="text-sm font-medium tabular-nums">${formatNumber(stockData.previousClose)}</div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-3">
            <RelatedStocks symbol={stockData.symbol} compact />
            {/* 52-Week Range - compact, no dot, under related stocks */}
            {stockData.fiftyTwoWeekHigh > stockData.fiftyTwoWeekLow && (
              <Card>
                <CardContent className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs tabular-nums shrink-0">${formatNumber(stockData.fiftyTwoWeekLow)}</span>
                    <div className="flex-1 relative h-3 rounded-full bg-secondary overflow-hidden min-w-0">
                      <div
                        className="absolute top-0 bottom-0 rounded-full bg-primary/30 transition-all"
                        style={{
                          left: 0,
                          width: `${Math.min(100, Math.max(0, ((stockData.price - stockData.fiftyTwoWeekLow) / (stockData.fiftyTwoWeekHigh - stockData.fiftyTwoWeekLow)) * 100))}%`
                        }}
                      />
                    </div>
                    <span className="text-xs tabular-nums shrink-0">${formatNumber(stockData.fiftyTwoWeekHigh)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Future earnings (upcoming dates + estimates, last reported) */}
        <FutureEarnings
          symbol={symbol}
          quarterlyEstimates={analystData?.quarterlyEstimates ?? []}
        />

        {/* P/E, P/B & P/S Donuts - based on market cap, earnings, book value, and sales */}
        {(() => {
          const marketCap = stockData.marketCap ?? 0;
          const hasPE = stockData.pe != null && stockData.pe > 0 && marketCap > 0;
          const hasPB = stockData.priceToBook != null && stockData.priceToBook > 0 && marketCap > 0;
          const hasPS = stockData.priceToSales != null && stockData.priceToSales > 0 && marketCap > 0;
          const earnings = hasPE ? marketCap / stockData.pe! : 0;
          const bookValue = hasPB ? marketCap / stockData.priceToBook! : 0;
          const sales = hasPS ? marketCap / stockData.priceToSales! : 0;
          const strokeColor = 'hsl(var(--card))';
          const peData = hasPE
            ? [
                { name: 'Market Cap', value: marketCap, fill: 'hsl(var(--primary))' },
                { name: 'Earnings', value: earnings, fill: 'hsl(38 92% 50%)' }
              ]
            : [{ name: 'N/A', value: 1, fill: 'hsl(var(--muted))' }];
          const pbData = hasPB ? [
            { name: 'Market Cap', value: marketCap, fill: 'hsl(var(--primary))' },
            { name: 'Book Value', value: bookValue, fill: 'hsl(173 58% 39%)' }
          ] : [];
          const psData = hasPS ? [
            { name: 'Market Cap', value: marketCap, fill: 'hsl(var(--primary))' },
            { name: 'Sales', value: sales, fill: 'hsl(262 52% 47%)' }
          ] : [];
          const tooltipStyle = {
            fontSize: '12px',
            borderRadius: 'var(--radius)',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '8px 12px',
            backgroundColor: 'hsl(var(--card))'
          };
          const showValuation = marketCap > 0;
          return showValuation ? (
            <Card className="mb-8 overflow-hidden">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Valuation (P/E, P/B & P/S)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 justify-items-center">
                  {/* P/E donut - always shown, same layout as P/B and P/S */}
                  <div className="flex flex-col items-center">
                    <p className="text-sm font-medium text-muted-foreground mb-3">P/E — Market Cap vs Earnings</p>
                    <div className="relative w-[220px] h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                            data={peData}
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={92}
                            dataKey="value"
                            stroke={strokeColor}
                            strokeWidth={2}
                            paddingAngle={hasPE ? 4 : 0}
                          >
                            {peData.map((entry, index) => (
                              <Cell key={index} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, _name, props: { payload?: { name: string } }) =>
                              hasPE
                                ? [formatLargeNumber(value), props.payload?.name ?? '']
                                : ['—', props.payload?.name ?? '']
                            }
                            contentStyle={tooltipStyle}
                            cursor={false}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="rounded-full w-[88px] h-[88px] flex flex-col items-center justify-center bg-card/80 border border-border/50 shadow-sm">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">P/E</span>
                          <span className="text-xl font-semibold tabular-nums mt-0.5">
                            {hasPE ? formatNumber(stockData.pe!) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {hasPB && (
                    <div className="flex flex-col items-center">
                      <p className="text-sm font-medium text-muted-foreground mb-3">P/B — Market Cap vs Book Value</p>
                      <div className="relative w-[220px] h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                              data={pbData}
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={92}
                              dataKey="value"
                              stroke={strokeColor}
                              strokeWidth={2}
                              paddingAngle={4}
                            >
                              {pbData.map((entry, index) => (
                                <Cell key={index} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, _name, props: { payload?: { name: string } }) => [
                                formatLargeNumber(value),
                                props.payload?.name ?? ''
                              ]}
                              contentStyle={tooltipStyle}
                              cursor={false}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <div className="rounded-full w-[88px] h-[88px] flex flex-col items-center justify-center bg-card/80 border border-border/50 shadow-sm">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">P/B</span>
                            <span className="text-xl font-semibold tabular-nums mt-0.5">
                              {formatNumber(stockData.priceToBook!)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {hasPS && (
                    <div className="flex flex-col items-center">
                      <p className="text-sm font-medium text-muted-foreground mb-3">P/S — Market Cap vs Sales</p>
                      <div className="relative w-[220px] h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                              data={psData}
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={92}
                              dataKey="value"
                              stroke={strokeColor}
                              strokeWidth={2}
                              paddingAngle={4}
                            >
                              {psData.map((entry, index) => (
                                <Cell key={index} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, _name, props: { payload?: { name: string } }) => [
                                formatLargeNumber(value),
                                props.payload?.name ?? ''
                              ]}
                              contentStyle={tooltipStyle}
                              cursor={false}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <div className="rounded-full w-[88px] h-[88px] flex flex-col items-center justify-center bg-card/80 border border-border/50 shadow-sm">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">P/S</span>
                            <span className="text-xl font-semibold tabular-nums mt-0.5">
                              {formatNumber(stockData.priceToSales!)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null;
        })()}

        {/* Revenue → Earnings Waterfall */}
        <IncomeWaterfall symbol={symbol} />

        {/* Cash Flow Waterfall */}
        <CashFlowWaterfall symbol={symbol} />

        {/* Margin Trends + Revenue vs Net Income */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MarginTrends symbol={symbol} />
          <RevenueEarningsChart symbol={symbol} />
        </div>

        {/* Balance Sheet Snapshot */}
        <BalanceSheetSnapshot symbol={symbol} />

        {/* Dividends (and buyback note in Cash Flow) */}
        <DividendBuyback symbol={symbol} currentPrice={stockData.price} />

        {/* Peer Comparison (margins) */}
        <PeerComparison symbol={symbol} peerSymbols={[]} maxPeers={2} />

        {/* Insider Trading */}
        {(insiderLoading || insiderData !== null) && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Insider Trading
              </h2>
              <p className="text-xs text-muted-foreground mb-2">
                Recent SEC-reported transactions by company insiders, grouped by week. Click a week with multiple trades to see each transaction. Data from Financial Modeling Prep.
              </p>
              <details className="text-xs text-muted-foreground mb-4 group">
                <summary className="cursor-pointer hover:text-foreground list-none inline-flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                  <span className="select-none">What do Gift, Exempt, and $0 value mean?</span>
                </summary>
                <ul className="mt-2 pl-4 space-y-1 list-disc max-w-xl">
                  <li><strong>Gift</strong> — The insider transferred shares to someone else (e.g. family, charity) without payment. No cash changed hands, so value is often $0.</li>
                  <li><strong>Exempt</strong> — A transaction that is exempt from certain SEC rules (e.g. employee plan acquisitions under Rule 16b-3). The type or price may not be reported, so value can be $0.</li>
                  <li><strong>$0 value</strong> — Gifts, some exempt transactions, and filings that don’t report price show $0. The SEC filing link may have more detail.</li>
                </ul>
              </details>
              {insiderLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : insiderData && insiderData.trades.length > 0 ? (
                (() => {
                  const groups = groupInsiderTradesByWeek(insiderData.trades);
                  const totalBoughtShares = groups.reduce((s, g) => s + g.sharesBought, 0);
                  const totalSoldShares = groups.reduce((s, g) => s + g.sharesSold, 0);
                  const totalBoughtValue = groups.reduce((s, g) => s + g.valueBought, 0);
                  const totalSoldValue = groups.reduce((s, g) => s + g.valueSold, 0);
                  const formatShares = (x: number) => Math.round(x).toLocaleString('en-US', { maximumFractionDigits: 0 });
                  const formatValue = (num: number | null) => {
                    if (num === null || num === undefined) return 'N/A';
                    const n = Math.round(num);
                    if (n >= 1e12) return `$${(n / 1e12).toFixed(0)}T`;
                    if (n >= 1e9) return `$${(n / 1e9).toFixed(0)}B`;
                    if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
                    return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                  };
                  return (
                    <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="w-9 py-2" />
                            <th className="text-left py-2 font-medium text-muted-foreground">Week</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">Insiders</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">Type</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Shares</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Value</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map((g) => {
                            const typeLabel = g.buyCount > 0 && g.sellCount > 0
                              ? `Mixed (${g.buyCount} buy${g.buyCount !== 1 ? 's' : ''}, ${g.sellCount} sell${g.sellCount !== 1 ? 's' : ''})`
                              : g.buyCount > 0
                                ? `Buy (${g.buyCount})`
                                : `Sell (${g.sellCount})`;
                            const typeClass = g.buyCount > 0 && g.sellCount === 0
                              ? 'text-green-600 dark:text-green-400'
                              : g.sellCount > 0 && g.buyCount === 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-muted-foreground';
                            const sharesLabel = g.sharesBought > 0 && g.sharesSold > 0
                              ? `${formatShares(g.sharesBought)} bought / ${formatShares(g.sharesSold)} sold`
                              : g.sharesBought > 0
                                ? `+${formatShares(g.sharesBought)}`
                                : `−${formatShares(g.sharesSold)}`;
                            const valueTotal = g.valueBought + g.valueSold;
                            const valueLabel = g.valueBought > 0 && g.valueSold > 0
                              ? `${formatValue(g.valueBought)} bought / ${formatValue(g.valueSold)} sold`
                              : formatValue(valueTotal);
                            const insidersLabel = g.participants.length <= 2
                              ? g.participants.join(', ') || '—'
                              : `${g.participants.length} insiders`;
                            const canExpand = g.count > 1;
                            const isExpanded = expandedInsiderWeeks.has(g.weekKey);
                            return (
                              <Fragment key={g.weekKey}>
                                <tr
                                  className={cn(
                                    'border-b border-border/50 hover:bg-muted/30',
                                    canExpand && 'cursor-pointer'
                                  )}
                                  onClick={() => canExpand && toggleInsiderWeek(g.weekKey)}
                                  role={canExpand ? 'button' : undefined}
                                  aria-expanded={canExpand ? isExpanded : undefined}
                                  aria-label={canExpand ? (isExpanded ? 'Collapse week' : `Expand to see ${g.count} transactions`) : undefined}
                                >
                                  <td className="py-2 w-9 pl-1" onClick={(e) => e.stopPropagation()}>
                                    {canExpand ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleInsiderWeek(g.weekKey)}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                      >
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                      </button>
                                    ) : null}
                                  </td>
                                  <td className="py-2 whitespace-nowrap">{g.weekLabel}</td>
                                  <td className="py-2 max-w-[180px] truncate" title={g.participants.join(', ')}>{insidersLabel}</td>
                                  <td className={cn('py-2 font-medium', typeClass)}>{typeLabel}</td>
                                  <td className="py-2 text-right tabular-nums">{sharesLabel}</td>
                                  <td className="py-2 text-right tabular-nums">{valueLabel}</td>
                                  <td className="py-2" onClick={(e) => e.stopPropagation()}>
                                    {g.firstLink ? (
                                      <a href={g.firstLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" aria-label="View SEC filing">
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    ) : null}
                                  </td>
                                </tr>
                                {isExpanded && g.weekTrades.map((t, i) => {
                                  const dateStr = t.transactionDate || t.filingDate;
                                  const dateLabel = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                                  const isBuy = t.transactionType && /p|acqui|purchase|buy/i.test(String(t.transactionType));
                                  return (
                                    <tr key={`${g.weekKey}-${i}`} className="border-b border-border/30 bg-muted/20 hover:bg-muted/30">
                                      <td className="py-1.5 w-9" />
                                      <td className="py-1.5 pl-6 text-muted-foreground whitespace-nowrap">{dateLabel}</td>
                                      <td className="py-1.5 max-w-[180px] truncate" title={t.typeOfOwner ?? undefined}>{t.reportingName ?? '—'}</td>
                                      <td className={cn('py-1.5 font-medium', isBuy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                                        {t.transactionType ?? '—'}
                                      </td>
                                      <td className="py-1.5 text-right tabular-nums">{t.securitiesTransacted != null ? formatShares(t.securitiesTransacted) : '—'}</td>
                                      <td className="py-1.5 text-right tabular-nums">{t.value != null ? formatValue(t.value) : '—'}</td>
                                      <td className="py-1.5">
                                        {t.link ? (
                                          <a href={t.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" aria-label="View SEC filing" onClick={(e) => e.stopPropagation()}>
                                            <ExternalLink className="w-4 h-4" />
                                          </a>
                                        ) : null}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                      <div className="text-sm shrink-0">
                        <div>
                          <span className="text-muted-foreground">Total bought: </span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {formatShares(totalBoughtShares)} shares
                            {totalBoughtValue > 0 && <> · {formatValue(totalBoughtValue)}</>}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total sold: </span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {formatShares(totalSoldShares)} shares
                            {totalSoldValue > 0 && <> · {formatValue(totalSoldValue)}</>}
                          </span>
                        </div>
                      </div>
                      <div className="w-full sm:w-auto min-w-0 sm:min-w-[200px]" style={{ width: '100%', maxWidth: 220, height: 56 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={(() => {
                              const maxShares = Math.max(totalBoughtShares, totalSoldShares, 1);
                              const maxValue = Math.max(totalBoughtValue, totalSoldValue, 1);
                              return [
                                {
                                  name: 'Bought',
                                  shares: totalBoughtShares,
                                  value: totalBoughtValue,
                                  sharesPct: 100 * totalBoughtShares / maxShares,
                                  valuePct: 100 * totalBoughtValue / maxValue,
                                  sharesFill: 'hsl(142 76% 55%)',
                                  valueFill: 'hsl(142 76% 28%)',
                                },
                                {
                                  name: 'Sold',
                                  shares: totalSoldShares,
                                  value: totalSoldValue,
                                  sharesPct: 100 * totalSoldShares / maxShares,
                                  valuePct: 100 * totalSoldValue / maxValue,
                                  sharesFill: 'hsl(0 84% 70%)',
                                  valueFill: 'hsl(0 84% 45%)',
                                },
                              ];
                            })()}
                            layout="vertical"
                            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                          >
                            <XAxis type="number" domain={[0, 200]} hide />
                            <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 11 }} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const p = payload[0].payload;
                                const isBought = p.name === 'Bought';
                                return (
                                  <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
                                    <div className="font-medium">{p.name}</div>
                                    <div className={isBought ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                      Shares: {formatShares(p.shares)}
                                    </div>
                                    <div className="text-muted-foreground">Value: {formatValue(p.value)}</div>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="sharesPct" stackId="a" radius={[0, 0, 0, 0]}>
                              {[0, 1].map((i) => (
                                <Cell key={i} fill={i === 0 ? 'hsl(142 76% 55%)' : 'hsl(0 84% 70%)'} />
                              ))}
                            </Bar>
                            <Bar dataKey="valuePct" stackId="a" radius={[0, 2, 2, 0]}>
                              {[0, 1].map((i) => (
                                <Cell key={i} fill={i === 0 ? 'hsl(142 76% 28%)' : 'hsl(0 84% 45%)'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    </>
                  );
                })()
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No recent insider trades for this symbol. Availability may depend on your FMP plan.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analyst Outlook */}
        {(analystLoading || analystData) && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Analyst Outlook
              </h3>
              <p className="text-xs text-muted-foreground mb-6">
                Analyst data (price targets, estimates, grades) can be limited by FMP plan or symbol coverage. If sections are empty, your plan may not include them for this symbol, or they may be limited to certain tickers—check FMP pricing for details.
              </p>
              {analystLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : analystData ? (
                <div className="space-y-8">
                  {/* Price Target Summary & Consensus - only show when at least one value exists */}
                  {(() => {
                    const hasConsensus = analystData.priceTargetConsensus?.consensus != null;
                    const hasHigh = analystData.priceTargetConsensus?.high != null;
                    const hasLow = analystData.priceTargetConsensus?.low != null;
                    const hasAnalystCount = analystData.priceTargetSummary?.analystCount != null;
                    const hasAnyPriceTarget = hasConsensus || hasHigh || hasLow || hasAnalystCount;
                    return hasAnyPriceTarget ? (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Price targets
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {analystData.priceTargetConsensus?.consensus != null && (
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground">Consensus</p>
                            <p className="text-lg font-semibold tabular-nums">${formatNumber(analystData.priceTargetConsensus.consensus!)}</p>
                            {stockData && analystData.priceTargetConsensus.consensus != null && (
                              <p className={cn("text-xs mt-1", (analystData.priceTargetConsensus.consensus - stockData.price) >= 0 ? "text-green-500" : "text-red-500")}>
                                {((analystData.priceTargetConsensus.consensus - stockData.price) / stockData.price * 100).toFixed(1)}% vs current
                              </p>
                            )}
                          </div>
                        )}
                        {analystData.priceTargetConsensus?.high != null && (
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground">High</p>
                            <p className="text-lg font-semibold tabular-nums">${formatNumber(analystData.priceTargetConsensus.high!)}</p>
                          </div>
                        )}
                        {analystData.priceTargetConsensus?.low != null && (
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground">Low</p>
                            <p className="text-lg font-semibold tabular-nums">${formatNumber(analystData.priceTargetConsensus.low!)}</p>
                          </div>
                        )}
                        {analystData.priceTargetSummary?.analystCount != null && (
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground">Analysts</p>
                            <p className="text-lg font-semibold tabular-nums">{analystData.priceTargetSummary.analystCount}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    ) : null;
                  })()}

                  {/* Grades Consensus */}
                  {analystData.gradesConsensus && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Consensus ratings
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {analystData.gradesConsensus.strongBuy > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                            Strong Buy {analystData.gradesConsensus.strongBuy}
                          </span>
                        )}
                        {analystData.gradesConsensus.buy > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600/90 dark:text-green-400/90">
                            Buy {analystData.gradesConsensus.buy}
                          </span>
                        )}
                        {analystData.gradesConsensus.hold > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                            Hold {analystData.gradesConsensus.hold}
                          </span>
                        )}
                        {analystData.gradesConsensus.sell > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                            Sell {analystData.gradesConsensus.sell}
                          </span>
                        )}
                        {analystData.gradesConsensus.strongSell > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                            Strong Sell {analystData.gradesConsensus.strongSell}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Analyst Estimates (forward revenue, EPS) */}
                  {analystData.analystEstimates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Forward estimates
                      </h4>
                      {/* Projection chart: revenue (bars) + EPS (line) by period */}
                      {analystData.analystEstimates.some((e) => e.revenueEst != null || e.epsEst != null) && (
                        <div className="mb-6 h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={analystData.analystEstimates.map((e) => ({
                                period: e.period ?? e.date ?? '—',
                                revenue: e.revenueEst ?? 0,
                                eps: e.epsEst ?? 0,
                              }))}
                              margin={{ top: 8, right: 40, left: 0, bottom: 8 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis
                                dataKey="period"
                                tick={{ fontSize: 11 }}
                                className="text-muted-foreground"
                              />
                              <YAxis
                                yAxisId="revenue"
                                orientation="left"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v))}
                                className="text-muted-foreground"
                              />
                              <YAxis
                                yAxisId="eps"
                                orientation="right"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v) => `$${typeof v === 'number' ? v.toFixed(2) : v}`}
                                className="text-muted-foreground"
                              />
                              <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                                formatter={(value: number, name: string) => [
                                  name === 'revenue' ? formatLargeNumber(value) : `$${formatNumber(value)}`,
                                  name === 'revenue' ? 'Revenue est.' : 'EPS est.',
                                ]}
                                labelFormatter={(label) => `Period: ${label}`}
                              />
                              <Bar yAxisId="revenue" dataKey="revenue" fill="hsl(var(--primary) / 0.6)" name="revenue" radius={[4, 4, 0, 0]} />
                              <Line yAxisId="eps" type="monotone" dataKey="eps" stroke="hsl(var(--chart-2, 142 76% 36%))" strokeWidth={2} dot={{ r: 4 }} name="eps" />
                              <Legend formatter={(value) => (value === 'revenue' ? 'Revenue est.' : 'EPS est.')} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium text-muted-foreground">Period</th>
                              <th className="text-right py-2 font-medium text-muted-foreground">Revenue Est.</th>
                              <th className="text-right py-2 font-medium text-muted-foreground">EPS Est.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analystData.analystEstimates.map((e, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="py-2">{e.period ?? e.date ?? '—'}</td>
                                <td className="text-right tabular-nums">{e.revenueEst != null ? formatLargeNumber(e.revenueEst) : '—'}</td>
                                <td className="text-right tabular-nums">{e.epsEst != null ? `$${formatNumber(e.epsEst)}` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Show message if no analyst data at all */}
                  {!analystData.priceTargetSummary && !analystData.priceTargetConsensus && !analystData.gradesConsensus && analystData.analystEstimates.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No analyst data returned for this symbol. Availability depends on your FMP plan and symbol coverage (some plans limit analyst data to certain tickers). See{" "}
                      <a href="https://site.financialmodelingprep.com/developer/docs/pricing" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                        FMP pricing
                      </a>{" "}
                      for what your plan includes.
                    </p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Detailed Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Trading Information
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Volume</span>
                  <span className="text-sm font-medium">{formatVolume(stockData.volume)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Average Volume</span>
                  <span className="text-sm font-medium">{formatVolume(stockData.averageVolume)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">52 Week High</span>
                  <span className="text-sm font-medium">${formatNumber(stockData.fiftyTwoWeekHigh)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">52 Week Low</span>
                  <span className="text-sm font-medium">${formatNumber(stockData.fiftyTwoWeekLow)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Company Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Market Cap</span>
                  <span className="text-sm font-medium">{formatLargeNumber(stockData.marketCap)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">P/E Ratio</span>
                  <span className="text-sm font-medium">{stockData.pe ? formatNumber(stockData.pe) : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">EPS (Earnings Per Share)</span>
                  <span className="text-sm font-medium">{stockData.eps ? `$${formatNumber(stockData.eps)}` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Currency</span>
                  <span className="text-sm font-medium">{stockData.currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>Data provided by Financial Modeling Prep (FMP)</p>
          <p className="mt-1">Prices are delayed and for informational purposes only</p>
        </footer>
      </div>
    </div>
  );
}

