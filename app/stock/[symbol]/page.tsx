'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, Sparkles, ArrowLeft, Star, Share2, ExternalLink, ChevronDown, ChevronRight, Calculator, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import StockAI from '@/components/dashboard/StockAI';
import RelatedStocks from '@/components/dashboard/RelatedStocks';
import CompanyProfile from '@/components/dashboard/CompanyProfile';
import StockNews from '@/components/dashboard/StockNews';
import IncomeWaterfall from '@/components/dashboard/IncomeWaterfall';
import CashFlowWaterfall from '@/components/dashboard/CashFlowWaterfall';
import MarginTrends from '@/components/dashboard/MarginTrends';
import RevenueEarningsChart from '@/components/dashboard/RevenueEarningsChart';
import BalanceSheetSnapshot from '@/components/dashboard/BalanceSheetSnapshot';
import DividendBuyback from '@/components/dashboard/DividendBuyback';
import SECFilings from '@/components/dashboard/SECFilings';
import DCFValuation from '@/components/dashboard/DCFValuation';
import FuturePriceModel from '@/components/dashboard/FuturePriceModel';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import TradingViewWidget, { AVAILABLE_INDICATORS, IndicatorId } from '@/components/TradingViewWidget';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

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

/** SEC Form 4 transaction type codes and common API labels → full name + explanation for insider trading card */
const INSIDER_TRANSACTION_TYPES: { code: string; name: string; description: string; category: 'buy' | 'sell' | 'other' }[] = [
  { code: 'P', name: 'Purchase', description: 'Open market or private purchase of securities', category: 'buy' },
  { code: 'S', name: 'Sale', description: 'Open market or private sale of securities', category: 'sell' },
  { code: 'A', name: 'Grant, award, or other acquisition', description: 'Grant, award, or other acquisition from the company (e.g. RSU/option grant)', category: 'buy' },
  { code: 'D', name: 'Disposition to company', description: 'Disposition to the company (shares returned to issuer)', category: 'sell' },
  { code: 'F', name: 'Tax withholding / exercise payment', description: 'Tax withholding or payment of exercise price by delivering/withholding shares', category: 'other' },
  { code: 'G', name: 'Gift', description: 'Bona fide gift', category: 'other' },
  { code: 'M', name: 'Exercise or conversion of derivative', description: 'Exercise or conversion of derivative security (e.g. options)', category: 'buy' },
  { code: 'O', name: 'Exercise out-of-the-money derivative', description: 'Exercise of out-of-the-money derivative security', category: 'buy' },
  { code: 'X', name: 'Exercise in-the-money derivative', description: 'Exercise of in-the-money or at-the-money derivative security', category: 'buy' },
  { code: 'C', name: 'Conversion of derivative', description: 'Conversion of derivative security (e.g. convertible)', category: 'buy' },
  { code: 'E', name: 'Expiration of short derivative', description: 'Expiration of short derivative position', category: 'sell' },
  { code: 'H', name: 'Expiration/cancellation of long derivative', description: 'Expiration or cancellation of long derivative with value received', category: 'other' },
  { code: 'I', name: 'Discretionary (benefit plan)', description: 'Discretionary transaction in employee benefit plan', category: 'other' },
  { code: 'J', name: 'Other (see filing)', description: 'Other acquisition or disposition (see filing for details)', category: 'other' },
  { code: 'K', name: 'Equity swap or similar', description: 'Transaction in equity swap or similar instrument', category: 'other' },
  { code: 'L', name: 'Small acquisition (Rule 16a-6)', description: 'Small acquisition under Rule 16a-6', category: 'buy' },
  { code: 'U', name: 'Tender offer / change of control', description: 'Disposition pursuant to tender offer or change of control', category: 'sell' },
  { code: 'V', name: 'Voluntary early report', description: 'Voluntarily reported earlier than required', category: 'other' },
  { code: 'W', name: 'Will or descent', description: 'Acquisition or disposition by will or laws of descent', category: 'other' },
  { code: 'Z', name: 'Voting trust', description: 'Deposit into or withdrawal from voting trust', category: 'other' },
  { code: 'Purchase', name: 'Purchase', description: 'Purchase of shares (open market or private)', category: 'buy' },
  { code: 'Acquisition', name: 'Acquisition', description: 'Acquisition of shares (e.g. grant, award, or purchase)', category: 'buy' },
  { code: 'Sale', name: 'Sale', description: 'Sale of shares (open market or private)', category: 'sell' },
  { code: 'Disposition', name: 'Disposition', description: 'Disposition of shares (sale or transfer)', category: 'sell' },
];

function getInsiderTypeDescription(transactionType: string | null): string {
  if (!transactionType || typeof transactionType !== 'string') return '';
  const key = transactionType.trim();
  const byCode = INSIDER_TRANSACTION_TYPES.find((t) => t.code.toUpperCase() === key.toUpperCase());
  if (byCode) return byCode.description;
  const byPartial = INSIDER_TRANSACTION_TYPES.find(
    (t) => key.toLowerCase().startsWith(t.code.toLowerCase()) || t.code.toLowerCase().startsWith(key.toLowerCase())
  );
  return byPartial ? byPartial.description : '';
}

/** Returns display label: "P – Purchase" for codes, or "Purchase" for word-only, or raw value if unknown */
function getInsiderTypeLabel(transactionType: string | null): string {
  if (!transactionType || typeof transactionType !== 'string') return '—';
  const key = transactionType.trim();
  const byCode = INSIDER_TRANSACTION_TYPES.find((t) => t.code.toUpperCase() === key.toUpperCase());
  if (byCode) return byCode.code.length === 1 ? `${byCode.code} – ${byCode.name}` : byCode.name;
  const byPartial = INSIDER_TRANSACTION_TYPES.find(
    (t) => key.toLowerCase().startsWith(t.code.toLowerCase()) || t.code.toLowerCase().startsWith(key.toLowerCase())
  );
  return byPartial ? (byPartial.code.length === 1 ? `${byPartial.code} – ${byPartial.name}` : byPartial.name) : key;
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

interface InsiderTimePeriodData {
  period: string;
  label: string;
  buyShares: number;
  sellShares: number;
  buyValue: number;
  sellValue: number;
  buyCount: number;
  sellCount: number;
  hasData: boolean;
}

function aggregateInsiderByTimePeriod(trades: InsiderTrade[]): InsiderTimePeriodData[] {
  const now = new Date();
  // Non-overlapping time windows
  const periods = [
    { period: '1M', label: '0-30d', startDays: 0, endDays: 30 },
    { period: '3M', label: '1-3mo', startDays: 30, endDays: 90 },
    { period: '6M', label: '3-6mo', startDays: 90, endDays: 180 },
    { period: '1Y', label: '6-12mo', startDays: 180, endDays: 365 },
  ];

  return periods.map(({ period, label, startDays, endDays }) => {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - startDays);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - endDays);

    let buyShares = 0;
    let sellShares = 0;
    let buyValue = 0;
    let sellValue = 0;
    let buyCount = 0;
    let sellCount = 0;

    for (const t of trades) {
      const dateStr = t.transactionDate || t.filingDate;
      if (!dateStr) continue;
      const tradeDate = new Date(dateStr);
      // Trade must be within the window: endDate <= tradeDate <= startDate
      if (tradeDate > startDate || tradeDate < endDate) continue;

      const isBuy = t.transactionType && /p|acqui|purchase|buy/i.test(String(t.transactionType));
      const shares = t.securitiesTransacted ?? 0;
      const val = t.value ?? 0;

      if (isBuy) {
        buyShares += shares;
        buyValue += val;
        buyCount++;
      } else {
        sellShares += shares;
        sellValue += val;
        sellCount++;
      }
    }

    return {
      period,
      label,
      buyShares,
      sellShares,
      buyValue,
      sellValue,
      buyCount,
      sellCount,
      hasData: buyCount > 0 || sellCount > 0,
    };
  });
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
  const [isFuturePriceOpen, setIsFuturePriceOpen] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [insiderData, setInsiderData] = useState<InsiderTradingData | null>(null);
  const [insiderLoading, setInsiderLoading] = useState(false);
  const [expandedInsiderWeeks, setExpandedInsiderWeeks] = useState<Set<string>>(new Set());
  const [showInsiderTypesHelp, setShowInsiderTypesHelp] = useState(false);
  const [performanceData, setPerformanceData] = useState<{
    '1W': number | null;
    '1M': number | null;
    '6M': number | null;
    '1Y': number | null;
  } | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorId[]>([]);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

  const toggleInsiderWeek = (weekKey: string) => {
    setExpandedInsiderWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekKey)) next.delete(weekKey);
      else next.add(weekKey);
      return next;
    });
  };

  const toggleIndicator = (indicatorId: IndicatorId) => {
    setSelectedIndicators((prev) => {
      if (prev.includes(indicatorId)) {
        return prev.filter((id) => id !== indicatorId);
      }
      return [...prev, indicatorId];
    });
  };

  const clearAllIndicators = () => {
    setSelectedIndicators([]);
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
    setInsiderLoading(true);
    fetch(`/api/insider-trading?symbol=${symbol}&limit=100`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && data.trades) setInsiderData(data as InsiderTradingData);
        else setInsiderData(null);
      })
      .catch(() => setInsiderData(null))
      .finally(() => setInsiderLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    fetch(`/api/stock-performance?symbol=${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setPerformanceData({
            '1W': data['1W'] ?? null,
            '1M': data['1M'] ?? null,
            '6M': data['6M'] ?? null,
            '1Y': data['1Y'] ?? null,
          });
        }
      })
      .catch(() => setPerformanceData(null));
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
            <Link href={`/options/${stockData.symbol}`}>
              <Button variant="outline" className="gap-2">
                <Activity className="w-4 h-4" />
                Options Chain
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setIsFuturePriceOpen(true)} className="gap-2">
              <Calculator className="w-4 h-4" />
              Future Price Model
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

        {/* Future Price Model */}
        <FuturePriceModel
          symbol={stockData.symbol}
          currentPrice={stockData.price}
          eps={stockData.eps}
          pe={stockData.pe}
          open={isFuturePriceOpen}
          onOpenChange={setIsFuturePriceOpen}
        />

        {/* TradingView Chart */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Price Chart</h2>
              <div className="flex flex-wrap items-center gap-2">
                {/* Indicator Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                      selectedIndicators.length > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Indicators
                    {selectedIndicators.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-[10px]">
                        {selectedIndicators.length}
                      </span>
                    )}
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showIndicatorMenu && "rotate-180")} />
                  </button>
                  
                  {showIndicatorMenu && (
                    <>
                      {/* Backdrop to close menu */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowIndicatorMenu(false)}
                      />
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Technical Indicators</span>
                          {selectedIndicators.length > 0 && (
                            <button
                              onClick={clearAllIndicators}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        <div className="max-h-64 overflow-y-auto p-1">
                          {AVAILABLE_INDICATORS.map((indicator) => {
                            const isSelected = selectedIndicators.includes(indicator.id);
                            return (
                              <button
                                key={indicator.id}
                                onClick={() => toggleIndicator(indicator.id)}
                                className={cn(
                                  "w-full flex items-start gap-3 p-2 rounded-md text-left transition-colors",
                                  isSelected 
                                    ? "bg-primary/10 text-primary" 
                                    : "hover:bg-muted"
                                )}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                                  isSelected 
                                    ? "bg-primary border-primary" 
                                    : "border-muted-foreground/30"
                                )}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">{indicator.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{indicator.description}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Time Range Selector */}
                <div className="flex gap-1">
                  {timeRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setSelectedRange(range.value)}
                      className={cn(
                        "px-3 py-1 rounded-md text-xs font-medium transition-colors",
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
            </div>

            {/* Selected Indicators Pills */}
            {selectedIndicators.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedIndicators.map((indicatorId) => {
                  const indicator = AVAILABLE_INDICATORS.find(i => i.id === indicatorId);
                  if (!indicator) return null;
                  return (
                    <span
                      key={indicatorId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                    >
                      {indicator.name}
                      <button
                        onClick={() => toggleIndicator(indicatorId)}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${indicator.name}`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="w-full" style={{ height: '600px' }}>
              <TradingViewWidget 
                symbol={
                  stockData.exchange && stockData.exchange !== 'N/A'
                    ? `${stockData.exchange}:${stockData.symbol}`
                    : stockData.symbol
                }
                interval={timeRanges.find(r => r.value === selectedRange)?.interval || 'D'}
                range={selectedRange}
                indicators={selectedIndicators}
              />
            </div>
          </CardContent>
        </Card>

        {/* Company Profile */}
        <div className="mb-8">
          <CompanyProfile symbol={symbol} />
        </div>

        {/* Performance + Related Stocks + 52-Week Range */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 lg:col-span-1">
            {[
              { label: '7 Days', key: '1W' as const },
              { label: '1 Month', key: '1M' as const },
              { label: '6 Months', key: '6M' as const },
              { label: '1 Year', key: '1Y' as const },
            ].map(({ label, key }) => {
              const value = performanceData?.[key];
              const isPositive = value != null && value >= 0;
              const isNegative = value != null && value < 0;
              return (
                <Card key={key} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 shrink-0 text-emerald-500" />
                      ) : isNegative ? (
                        <TrendingDown className="w-3 h-3 shrink-0 text-rose-500" />
                      ) : (
                        <Activity className="w-3 h-3 shrink-0" />
                      )}
                      <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
                    </div>
                    <div className={cn(
                      "text-sm font-semibold tabular-nums",
                      isPositive && "text-emerald-500",
                      isNegative && "text-rose-500"
                    )}>
                      {value != null ? `${isPositive ? '+' : ''}${value.toFixed(2)}%` : '—'}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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


        {/* Valuation Multiples + DCF (side by side) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {(() => {
          const marketCap = stockData.marketCap ?? 0;
          const hasPE = stockData.pe != null && stockData.pe > 0 && marketCap > 0;
          const hasPB = stockData.priceToBook != null && stockData.priceToBook > 0 && marketCap > 0;
          const hasPS = stockData.priceToSales != null && stockData.priceToSales > 0 && marketCap > 0;
          const earnings = hasPE ? marketCap / stockData.pe! : 0;
          const bookValue = hasPB ? marketCap / stockData.priceToBook! : 0;
          const sales = hasPS ? marketCap / stockData.priceToSales! : 0;
          
          const VALUATION_COLORS = {
            marketCap: '#6366f1',   // Indigo
            earnings: '#f59e0b',    // Amber
            bookValue: '#10b981',   // Emerald
            sales: '#8b5cf6',       // Violet
          };
          
          const peData = hasPE
            ? [
                { name: 'Market Cap', value: marketCap, color: VALUATION_COLORS.marketCap },
                { name: 'Earnings', value: earnings, color: VALUATION_COLORS.earnings }
              ]
            : [{ name: 'N/A', value: 1, color: 'hsl(var(--muted))' }];
          const pbData = hasPB ? [
            { name: 'Market Cap', value: marketCap, color: VALUATION_COLORS.marketCap },
            { name: 'Book Value', value: bookValue, color: VALUATION_COLORS.bookValue }
          ] : [];
          const psData = hasPS ? [
            { name: 'Market Cap', value: marketCap, color: VALUATION_COLORS.marketCap },
            { name: 'Sales', value: sales, color: VALUATION_COLORS.sales }
          ] : [];
          
          const showValuation = marketCap > 0;
          
          // Custom tooltip for valuation charts
          const ValuationTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) => {
            if (!active || !payload || payload.length === 0) return null;
            const data = payload[0].payload;
            return (
              <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[140px]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                  <span className="text-sm font-medium text-foreground">{data.name}</span>
                </div>
                <p className="text-lg font-bold text-foreground pl-4">{formatLargeNumber(data.value)}</p>
              </div>
            );
          };
          
          return showValuation ? (
            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">Valuation Multiples</h2>
                      <p className="text-sm text-muted-foreground">
                        Price-to-Earnings, Book Value & Sales ratios
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
                    <span className="text-xs text-muted-foreground">Market Cap:</span>
                    <span className="text-xs font-semibold text-foreground">{formatLargeNumber(marketCap)}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VALUATION_COLORS.marketCap }} />
                    <span className="text-xs text-muted-foreground">Market Cap</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VALUATION_COLORS.earnings }} />
                    <span className="text-xs text-muted-foreground">Earnings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VALUATION_COLORS.bookValue }} />
                    <span className="text-xs text-muted-foreground">Book Value</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VALUATION_COLORS.sales }} />
                    <span className="text-xs text-muted-foreground">Sales</span>
                  </div>
                </div>

                {/* Donut charts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
                  {/* P/E Donut */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-[200px] h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="peMarketCapGrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#818cf8" />
                              <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                            <linearGradient id="peEarningsGrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#fbbf24" />
                              <stop offset="100%" stopColor="#f59e0b" />
                            </linearGradient>
                          </defs>
                          <Pie
                            data={peData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            dataKey="value"
                            stroke="hsl(var(--background))"
                            strokeWidth={3}
                            paddingAngle={hasPE ? 3 : 0}
                          >
                            {peData.map((entry, index) => (
                              <Cell 
                                key={index} 
                                fill={hasPE ? (index === 0 ? 'url(#peMarketCapGrad)' : 'url(#peEarningsGrad)') : entry.color}
                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<ValuationTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">P/E Ratio</span>
                        <span className="text-2xl font-bold tabular-nums mt-0.5">
                          {hasPE ? formatNumber(stockData.pe!, 1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">Market Cap vs Earnings</p>
                  </div>

                  {/* P/B Donut */}
                  {hasPB && (
                    <div className="flex flex-col items-center">
                      <div className="relative w-[200px] h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                              <linearGradient id="pbMarketCapGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#818cf8" />
                                <stop offset="100%" stopColor="#6366f1" />
                              </linearGradient>
                              <linearGradient id="pbBookValueGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#34d399" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                            </defs>
                            <Pie
                              data={pbData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={85}
                              dataKey="value"
                              stroke="hsl(var(--background))"
                              strokeWidth={3}
                              paddingAngle={3}
                            >
                              {pbData.map((entry, index) => (
                                <Cell 
                                  key={index} 
                                  fill={index === 0 ? 'url(#pbMarketCapGrad)' : 'url(#pbBookValueGrad)'}
                                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<ValuationTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">P/B Ratio</span>
                          <span className="text-2xl font-bold tabular-nums mt-0.5">
                            {formatNumber(stockData.priceToBook!, 1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">Market Cap vs Book Value</p>
                    </div>
                  )}

                  {/* P/S Donut */}
                  {hasPS && (
                    <div className="flex flex-col items-center">
                      <div className="relative w-[200px] h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                              <linearGradient id="psMarketCapGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#818cf8" />
                                <stop offset="100%" stopColor="#6366f1" />
                              </linearGradient>
                              <linearGradient id="psSalesGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#a78bfa" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                              </linearGradient>
                            </defs>
                            <Pie
                              data={psData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={85}
                              dataKey="value"
                              stroke="hsl(var(--background))"
                              strokeWidth={3}
                              paddingAngle={3}
                            >
                              {psData.map((entry, index) => (
                                <Cell 
                                  key={index} 
                                  fill={index === 0 ? 'url(#psMarketCapGrad)' : 'url(#psSalesGrad)'}
                                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<ValuationTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">P/S Ratio</span>
                          <span className="text-2xl font-bold tabular-nums mt-0.5">
                            {formatNumber(stockData.priceToSales!, 1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">Market Cap vs Sales</p>
                    </div>
                  )}
                </div>

                {/* Footer summary */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <div className="flex flex-wrap gap-4 text-xs">
                    {hasPE && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-full">
                        <span className="text-muted-foreground">Earnings:</span>
                        <span className="font-semibold text-amber-500">{formatLargeNumber(earnings)}</span>
                      </div>
                    )}
                    {hasPB && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-full">
                        <span className="text-muted-foreground">Book Value:</span>
                        <span className="font-semibold text-emerald-500">{formatLargeNumber(bookValue)}</span>
                      </div>
                    )}
                    {hasPS && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-full">
                        <span className="text-muted-foreground">Sales:</span>
                        <span className="font-semibold text-violet-500">{formatLargeNumber(sales)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : <div />;
        })()}
        <DCFValuation symbol={symbol} currentPrice={stockData.price} />
        </div>

        {/* Revenue → Earnings Waterfall + Cash Flow Waterfall (side by side) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <IncomeWaterfall symbol={symbol} />
          <CashFlowWaterfall symbol={symbol} />
        </div>

        {/* Margin Trends + Revenue vs Net Income */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MarginTrends symbol={symbol} />
          <RevenueEarningsChart symbol={symbol} />
        </div>

        {/* Balance Sheet Snapshot + Dividends (side by side) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <BalanceSheetSnapshot symbol={symbol} />
          <DividendBuyback symbol={symbol} currentPrice={stockData.price} />
        </div>

        {/* Insider Trading */}
        {(insiderLoading || insiderData !== null) && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-lg font-semibold">
                  Insider Trading
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setShowInsiderTypesHelp(true)}
                  aria-label="Explain transaction types"
                >
                  <HelpCircle className="w-4 h-4 mr-1.5" />
                  What do these types mean?
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Recent SEC-reported transactions by company insiders, grouped by week. Click a week with multiple trades to see each transaction. Data from Financial Modeling Prep.
              </p>
              {insiderLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : insiderData && insiderData.trades.length > 0 ? (
                (() => {
                  const groups = groupInsiderTradesByWeek(insiderData.trades);
                  const timePeriodData = aggregateInsiderByTimePeriod(insiderData.trades);
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
                  const formatCompactValue = (num: number) => {
                    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
                    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
                    if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
                    return `$${num.toFixed(0)}`;
                  };
                  // Prepare chart data for Recharts
                  const chartData = timePeriodData.map((d) => ({
                    period: d.period,
                    buy: d.buyValue,
                    sell: d.sellValue,
                    buyCount: d.buyCount,
                    sellCount: d.sellCount,
                  }));
                  
                  return (
                    <>
                    {/* Side-by-side layout: Weekly Table (left) + Chart (right) */}
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr,340px] gap-6">
                      {/* Weekly Breakdown Table */}
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Weekly Breakdown</h3>
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
                                      <td
                                        className={cn('py-1.5 font-medium', isBuy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}
                                        title={getInsiderTypeDescription(t.transactionType) || undefined}
                                      >
                                        {getInsiderTypeLabel(t.transactionType)}
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
                        {/* Totals */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="text-sm">
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
                        </div>
                      </div>

                      {/* Buy vs Sell Bar Chart */}
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Buy vs Sell by Period</h3>
                        <p className="text-[10px] text-muted-foreground mb-3">Transaction values per time window</p>
                        
                        {/* Legend */}
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                            <span className="text-xs text-muted-foreground">Buys</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-rose-500" />
                            <span className="text-xs text-muted-foreground">Sells</span>
                          </div>
                        </div>
                        
                        <div style={{ width: '100%', height: 220 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartData}
                              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                              barCategoryGap="20%"
                            >
                              <XAxis 
                                dataKey="period" 
                                tick={{ fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis 
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => {
                                  if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
                                  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
                                  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
                                  return `$${value}`;
                                }}
                                axisLine={false}
                                tickLine={false}
                                width={50}
                              />
                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (!active || !payload?.length) return null;
                                  const data = payload[0]?.payload;
                                  return (
                                    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
                                      <div className="font-medium mb-1">{label}</div>
                                      <div className="text-emerald-600 dark:text-emerald-400">
                                        Buys: {formatCompactValue(data.buy)} ({data.buyCount} txn{data.buyCount !== 1 ? 's' : ''})
                                      </div>
                                      <div className="text-rose-600 dark:text-rose-400">
                                        Sells: {formatCompactValue(data.sell)} ({data.sellCount} txn{data.sellCount !== 1 ? 's' : ''})
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                              <Bar dataKey="buy" fill="#10b981" radius={[4, 4, 0, 0]} name="Buys" />
                              <Bar dataKey="sell" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Sells" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
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

        {/* Insider transaction types explanation dialog */}
        <Dialog open={showInsiderTypesHelp} onOpenChange={setShowInsiderTypesHelp}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Insider transaction types
              </DialogTitle>
              <DialogDescription>
                SEC Form 4 uses these codes to classify insider transactions. Hover over a type in the table to see its meaning.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Acquisitions (buys)</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  {INSIDER_TRANSACTION_TYPES.filter((t) => t.category === 'buy').map((t) => (
                    <li key={t.code}>
                      <span className="font-medium text-foreground">
                        {t.code.length === 1 ? `${t.code} – ${t.name}` : t.name}
                      </span>
                      {' — '}{t.description}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Dispositions (sells)</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  {INSIDER_TRANSACTION_TYPES.filter((t) => t.category === 'sell').map((t) => (
                    <li key={t.code}>
                      <span className="font-medium text-foreground">
                        {t.code.length === 1 ? `${t.code} – ${t.name}` : t.name}
                      </span>
                      {' — '}{t.description}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Other</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  {INSIDER_TRANSACTION_TYPES.filter((t) => t.category === 'other').map((t) => (
                    <li key={t.code}>
                      <span className="font-medium text-foreground">
                        {t.code.length === 1 ? `${t.code} – ${t.name}` : t.name}
                      </span>
                      {' — '}{t.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* SEC Filings */}
        <div className="mb-8">
          <SECFilings symbol={symbol} />
        </div>

        {/* Stock News */}
        <div className="mb-8">
          <StockNews symbol={symbol} companyName={stockData.name} limit={6} />
        </div>

        {/* Detailed Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-6">
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
              <h3 className="text-lg font-semibold mb-6">
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
          <p>Prices are delayed and for informational purposes only</p>
        </footer>
      </div>
    </div>
  );
}

