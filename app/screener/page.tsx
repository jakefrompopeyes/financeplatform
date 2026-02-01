'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  TrendingUp,
  Building2,
  DollarSign,
  BarChart3,
  Percent,
  RefreshCw,
  ChevronLeft,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stock {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  marketCap: number;
  price: number;
  beta: number;
  volume: number;
  lastAnnualDividend: number;
  exchange: string;
  country: string;
  image: string;
}

interface ScreenerData {
  stocks: Stock[];
  count: number;
  filters: {
    sectors: string[];
    exchanges: string[];
  };
  lastUpdated: string;
}

interface Filters {
  marketCapMin: string;
  marketCapMax: string;
  priceMin: string;
  priceMax: string;
  volumeMin: string;
  betaMin: string;
  betaMax: string;
  dividendMin: string;
  dividendMax: string;
  sector: string;
  exchange: string;
}

type SortField = 'symbol' | 'companyName' | 'marketCap' | 'price' | 'beta' | 'volume' | 'lastAnnualDividend';
type SortDirection = 'asc' | 'desc';

const MARKET_CAP_PRESETS = [
  { label: 'Mega Cap', min: '200000000000', max: '', description: '$200B+' },
  { label: 'Large Cap', min: '10000000000', max: '200000000000', description: '$10B - $200B' },
  { label: 'Mid Cap', min: '2000000000', max: '10000000000', description: '$2B - $10B' },
  { label: 'Small Cap', min: '300000000', max: '2000000000', description: '$300M - $2B' },
  { label: 'Micro Cap', min: '50000000', max: '300000000', description: '$50M - $300M' },
];

const DEFAULT_FILTERS: Filters = {
  marketCapMin: '1000000000', // $1B minimum by default
  marketCapMax: '',
  priceMin: '5',
  priceMax: '',
  volumeMin: '100000',
  betaMin: '',
  betaMax: '',
  dividendMin: '',
  dividendMax: '',
  sector: '',
  exchange: '',
};

export default function ScreenerPage() {
  const [data, setData] = useState<ScreenerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(true);

  const fetchData = useCallback(async (filterParams: Filters) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filterParams.marketCapMin) params.append('marketCapMin', filterParams.marketCapMin);
      if (filterParams.marketCapMax) params.append('marketCapMax', filterParams.marketCapMax);
      if (filterParams.priceMin) params.append('priceMin', filterParams.priceMin);
      if (filterParams.priceMax) params.append('priceMax', filterParams.priceMax);
      if (filterParams.volumeMin) params.append('volumeMin', filterParams.volumeMin);
      if (filterParams.betaMin) params.append('betaMin', filterParams.betaMin);
      if (filterParams.betaMax) params.append('betaMax', filterParams.betaMax);
      if (filterParams.dividendMin) params.append('dividendMin', filterParams.dividendMin);
      if (filterParams.dividendMax) params.append('dividendMax', filterParams.dividendMax);
      if (filterParams.sector) params.append('sector', filterParams.sector);
      if (filterParams.exchange) params.append('exchange', filterParams.exchange);
      params.append('limit', '100');

      const response = await fetch(`/api/stock-screener?${params.toString()}`);
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      setError('Failed to fetch screener data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(appliedFilters);
  }, [fetchData, appliedFilters]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const applyMarketCapPreset = (preset: typeof MARKET_CAP_PRESETS[0]) => {
    const newFilters = {
      ...filters,
      marketCapMin: preset.min,
      marketCapMax: preset.max,
    };
    setFilters(newFilters);
    setAppliedFilters(newFilters);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedStocks = data?.stocks.slice().sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal as string).toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) || [];

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  const activeFilterCount = Object.entries(appliedFilters).filter(
    ([key, value]) => value && value !== DEFAULT_FILTERS[key as keyof Filters]
  ).length;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-[1800px]">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <ThemeToggle />
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <Search className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-light text-foreground">Stock Screener</h1>
          </div>
          <p className="text-secondary">
            Filter and discover stocks based on fundamental criteria
          </p>
        </header>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className={cn(
            "w-80 flex-shrink-0 transition-all duration-300",
            showFilters ? "opacity-100" : "w-0 opacity-0 overflow-hidden"
          )}>
            <Card className="sticky top-4">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="h-5 w-5" />
                    Filters
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Market Cap Presets */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Market Cap Presets
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {MARKET_CAP_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        onClick={() => applyMarketCapPreset(preset)}
                        className={cn(
                          "text-xs",
                          filters.marketCapMin === preset.min && filters.marketCapMax === preset.max
                            ? "bg-primary text-primary-foreground"
                            : ""
                        )}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Market Cap Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Market Cap Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 1000000000"
                        value={filters.marketCapMin}
                        onChange={(e) => handleFilterChange('marketCapMin', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        type="number"
                        placeholder="No max"
                        value={filters.marketCapMax}
                        onChange={(e) => handleFilterChange('marketCapMax', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Min ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.priceMin}
                        onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max ($)</Label>
                      <Input
                        type="number"
                        placeholder="No max"
                        value={filters.priceMax}
                        onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Volume */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Min Volume
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g., 100000"
                    value={filters.volumeMin}
                    onChange={(e) => handleFilterChange('volumeMin', e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Beta Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Beta Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 0.5"
                        value={filters.betaMin}
                        onChange={(e) => handleFilterChange('betaMin', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 1.5"
                        value={filters.betaMax}
                        onChange={(e) => handleFilterChange('betaMax', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Dividend Yield */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Annual Dividend ($)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 1.00"
                        value={filters.dividendMin}
                        onChange={(e) => handleFilterChange('dividendMin', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="No max"
                        value={filters.dividendMax}
                        onChange={(e) => handleFilterChange('dividendMax', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Sector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sector</Label>
                  <select
                    value={filters.sector}
                    onChange={(e) => handleFilterChange('sector', e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">All Sectors</option>
                    {data?.filters.sectors.map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>

                {/* Exchange */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Exchange</Label>
                  <select
                    value={filters.exchange}
                    onChange={(e) => handleFilterChange('exchange', e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">All Exchanges</option>
                    {data?.filters.exchanges.map((exchange) => (
                      <option key={exchange} value={exchange}>{exchange}</option>
                    ))}
                  </select>
                </div>

                {/* Apply Button */}
                <Button 
                  onClick={applyFilters} 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Apply Filters
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                
                {activeFilterCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {data && (
                  <>
                    <span>{data.count} stocks found</span>
                    <span>•</span>
                    <span>Updated {new Date(data.lastUpdated).toLocaleTimeString()}</span>
                  </>
                )}
              </div>
            </div>

            {/* Error State */}
            {error && (
              <Card className="mb-4">
                <CardContent className="py-8">
                  <div className="text-center text-red-500">
                    <p className="text-lg mb-2">Error loading data</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {loading && (
              <Card>
                <CardContent className="py-16">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Screening stocks...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Table */}
            {!loading && !error && data && (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-medium">
                            <button
                              onClick={() => handleSort('symbol')}
                              className="flex items-center gap-2 hover:text-primary transition-colors"
                            >
                              Symbol
                              <SortIcon field="symbol" />
                            </button>
                          </th>
                          <th className="text-left p-4 font-medium">
                            <button
                              onClick={() => handleSort('companyName')}
                              className="flex items-center gap-2 hover:text-primary transition-colors"
                            >
                              Company
                              <SortIcon field="companyName" />
                            </button>
                          </th>
                          <th className="text-left p-4 font-medium">Sector</th>
                          <th className="text-right p-4 font-medium">
                            <button
                              onClick={() => handleSort('marketCap')}
                              className="flex items-center gap-2 hover:text-primary transition-colors ml-auto"
                            >
                              Market Cap
                              <SortIcon field="marketCap" />
                            </button>
                          </th>
                          <th className="text-right p-4 font-medium">
                            <button
                              onClick={() => handleSort('price')}
                              className="flex items-center gap-2 hover:text-primary transition-colors ml-auto"
                            >
                              Price
                              <SortIcon field="price" />
                            </button>
                          </th>
                          <th className="text-right p-4 font-medium">
                            <button
                              onClick={() => handleSort('beta')}
                              className="flex items-center gap-2 hover:text-primary transition-colors ml-auto"
                            >
                              Beta
                              <SortIcon field="beta" />
                            </button>
                          </th>
                          <th className="text-right p-4 font-medium">
                            <button
                              onClick={() => handleSort('volume')}
                              className="flex items-center gap-2 hover:text-primary transition-colors ml-auto"
                            >
                              Volume
                              <SortIcon field="volume" />
                            </button>
                          </th>
                          <th className="text-right p-4 font-medium">
                            <button
                              onClick={() => handleSort('lastAnnualDividend')}
                              className="flex items-center gap-2 hover:text-primary transition-colors ml-auto"
                            >
                              Dividend
                              <SortIcon field="lastAnnualDividend" />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStocks.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-12 text-muted-foreground">
                              No stocks found matching your criteria. Try adjusting your filters.
                            </td>
                          </tr>
                        ) : (
                          sortedStocks.map((stock, index) => (
                            <StockRow key={stock.symbol} stock={stock} index={index} formatMarketCap={formatMarketCap} formatVolume={formatVolume} />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StockRow({ 
  stock, 
  index, 
  formatMarketCap, 
  formatVolume 
}: { 
  stock: Stock; 
  index: number;
  formatMarketCap: (value: number) => string;
  formatVolume: (value: number) => string;
}) {
  const [logoError, setLogoError] = useState(false);
  
  return (
    <tr className={cn(
      "border-t border-border hover:bg-muted/50 transition-colors",
      index % 2 === 0 ? "" : "bg-muted/20"
    )}>
      <td className="p-4">
        <Link 
          href={`/stock/${stock.symbol}`}
          className="flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded bg-muted/50 overflow-hidden flex items-center justify-center flex-shrink-0">
            {!logoError ? (
              <img
                src={stock.image}
                alt=""
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                {stock.symbol.slice(0, 2)}
              </span>
            )}
          </div>
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {stock.symbol}
          </span>
        </Link>
      </td>
      <td className="p-4">
        <Link 
          href={`/stock/${stock.symbol}`}
          className="text-muted-foreground hover:text-foreground transition-colors truncate block max-w-[200px]"
          title={stock.companyName}
        >
          {stock.companyName}
        </Link>
      </td>
      <td className="p-4">
        <span className="text-sm text-muted-foreground">{stock.sector || '-'}</span>
      </td>
      <td className="p-4 text-right font-medium">
        {formatMarketCap(stock.marketCap)}
      </td>
      <td className="p-4 text-right font-medium">
        ${stock.price?.toFixed(2) || '-'}
      </td>
      <td className="p-4 text-right">
        <span className={cn(
          "font-medium",
          stock.beta > 1.2 ? "text-red-500" : stock.beta < 0.8 ? "text-green-500" : "text-foreground"
        )}>
          {stock.beta?.toFixed(2) || '-'}
        </span>
      </td>
      <td className="p-4 text-right text-muted-foreground">
        {formatVolume(stock.volume)}
      </td>
      <td className="p-4 text-right">
        <span className={cn(
          stock.lastAnnualDividend > 0 ? "text-green-500 font-medium" : "text-muted-foreground"
        )}>
          {stock.lastAnnualDividend > 0 ? `$${stock.lastAnnualDividend.toFixed(2)}` : '-'}
        </span>
      </td>
    </tr>
  );
}
