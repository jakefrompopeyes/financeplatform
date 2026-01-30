'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import StockAI from './StockAI';

interface StockDetails {
  symbol: string;
  name: string;
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

interface StockDetailModalProps {
  symbol: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const timeRanges = [
  { label: '1D', value: '1day' },
  { label: '1W', value: '1week' },
  { label: '1M', value: '1month' },
  { label: '3M', value: '3month' },
  { label: '1Y', value: '1year' },
];

export default function StockDetailModal({ symbol, open, onOpenChange }: StockDetailModalProps) {
  const [stockData, setStockData] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState('1month');
  const [isAIOpen, setIsAIOpen] = useState(false);

  useEffect(() => {
    if (open && symbol) {
      fetchStockDetails();
    }
  }, [symbol, open, selectedRange]);

  const fetchStockDetails = async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stock-details?symbol=${symbol}&range=${selectedRange}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setStockData(null);
      } else {
        setStockData(data);
      }
    } catch (err) {
      setError('Failed to fetch stock details');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="py-12">
            <DialogHeader>
              <DialogTitle>Error</DialogTitle>
            </DialogHeader>
            <div className="text-center text-muted-foreground mt-4">
              <p>{error}</p>
            </div>
          </div>
        ) : stockData ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl">{stockData.symbol}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{stockData.name}</p>
                  <p className="text-xs text-muted-foreground">{stockData.exchange}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      onClick={() => setIsAIOpen(true)}
                      size="sm"
                      className="gap-2"
                      variant="outline"
                    >
                      <Sparkles className="w-4 h-4" />
                      Ask AI
                    </Button>
                  </div>
                  <div className="text-3xl font-light">
                    ${formatNumber(stockData.price)}
                  </div>
                  <div className={cn(
                    "flex items-center justify-end gap-1 text-sm mt-1",
                    isPositive ? "text-green-500" : "text-red-500"
                  )}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{isPositive ? '+' : ''}{formatNumber(stockData.change)}</span>
                    <span>({isPositive ? '+' : ''}{formatNumber(stockData.changePercent)}%)</span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* AI Assistant */}
            <StockAI 
              stockData={stockData}
              isOpen={isAIOpen}
              onClose={() => setIsAIOpen(false)}
            />

            {/* Time Range Selector */}
            <div className="flex gap-2 justify-center my-4">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedRange(range.value)}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    selectedRange === range.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Chart */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stockData.historical}>
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
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        if (selectedRange === '1day') {
                          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        }
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Price']}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        });
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="close" 
                      stroke={isPositive ? "#10b981" : "#ef4444"} 
                      strokeWidth={2}
                      fill="url(#colorPrice)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium">Open</span>
                  </div>
                  <div className="text-xl font-light">${formatNumber(stockData.open)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-medium">High</span>
                  </div>
                  <div className="text-xl font-light">${formatNumber(stockData.high)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-xs font-medium">Low</span>
                  </div>
                  <div className="text-xl font-light">${formatNumber(stockData.low)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-medium">Prev Close</span>
                  </div>
                  <div className="text-xl font-light">${formatNumber(stockData.previousClose)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium mb-4">Trading Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Volume</span>
                      <span className="text-sm font-medium">{formatVolume(stockData.volume)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Volume</span>
                      <span className="text-sm font-medium">{formatVolume(stockData.averageVolume)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">52W High</span>
                      <span className="text-sm font-medium">${formatNumber(stockData.fiftyTwoWeekHigh)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">52W Low</span>
                      <span className="text-sm font-medium">${formatNumber(stockData.fiftyTwoWeekLow)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium mb-4">Company Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Market Cap</span>
                      <span className="text-sm font-medium">{formatLargeNumber(stockData.marketCap)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">P/E Ratio</span>
                      <span className="text-sm font-medium">{stockData.pe ? formatNumber(stockData.pe) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">EPS</span>
                      <span className="text-sm font-medium">{stockData.eps ? `$${formatNumber(stockData.eps)}` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Currency</span>
                      <span className="text-sm font-medium">{stockData.currency}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

