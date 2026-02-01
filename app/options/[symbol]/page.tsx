'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';
import { 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Activity,
  DollarSign,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionContract {
  symbol: string;
  underlying: string;
  expiration: string;
  strike: number;
  type: 'call' | 'put';
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  inTheMoney: boolean;
  change: number;
  changePercent: number;
}

interface OptionsData {
  symbol: string;
  underlyingPrice: number;
  expirationDates: string[];
  calls: OptionContract[];
  puts: OptionContract[];
  lastUpdated: string;
  message?: string;
}

type SortField = 'strike' | 'lastPrice' | 'volume' | 'openInterest' | 'impliedVolatility' | 'delta';
type SortDirection = 'asc' | 'desc';

export default function OptionsPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const [data, setData] = useState<OptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'calls' | 'puts' | 'both'>('both');
  const [sortField, setSortField] = useState<SortField>('strike');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showITMOnly, setShowITMOnly] = useState(false);

  useEffect(() => {
    fetchOptionsData();
  }, [symbol]);

  const fetchOptionsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/options-chain?symbol=${symbol}`);
      const result = await response.json();

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result);
        // Select first expiration date if available
        if (result.expirationDates?.length > 0 && !selectedExpiration) {
          setSelectedExpiration(result.expirationDates[0]);
        }
      }
    } catch (err) {
      setError('Failed to fetch options data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3" /> 
      : <ArrowDown className="h-3 w-3" />;
  };

  // Filter and sort options
  const filteredCalls = useMemo(() => {
    if (!data) return [];
    let filtered = data.calls.filter(c => !selectedExpiration || c.expiration === selectedExpiration);
    if (showITMOnly) filtered = filtered.filter(c => c.inTheMoney);
    return filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, selectedExpiration, sortField, sortDirection, showITMOnly]);

  const filteredPuts = useMemo(() => {
    if (!data) return [];
    let filtered = data.puts.filter(p => !selectedExpiration || p.expiration === selectedExpiration);
    if (showITMOnly) filtered = filtered.filter(p => p.inTheMoney);
    return filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, selectedExpiration, sortField, sortDirection, showITMOnly]);

  const formatNumber = (num: number, decimals = 2) => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatPercent = (num: number) => {
    if (num === null || num === undefined) return '-';
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatVolume = (num: number) => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatExpiration = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysToExpiration = (dateStr: string) => {
    const expDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = expDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const OptionsTable = ({ contracts, type }: { contracts: OptionContract[], type: 'call' | 'put' }) => {
    const isCall = type === 'call';
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">
                <button onClick={() => handleSort('strike')} className="flex items-center gap-1 hover:text-primary">
                  Strike <SortIcon field="strike" />
                </button>
              </th>
              <th className="text-right p-2 font-medium">
                <button onClick={() => handleSort('lastPrice')} className="flex items-center gap-1 hover:text-primary ml-auto">
                  Last <SortIcon field="lastPrice" />
                </button>
              </th>
              <th className="text-right p-2 font-medium">Change</th>
              <th className="text-right p-2 font-medium">Bid</th>
              <th className="text-right p-2 font-medium">Ask</th>
              <th className="text-right p-2 font-medium">
                <button onClick={() => handleSort('volume')} className="flex items-center gap-1 hover:text-primary ml-auto">
                  Vol <SortIcon field="volume" />
                </button>
              </th>
              <th className="text-right p-2 font-medium">
                <button onClick={() => handleSort('openInterest')} className="flex items-center gap-1 hover:text-primary ml-auto">
                  OI <SortIcon field="openInterest" />
                </button>
              </th>
              <th className="text-right p-2 font-medium">
                <button onClick={() => handleSort('impliedVolatility')} className="flex items-center gap-1 hover:text-primary ml-auto">
                  IV <SortIcon field="impliedVolatility" />
                </button>
              </th>
              <th className="text-right p-2 font-medium">
                <button onClick={() => handleSort('delta')} className="flex items-center gap-1 hover:text-primary ml-auto">
                  Delta <SortIcon field="delta" />
                </button>
              </th>
              <th className="text-right p-2 font-medium">Gamma</th>
              <th className="text-right p-2 font-medium">Theta</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-muted-foreground">
                  No {type}s available for this expiration
                </td>
              </tr>
            ) : (
              contracts.map((contract, index) => {
                const isITM = contract.inTheMoney;
                const changePositive = contract.change >= 0;
                
                return (
                  <tr 
                    key={contract.symbol || index}
                    className={cn(
                      "border-t border-border hover:bg-muted/50 transition-colors",
                      isITM && (isCall ? "bg-green-500/5" : "bg-red-500/5")
                    )}
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-semibold",
                          isITM && (isCall ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                        )}>
                          ${formatNumber(contract.strike, 2)}
                        </span>
                        {isITM && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            isCall 
                              ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                              : "bg-red-500/20 text-red-600 dark:text-red-400"
                          )}>
                            ITM
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right font-medium">${formatNumber(contract.lastPrice, 2)}</td>
                    <td className={cn(
                      "p-2 text-right",
                      changePositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {changePositive ? '+' : ''}{formatNumber(contract.change, 2)}
                    </td>
                    <td className="p-2 text-right text-muted-foreground">${formatNumber(contract.bid, 2)}</td>
                    <td className="p-2 text-right text-muted-foreground">${formatNumber(contract.ask, 2)}</td>
                    <td className="p-2 text-right">{formatVolume(contract.volume)}</td>
                    <td className="p-2 text-right">{formatVolume(contract.openInterest)}</td>
                    <td className="p-2 text-right">
                      <span className={cn(
                        contract.impliedVolatility > 0.5 && "text-amber-500 font-medium"
                      )}>
                        {formatPercent(contract.impliedVolatility)}
                      </span>
                    </td>
                    <td className="p-2 text-right">{formatNumber(contract.delta, 3)}</td>
                    <td className="p-2 text-right text-muted-foreground">{formatNumber(contract.gamma, 4)}</td>
                    <td className="p-2 text-right text-muted-foreground">{formatNumber(contract.theta, 4)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-[1800px]">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link 
                href={`/stock/${symbol}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Back to {symbol}</span>
              </Link>
            </div>
            <ThemeToggle />
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-light text-foreground">{symbol} Options Chain</h1>
          </div>
          
          {data && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Underlying: <span className="font-medium text-foreground">${formatNumber(data.underlyingPrice, 2)}</span></span>
              <span>•</span>
              <span>Updated: {new Date(data.lastUpdated).toLocaleTimeString()}</span>
            </div>
          )}
        </header>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading options chain...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <p className="text-lg text-red-500 mb-2">Error loading options data</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchOptionsData}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!loading && !error && data && data.expirationDates.length === 0 && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">No options data available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {data.message || 'Options may not be available for this symbol or may require a premium FMP plan.'}
                </p>
                <Link href={`/stock/${symbol}`}>
                  <Button variant="outline">Back to Stock Page</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Options Data */}
        {!loading && !error && data && data.expirationDates.length > 0 && (
          <>
            {/* Controls */}
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Expiration Select */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Expiration:</label>
                    <select
                      value={selectedExpiration}
                      onChange={(e) => setSelectedExpiration(e.target.value)}
                      className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {data.expirationDates.map((date) => (
                        <option key={date} value={date}>
                          {formatExpiration(date)} ({getDaysToExpiration(date)} days)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type Tabs */}
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('calls')}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        activeTab === 'calls' 
                          ? "bg-green-500 text-white" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Calls ({filteredCalls.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('both')}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        activeTab === 'both' 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Both
                    </button>
                    <button
                      onClick={() => setActiveTab('puts')}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        activeTab === 'puts' 
                          ? "bg-red-500 text-white" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Puts ({filteredPuts.length})
                    </button>
                  </div>

                  {/* ITM Filter */}
                  <Button
                    variant={showITMOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowITMOnly(!showITMOnly)}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    ITM Only
                  </Button>

                  {/* Refresh */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchOptionsData}
                    disabled={loading}
                    className="gap-2 ml-auto"
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium">Call Volume</span>
                  </div>
                  <div className="text-xl font-semibold">
                    {formatVolume(filteredCalls.reduce((sum, c) => sum + c.volume, 0))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium">Put Volume</span>
                  </div>
                  <div className="text-xl font-semibold">
                    {formatVolume(filteredPuts.reduce((sum, p) => sum + p.volume, 0))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-xs font-medium">Put/Call Ratio</span>
                  </div>
                  <div className="text-xl font-semibold">
                    {(() => {
                      const callVol = filteredCalls.reduce((sum, c) => sum + c.volume, 0);
                      const putVol = filteredPuts.reduce((sum, p) => sum + p.volume, 0);
                      if (callVol === 0) return '-';
                      return (putVol / callVol).toFixed(2);
                    })()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium">Total Open Interest</span>
                  </div>
                  <div className="text-xl font-semibold">
                    {formatVolume(
                      filteredCalls.reduce((sum, c) => sum + c.openInterest, 0) +
                      filteredPuts.reduce((sum, p) => sum + p.openInterest, 0)
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Options Tables */}
            {(activeTab === 'calls' || activeTab === 'both') && (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Calls
                    <span className="text-sm font-normal text-muted-foreground">
                      ({filteredCalls.length} contracts)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <OptionsTable contracts={filteredCalls} type="call" />
                </CardContent>
              </Card>
            )}

            {(activeTab === 'puts' || activeTab === 'both') && (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Puts
                    <span className="text-sm font-normal text-muted-foreground">
                      ({filteredPuts.length} contracts)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <OptionsTable contracts={filteredPuts} type="put" />
                </CardContent>
              </Card>
            )}

            {/* Legend */}
            <Card>
              <CardContent className="py-4">
                <h3 className="text-sm font-medium mb-2">Legend</h3>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div><span className="font-medium">ITM</span> = In The Money</div>
                  <div><span className="font-medium">IV</span> = Implied Volatility</div>
                  <div><span className="font-medium">OI</span> = Open Interest</div>
                  <div><span className="font-medium">Delta</span> = Price sensitivity to underlying</div>
                  <div><span className="font-medium">Gamma</span> = Delta sensitivity</div>
                  <div><span className="font-medium">Theta</span> = Time decay</div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>Data is delayed and for informational purposes only. Not investment advice.</p>
        </footer>
      </div>
    </main>
  );
}
