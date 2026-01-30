'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelatedStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface RelatedStocksProps {
  symbol: string;
  sector?: string;
  compact?: boolean;
}

// Predefined related stocks by sector and popular stocks
const sectorStocks: { [key: string]: string[] } = {
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC'],
  'Finance': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK'],
  'Healthcare': ['JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'MRK', 'LLY'],
  'Consumer': ['AMZN', 'WMT', 'HD', 'NKE', 'MCD', 'SBUX', 'TGT'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PSX'],
  'Default': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM']
};

export default function RelatedStocks({ symbol, sector, compact = false }: RelatedStocksProps) {
  const router = useRouter();
  const [relatedStocks, setRelatedStocks] = useState<RelatedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRelatedStocks();
  }, [symbol, sector]);

  const fetchRelatedStocks = async () => {
    setLoading(true);
    setError(null);

    try {
      // Determine which stocks to fetch based on sector
      let stocksToFetch = sectorStocks['Default'];
      
      if (sector) {
        const sectorKey = Object.keys(sectorStocks).find(key => 
          sector.toLowerCase().includes(key.toLowerCase())
        );
        if (sectorKey) {
          stocksToFetch = sectorStocks[sectorKey];
        }
      }

      // Filter out the current symbol and take 4 stocks
      const symbols = stocksToFetch
        .filter(s => s !== symbol)
        .slice(0, 4);

      // Fetch data for each stock (without historical data to save API credits)
      const stockPromises = symbols.map(async (sym) => {
        try {
          const response = await fetch(`/api/stock-details?symbol=${sym}&includeHistorical=false`);
          const data = await response.json();
          
          if (!data.error) {
            return {
              symbol: data.symbol,
              name: data.name,
              price: data.price,
              change: data.change,
              changePercent: data.changePercent
            };
          }
          return null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(stockPromises);
      const validStocks = results.filter((stock): stock is RelatedStock => stock !== null);
      
      setRelatedStocks(validStocks);
    } catch (err) {
      setError('Failed to fetch related stocks');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const handleStockClick = (stockSymbol: string) => {
    router.push(`/stock/${stockSymbol}`);
  };

  if (loading) {
    return (
      <Card className={compact ? 'h-full' : ''}>
        <CardContent className={compact ? 'p-3' : 'pt-6'}>
          <h2 className={compact ? 'text-xs font-semibold mb-2 flex items-center gap-1' : 'text-lg font-semibold mb-4 flex items-center gap-2'}>
            <Building2 className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
            Related Stocks
          </h2>
          <div className={compact ? 'flex items-center justify-center py-4' : 'flex items-center justify-center py-12'}>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || relatedStocks.length === 0) {
    return null; // Don't show the component if there's an error or no stocks
  }

  return (
    <Card className={compact ? 'h-full' : ''}>
      <CardContent className={compact ? 'p-3' : 'pt-6'}>
        <h2 className={compact ? 'text-xs font-semibold mb-2 flex items-center gap-1' : 'text-lg font-semibold mb-6 flex items-center gap-2'}>
          <Building2 className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
          Related Stocks
        </h2>

        <div className={compact ? 'grid grid-cols-2 sm:grid-cols-4 gap-1.5' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
          {relatedStocks.map((stock) => {
            const isPositive = stock.changePercent >= 0;
            
            return (
              <button
                key={stock.symbol}
                onClick={() => handleStockClick(stock.symbol)}
                className={cn(
                  'text-left rounded-lg border border-border hover:bg-accent/50 transition-all duration-200 group',
                  compact ? 'p-1.5' : 'p-4'
                )}
              >
                <div className={compact ? 'flex items-center justify-between gap-0.5 mb-0' : 'flex items-start justify-between mb-2'}>
                  <p className={cn(
                    'font-semibold group-hover:text-primary transition-colors truncate',
                    compact ? 'text-[10px]' : 'text-sm'
                  )}>
                    {stock.symbol}
                  </p>
                  <div className={cn(
                    'flex items-center gap-0.5 shrink-0',
                    isPositive ? 'text-green-500' : 'text-red-500',
                    compact ? 'text-[9px]' : 'text-xs'
                  )}>
                    {isPositive ? (
                      <TrendingUp className={compact ? 'w-2 h-2' : 'w-3 h-3'} />
                    ) : (
                      <TrendingDown className={compact ? 'w-2 h-2' : 'w-3 h-3'} />
                    )}
                    <span>{isPositive ? '+' : ''}{formatNumber(stock.changePercent)}%</span>
                  </div>
                </div>
                {!compact && (
                  <p className="text-xs text-muted-foreground truncate">
                    {stock.name}
                  </p>
                )}
                <p className={cn(
                  'font-medium tabular-nums',
                  compact ? 'text-[10px] mt-0' : 'text-lg font-light mt-2'
                )}>
                  ${formatNumber(stock.price)}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}



