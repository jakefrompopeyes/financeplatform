'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, ArrowLeft, ExternalLink, Coins, TrendingUp as TrendingUpIcon, ChevronDown, Newspaper, Link2, Share2, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import TradingViewWidget, { AVAILABLE_INDICATORS, IndicatorId } from '@/components/TradingViewWidget';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface CryptoDetails {
  id: string;
  symbol: string;
  name: string;
  image: string;
  description: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  fullyDilutedValuation: number | null;
  totalVolume: number;
  high24h: number | null;
  low24h: number | null;
  priceChangePercentage7d: number | null;
  priceChangePercentage30d: number | null;
  priceChangePercentage1y: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number | null;
  athDate: string | null;
  athChangePercentage: number | null;
  atl: number | null;
  atlDate: string | null;
  atlChangePercentage: number | null;
  historical1d: { date: string; price: number }[];
  historical7d: { date: string; price: number }[];
  historical30d: { date: string; price: number }[];
  historical1y: { date: string; price: number }[];
  timestamp: number;
  marketCapRank?: number | null;
  links?: {
    homepage: string[];
    blockchainSite: string[];
    subredditUrl: string | null;
    twitterScreenName: string | null;
    reposUrl: string[];
  };
  communityData?: {
    twitterFollowers: number | null;
    redditSubscribers: number | null;
    redditAccountsActive48h: number | null;
  };
  genesisDate?: string | null;
  categories?: string[];
}

interface FearGreedData {
  current: { value: number; rating: string };
}

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}

const RELATED_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
];

const timeRanges = [
  { label: '1D', value: '1D', dataKey: 'historical1d' },
  { label: '1W', value: '1W', dataKey: 'historical7d' },
  { label: '1M', value: '1M', dataKey: 'historical30d' },
  { label: '1Y', value: '1Y', dataKey: 'historical1y' },
];

export default function CryptoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const cryptoId = params.id.toLowerCase();
  const [cryptoData, setCryptoData] = useState<CryptoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState('1W');
  const [selectedChart, setSelectedChart] = useState<'tradingview' | 'custom'>('tradingview');
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorId[]>([]);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);

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

  const fetchCryptoDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/crypto-details?id=${cryptoId}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setCryptoData(null);
      } else {
        setCryptoData(data);
      }
    } catch (err) {
      setError('Failed to fetch crypto details. Please try again later.');
      setCryptoData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptoDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoId]);

  useEffect(() => {
    fetch('/api/fear-greed-index')
      .then((r) => r.json())
      .then((d) => (d.current ? setFearGreed({ current: d.current }) : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cryptoData?.symbol) return;
    fetch(`/api/financial-news?symbol=${cryptoData.symbol}&limit=5`)
      .then((r) => r.json())
      .then((d) => setNews(d.articles || []))
      .catch(() => setNews([]));
  }, [cryptoData?.symbol]);

  useEffect(() => {
    // Add to recently viewed after data loads
    if (cryptoData) {
      const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const filtered = recentlyViewed.filter((item: any) => 
        !(item.symbol === cryptoData.symbol && item.id === cryptoData.id)
      );
      const updated = [
        { 
          symbol: cryptoData.symbol, 
          id: cryptoData.id,
          type: 'crypto',
          viewedAt: Date.now() 
        },
        ...filtered
      ].slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    }
  }, [cryptoData]);

  const formatNumber = (num: number | null, decimals = 2) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatLargeNumber = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toLocaleString()}`;
  };

  const formatSupply = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isPositive = cryptoData ? cryptoData.priceChangePercentage24h >= 0 : false;
  const selectedRangeData = timeRanges.find(r => r.value === selectedRange);
  const chartData = selectedRangeData && cryptoData 
    ? (cryptoData as any)[selectedRangeData.dataKey].map((item: { date: string; price: number }) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: item.price,
      }))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !cryptoData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-[1400px]">
          <Link href="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Card className="p-12 text-center">
            <h2 className="text-2xl font-semibold mb-4">Error Loading Cryptocurrency</h2>
            <p className="text-muted-foreground">{error || 'Failed to load crypto data'}</p>
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

          {/* Crypto Title and Price */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              {cryptoData.image && (
                <img 
                  src={cryptoData.image} 
                  alt={cryptoData.name}
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-4xl font-light">{cryptoData.symbol}</h1>
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                    CRYPTO
                  </span>
                  {cryptoData.marketCapRank != null && (
                    <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
                      Rank #{cryptoData.marketCapRank}
                    </span>
                  )}
                </div>
                <p className="text-xl text-muted-foreground mb-1">{cryptoData.name}</p>
              </div>
            </div>

            <div className="text-left lg:text-right">
              <div className="text-5xl font-light mb-2">
                ${formatNumber(cryptoData.currentPrice)}
              </div>
              <div className={cn(
                "flex items-center gap-2 text-lg",
                isPositive ? "text-green-500" : "text-red-500"
              )}>
                {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <span>{isPositive ? '+' : ''}{formatNumber(cryptoData.priceChange24h)}</span>
                <span>({isPositive ? '+' : ''}{formatNumber(cryptoData.priceChangePercentage24h)}%)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                As of {new Date(cryptoData.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" asChild>
              <a 
                href={`https://www.coingecko.com/en/coins/${cryptoData.id}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View on CoinGecko
              </a>
            </Button>
          </div>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Price Chart</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedChart('tradingview')}
              className={cn(
                "px-4 py-1 rounded-md text-xs font-medium transition-colors",
                selectedChart === 'tradingview'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              TradingView
            </button>
            <button
              onClick={() => setSelectedChart('custom')}
              className={cn(
                "px-4 py-1 rounded-md text-xs font-medium transition-colors",
                selectedChart === 'custom'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Custom Chart
            </button>
          </div>
        </div>

        {/* TradingView Chart */}
        {selectedChart === 'tradingview' && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
                        <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
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
                  symbol={`BINANCE:${cryptoData.symbol}USDT`}
                  interval={selectedRange === '1D' ? '5' : selectedRange === '1W' ? '15' : 'D'}
                  range={selectedRange === '1D' ? '1D' : selectedRange === '1W' ? '1W' : selectedRange === '1M' ? '1M' : '12M'}
                  indicators={selectedIndicators}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Chart */}
        {selectedChart === 'custom' && chartData.length > 0 && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
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
              <div className="w-full" style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={isPositive ? "#10b981" : "#ef4444"} 
                      fillOpacity={1} 
                      fill="url(#colorPrice)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUpIcon className="w-4 h-4" />
                <span className="text-xs font-medium">24h High</span>
              </div>
              <div className="text-2xl font-light">${formatNumber(cryptoData.high24h)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">24h Low</span>
              </div>
              <div className="text-2xl font-light">${formatNumber(cryptoData.low24h)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium">Market Cap</span>
              </div>
              <div className="text-2xl font-light">{formatLargeNumber(cryptoData.marketCap)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-medium">24h Volume</span>
              </div>
              <div className="text-2xl font-light">{formatLargeNumber(cryptoData.totalVolume)}</div>
            </CardContent>
          </Card>

          {cryptoData.marketCap > 0 && cryptoData.totalVolume > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Gauge className="w-4 h-4" />
                  <span className="text-xs font-medium">Vol / Market Cap</span>
                </div>
                <div className="text-2xl font-light">
                  {((cryptoData.totalVolume / cryptoData.marketCap) * 100).toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">24h liquidity ratio</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Fear & Greed + Related in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {fearGreed && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Gauge className="w-5 h-5" />
                  Crypto Fear & Greed Index
                </h3>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold",
                      fearGreed.current.value <= 25 && "bg-red-500/20 text-red-500",
                      fearGreed.current.value > 25 && fearGreed.current.value <= 45 && "bg-orange-500/20 text-orange-500",
                      fearGreed.current.value > 45 && fearGreed.current.value <= 55 && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                      fearGreed.current.value > 55 && fearGreed.current.value <= 75 && "bg-lime-500/20 text-lime-600 dark:text-lime-400",
                      fearGreed.current.value > 75 && "bg-green-500/20 text-green-500"
                    )}
                  >
                    {fearGreed.current.value}
                  </div>
                  <div>
                    <p className="font-medium">{fearGreed.current.rating}</p>
                    <p className="text-sm text-muted-foreground">Market sentiment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Explore more coins
              </h3>
              <div className="flex flex-wrap gap-2">
                {RELATED_COINS.filter((c) => c.id !== cryptoData.id).slice(0, 4).map((coin) => (
                  <Link
                    key={coin.id}
                    href={`/crypto/${coin.id}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm transition-colors"
                  >
                    <span className="font-medium">{coin.symbol}</span>
                    <span className="text-muted-foreground hidden sm:inline">{coin.name}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Market Information
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Market Cap</span>
                  <span className="text-sm font-medium">{formatLargeNumber(cryptoData.marketCap)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">24h Volume</span>
                  <span className="text-sm font-medium">{formatLargeNumber(cryptoData.totalVolume)}</span>
                </div>
                {cryptoData.fullyDilutedValuation && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Fully Diluted Valuation</span>
                    <span className="text-sm font-medium">{formatLargeNumber(cryptoData.fullyDilutedValuation)}</span>
                  </div>
                )}
                {cryptoData.priceChangePercentage7d !== null && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">7d Change</span>
                    <span className={cn(
                      "text-sm font-medium",
                      cryptoData.priceChangePercentage7d >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {cryptoData.priceChangePercentage7d >= 0 ? '+' : ''}{formatNumber(cryptoData.priceChangePercentage7d)}%
                    </span>
                  </div>
                )}
                {cryptoData.priceChangePercentage30d !== null && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">30d Change</span>
                    <span className={cn(
                      "text-sm font-medium",
                      cryptoData.priceChangePercentage30d >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {cryptoData.priceChangePercentage30d >= 0 ? '+' : ''}{formatNumber(cryptoData.priceChangePercentage30d)}%
                    </span>
                  </div>
                )}
                {cryptoData.priceChangePercentage1y !== null && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">1y Change</span>
                    <span className={cn(
                      "text-sm font-medium",
                      cryptoData.priceChangePercentage1y >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {cryptoData.priceChangePercentage1y >= 0 ? '+' : ''}{formatNumber(cryptoData.priceChangePercentage1y)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Supply & All-Time Stats
              </h3>
              <div className="space-y-4">
                {cryptoData.circulatingSupply && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Circulating Supply</span>
                    <span className="text-sm font-medium">{formatSupply(cryptoData.circulatingSupply)} {cryptoData.symbol}</span>
                  </div>
                )}
                {cryptoData.totalSupply && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Total Supply</span>
                    <span className="text-sm font-medium">{formatSupply(cryptoData.totalSupply)} {cryptoData.symbol}</span>
                  </div>
                )}
                {cryptoData.maxSupply && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Max Supply</span>
                    <span className="text-sm font-medium">{formatSupply(cryptoData.maxSupply)} {cryptoData.symbol}</span>
                  </div>
                )}
                {cryptoData.ath && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">All-Time High</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">${formatNumber(cryptoData.ath)}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(cryptoData.athDate)}</div>
                    </div>
                  </div>
                )}
                {cryptoData.athChangePercentage !== null && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">From ATH</span>
                    <span className={cn(
                      "text-sm font-medium",
                      cryptoData.athChangePercentage >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {cryptoData.athChangePercentage >= 0 ? '+' : ''}{formatNumber(cryptoData.athChangePercentage)}%
                    </span>
                  </div>
                )}
                {cryptoData.atl && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">All-Time Low</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">${formatNumber(cryptoData.atl)}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(cryptoData.atlDate)}</div>
                    </div>
                  </div>
                )}
                {cryptoData.atlChangePercentage !== null && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">From ATL</span>
                    <span className={cn(
                      "text-sm font-medium",
                      cryptoData.atlChangePercentage >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {cryptoData.atlChangePercentage >= 0 ? '+' : ''}{formatNumber(cryptoData.atlChangePercentage)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Links & Community */}
        {(cryptoData.links || cryptoData.communityData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {cryptoData.links && (cryptoData.links.homepage?.length > 0 || cryptoData.links.blockchainSite?.length > 0 || cryptoData.links.subredditUrl || cryptoData.links.twitterScreenName) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Link2 className="w-5 h-5" />
                    Links
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {cryptoData.links.homepage?.filter(Boolean).slice(0, 2).map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-sm transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Homepage
                      </a>
                    ))}
                    {cryptoData.links.blockchainSite?.filter(Boolean).slice(0, 1).map((url, i) => (
                      <a
                        key={`block-${i}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-sm transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Block Explorer
                      </a>
                    ))}
                    {cryptoData.links.subredditUrl && (
                      <a
                        href={cryptoData.links.subredditUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-sm transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Reddit
                      </a>
                    )}
                    {cryptoData.links.twitterScreenName && (
                      <a
                        href={`https://twitter.com/${cryptoData.links.twitterScreenName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-sm transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Twitter
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            {cryptoData.communityData && (cryptoData.communityData.twitterFollowers != null || cryptoData.communityData.redditSubscribers != null) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Community</h3>
                  <div className="space-y-2 text-sm">
                    {cryptoData.communityData.twitterFollowers != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Twitter followers</span>
                        <span className="font-medium">{cryptoData.communityData.twitterFollowers.toLocaleString()}</span>
                      </div>
                    )}
                    {cryptoData.communityData.redditSubscribers != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reddit subscribers</span>
                        <span className="font-medium">{cryptoData.communityData.redditSubscribers.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* News */}
        {news.length > 0 && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Newspaper className="w-5 h-5" />
                News for {cryptoData.symbol}
              </h3>
              <ul className="space-y-3">
                {news.slice(0, 5).map((article, i) => (
                  <li key={i}>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <span className="font-medium group-hover:text-primary">{article.title}</span>
                      {article.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.description}</p>
                      )}
                      <span className="text-xs text-muted-foreground mt-1 block">{article.source?.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {cryptoData.description && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">About {cryptoData.name}</h3>
              <div 
                className="text-sm text-muted-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: cryptoData.description.slice(0, 500) + '...' }}
              />
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>Prices are delayed and for informational purposes only</p>
        </footer>
      </div>
    </div>
  );
}
