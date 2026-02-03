'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';

interface SectorPEData {
  symbol: string;
  companyName: string | null;
  sector: string;
  industry: string | null;
  stockPE: number | null;
  sectorPE: number | null;
  premium: number | null;
  premiumPercent: number | null;
  isAboveAverage: boolean | null;
  allSectors: Array<{ sector: string; pe: number }>;
  type: 'pe-comparison';
  timestamp: number;
}

interface HistoricalPEData {
  date: string;
  pe: number | null;
}

interface SectorPerformanceProps {
  symbol: string;
  stockPE?: number | null; // Can be passed from parent if already fetched
}

export default function SectorPerformance({ symbol, stockPE: propStockPE }: SectorPerformanceProps) {
  const [data, setData] = useState<SectorPEData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalPEData[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [showAllSectors, setShowAllSectors] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    setLoading(true);
    fetch(`/api/sector-performance?type=pe-comparison&symbol=${symbol}`)
      .then((res) => res.json())
      .then((result) => {
        console.log('SectorPerformance API response:', result);
        if (!result.error) {
          // Use propStockPE if stockPE not returned by API
          if (propStockPE !== undefined && (result.stockPE === null || result.stockPE === undefined)) {
            result.stockPE = propStockPE;
            // Recalculate comparison if we have both values now
            if (result.stockPE !== null && result.sectorPE !== null && result.sectorPE > 0) {
              result.premium = result.stockPE - result.sectorPE;
              result.premiumPercent = ((result.stockPE - result.sectorPE) / result.sectorPE) * 100;
              result.isAboveAverage = result.stockPE > result.sectorPE;
            }
          }
          setData(result);
        } else {
          console.log('SectorPerformance API error:', result.error);
          setData(null);
        }
      })
      .catch((err) => {
        console.error('SectorPerformance fetch error:', err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [symbol, propStockPE]);

  const fetchHistoricalData = async () => {
    if (!data?.sector || historicalData.length > 0) return;
    
    setHistoricalLoading(true);
    try {
      const response = await fetch(
        `/api/sector-performance?type=historical-pe&symbol=${symbol}&sector=${encodeURIComponent(data.sector)}`
      );
      const result = await response.json();
      
      if (!result.error && result.data) {
        setHistoricalData(result.data.slice(0, 180)); // Last 6 months
      }
    } catch {
      // Silently fail
    } finally {
      setHistoricalLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) {
      fetchHistoricalData();
    }
    setShowHistory(!showHistory);
  };

  const formatPE = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(1);
  };

  const formatPercent = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render if no data at all, or if we got an error, or if there's no sector
  if (!data) {
    console.log('SectorPerformance: No data returned, not rendering');
    return null;
  }
  
  if (!data.sector) {
    console.log('SectorPerformance: No sector found for symbol', { symbol, data });
    // Sector data not available - don't render anything
    return null;
  }
  
  // Use propStockPE as fallback for display
  const displayStockPE = data.stockPE ?? propStockPE ?? null;
  
  // If we have sector info but no PE data at all, show a simplified card
  if (displayStockPE === null && data.sectorPE === null) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Sector Information</h2>
              <p className="text-sm text-muted-foreground">{symbol} is in the {data.sector} sector</p>
            </div>
          </div>
          {data.industry && (
            <p className="text-sm text-muted-foreground">Industry: {data.industry}</p>
          )}
        </CardContent>
      </Card>
    );
  }
  
  const stockPE = displayStockPE;
  const sectorPE = data.sectorPE;
  const hasComparison = stockPE !== null && sectorPE !== null;
  
  // Recalculate comparison values if we're using propStockPE
  let premiumPercent = data.premiumPercent;
  let isAbove = data.isAboveAverage === true;
  let isBelow = data.isAboveAverage === false;
  
  if (hasComparison && sectorPE > 0) {
    premiumPercent = ((stockPE - sectorPE) / sectorPE) * 100;
    isAbove = stockPE > sectorPE;
    isBelow = stockPE < sectorPE;
  }

  // Find where stock ranks among all sectors by PE
  const stockRankData = stockPE !== null && data.allSectors
    ? [...data.allSectors, { sector: `${symbol} (Stock)`, pe: stockPE }]
        .sort((a, b) => (b.pe || 0) - (a.pe || 0))
    : data.allSectors || [];

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">P/E vs Sector Average</h2>
              <p className="text-sm text-muted-foreground">
                {data.sector} sector valuation comparison
              </p>
            </div>
          </div>
          {data.industry && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              {data.industry}
            </span>
          )}
        </div>

        {/* Main Comparison Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Stock P/E */}
          <div className={cn(
            "flex flex-col items-center justify-center p-4 rounded-xl border",
            isAbove 
              ? "bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20"
              : isBelow
                ? "bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20"
                : "bg-muted/50 border-border"
          )}>
            <span className="text-sm font-medium text-muted-foreground mb-1">{symbol} P/E</span>
            <span className={cn(
              "text-3xl font-bold",
              isAbove && "text-amber-600 dark:text-amber-400",
              isBelow && "text-emerald-600 dark:text-emerald-400"
            )}>
              {formatPE(stockPE)}
            </span>
          </div>

          {/* Sector Average P/E */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50 border border-border">
            <span className="text-sm font-medium text-muted-foreground mb-1">{data.sector} Avg</span>
            <span className="text-3xl font-bold">
              {formatPE(sectorPE)}
            </span>
          </div>

          {/* Premium/Discount */}
          <div className={cn(
            "flex flex-col items-center justify-center p-4 rounded-xl border",
            isAbove 
              ? "bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20"
              : isBelow
                ? "bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20"
                : "bg-muted/50 border-border"
          )}>
            <div className="flex items-center gap-2 mb-1">
              {isAbove ? (
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : isBelow ? (
                <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {isAbove ? 'Premium' : isBelow ? 'Discount' : 'Difference'}
              </span>
            </div>
            <span className={cn(
              "text-3xl font-bold",
              isAbove && "text-amber-600 dark:text-amber-400",
              isBelow && "text-emerald-600 dark:text-emerald-400"
            )}>
              {formatPercent(premiumPercent)}
            </span>
          </div>
        </div>

        {/* Visual Comparison Bar */}
        {hasComparison && (
          <div className="mb-6">
            <div className="flex items-end gap-4 justify-center h-32">
              {/* Stock PE Bar */}
              <div className="flex flex-col items-center">
                <div 
                  className={cn(
                    "w-16 rounded-t-lg transition-all",
                    isAbove 
                      ? "bg-gradient-to-t from-amber-500 to-amber-400"
                      : "bg-gradient-to-t from-emerald-500 to-emerald-400"
                  )}
                  style={{ 
                    height: `${Math.min(100, Math.max(20, (stockPE! / Math.max(stockPE!, sectorPE!) * 100)))}%` 
                  }}
                />
                <span className="text-xs font-medium mt-2">{symbol}</span>
                <span className="text-xs text-muted-foreground">{formatPE(stockPE)}</span>
              </div>

              {/* Sector PE Bar */}
              <div className="flex flex-col items-center">
                <div 
                  className="w-16 rounded-t-lg bg-gradient-to-t from-slate-500 to-slate-400"
                  style={{ 
                    height: `${Math.min(100, Math.max(20, (sectorPE! / Math.max(stockPE!, sectorPE!) * 100)))}%` 
                  }}
                />
                <span className="text-xs font-medium mt-2">Sector</span>
                <span className="text-xs text-muted-foreground">{formatPE(sectorPE)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Badge */}
        {hasComparison && (
          <div className="flex items-center justify-center mb-6">
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              isAbove 
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                : isBelow
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  : "bg-muted text-muted-foreground border border-border"
            )}>
              {isAbove ? (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Trading at a {formatPercent(Math.abs(premiumPercent ?? 0))} premium to sector
                </>
              ) : isBelow ? (
                <>
                  <TrendingDown className="w-4 h-4" />
                  Trading at a {formatPercent(Math.abs(premiumPercent ?? 0))} discount to sector
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4" />
                  Trading near sector average
                </>
              )}
            </div>
          </div>
        )}

        {/* Historical Sector P/E Toggle */}
        <button
          onClick={toggleHistory}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors mb-4"
        >
          <span className="text-sm font-medium">Historical Sector P/E</span>
          {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Historical Chart */}
        {showHistory && (
          <div className="mb-6">
            {historicalLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : historicalData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={[...historicalData].reverse()}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="sectorPEGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tickFormatter={(v) => v.toFixed(0)}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                      domain={['auto', 'auto']}
                    />
                    {stockPE !== null && (
                      <ReferenceLine 
                        y={stockPE} 
                        stroke={isAbove ? "#f59e0b" : "#10b981"} 
                        strokeDasharray="5 5"
                        label={{ 
                          value: `${symbol}: ${formatPE(stockPE)}`, 
                          position: 'right',
                          fontSize: 10,
                          fill: isAbove ? "#f59e0b" : "#10b981"
                        }}
                      />
                    )}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as HistoricalPEData;
                        return (
                          <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-3 py-2 text-xs">
                            <div className="text-muted-foreground">
                              {new Date(d.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="font-bold">
                              Sector P/E: {formatPE(d.pe)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pe" 
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#sectorPEGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Dashed line shows {symbol}&apos;s current P/E ({formatPE(stockPE)})
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Historical P/E data not available for this sector.
              </p>
            )}
          </div>
        )}

        {/* All Sectors Comparison */}
        {stockRankData.length > 0 && (
          <>
            <button
              onClick={() => setShowAllSectors(!showAllSectors)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm font-medium">Compare All Sectors</span>
              {showAllSectors ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {showAllSectors && (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={stockRankData.slice(0, 12)} 
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <XAxis 
                      type="number" 
                      tickFormatter={(v) => v.toFixed(0)}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="sector" 
                      width={120}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-3 py-2 text-sm">
                            <div className="font-medium">{d.sector}</div>
                            <div className="text-muted-foreground">P/E: {formatPE(d.pe)}</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="pe" radius={[0, 4, 4, 0]}>
                      {stockRankData.slice(0, 12).map((entry, index) => (
                        <Cell 
                          key={index} 
                          fill={entry.sector.includes('(Stock)') 
                            ? (isAbove ? '#f59e0b' : '#10b981')
                            : entry.sector === data.sector 
                              ? '#6366f1'
                              : 'hsl(var(--muted-foreground))'
                          }
                          fillOpacity={entry.sector.includes('(Stock)') || entry.sector === data.sector ? 1 : 0.4}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            P/E ratios compared against {data.sector} sector average. 
            Lower P/E may indicate undervaluation; higher P/E may reflect growth expectations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
