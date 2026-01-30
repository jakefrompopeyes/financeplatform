'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  image?: string;
}

interface MoversData {
  gainers: Stock[];
  losers: Stock[];
  lastUpdated: string;
}

export default function TopMovers() {
  const [data, setData] = useState<MoversData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/top-movers');
        const result = await response.json();
        
        if (result.error) {
          console.error('API Error:', result.error);
          setData(null);
        } else {
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching movers data:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 2 minutes
    const interval = setInterval(fetchData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground">Top Movers</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-48 bg-muted rounded"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-48 bg-muted rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground">Top Movers</h2>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Unable to load movers data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StockRow = ({ stock, rank }: { stock: Stock; rank: number }) => {
    const isPositive = stock.changePercent >= 0;
    const [logoError, setLogoError] = useState(false);
    const showLogo = stock.image && !logoError;
    return (
      <Link 
        href={`/stock/${stock.symbol}`}
        className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center bg-muted/50 overflow-hidden">
            {showLogo ? (
              <img
                src={stock.image}
                alt=""
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className={cn(
                "text-xs font-semibold",
                isPositive ? "text-green-500" : "text-red-500"
              )}>
                {rank}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {stock.symbol}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {stock.name}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-sm font-medium text-foreground">
              ${stock.price.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              Vol: {stock.volume >= 1e6 ? `${(stock.volume / 1e6).toFixed(1)}M` : stock.volume >= 1e3 ? `${(stock.volume / 1e3).toFixed(1)}K` : stock.volume}
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 font-semibold",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>{isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-normal text-foreground">Top Movers</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Gainers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top Gainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.gainers.length > 0 ? (
                data.gainers.map((stock, index) => (
                  <StockRow key={stock.symbol} stock={stock} rank={index + 1} />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Losers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Top Losers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.losers.length > 0 ? (
                data.losers.map((stock, index) => (
                  <StockRow key={stock.symbol} stock={stock} rank={index + 1} />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Last updated: {new Date(data.lastUpdated).toLocaleTimeString()} • Updates every 2 minutes
      </p>
    </div>
  );
}

