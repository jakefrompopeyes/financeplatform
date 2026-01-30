'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Sector {
  sector: string;
  symbol: string;
  changePercent: number;
  price: number;
  stocks: Array<{
    symbol: string;
    name: string;
    changePercent: number;
    price: number;
    volume: number;
  }>;
}

interface SectorData {
  sectors: Sector[];
  lastUpdated: string;
}

export default function SectorPerformance() {
  const [data, setData] = useState<SectorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/market-heatmap');
        const result = await response.json();
        
        if (result.error) {
          console.error('API Error:', result.error);
          setData(null);
        } else {
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching sector data:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Sector Performance
        </h2>
        <Card className="animate-pulse">
          <CardContent className="pt-6">
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.sectors.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Sector Performance
        </h2>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Unable to load sector data</p>
              <p className="text-sm">Please check your API configuration</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort sectors by performance
  const sortedSectors = [...data.sectors].sort((a, b) => b.changePercent - a.changePercent);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-normal text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Sector Performance
        </h2>
        <p className="text-xs text-muted-foreground">
          S&P 500 Sectors
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {sortedSectors.map((sector) => {
              const isPositive = sector.changePercent >= 0;
              const maxChange = Math.max(...sortedSectors.map(s => Math.abs(s.changePercent)));
              const barWidth = (Math.abs(sector.changePercent) / maxChange) * 100;

              return (
                <div key={sector.sector} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {sector.sector}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {sector.symbol}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className={cn(
                          "text-sm font-semibold",
                          isPositive ? "text-green-500" : "text-red-500"
                        )}>
                          {isPositive ? '+' : ''}{sector.changePercent.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${sector.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        isPositive ? "bg-green-500" : "bg-red-500"
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Last updated: {new Date(data.lastUpdated).toLocaleTimeString()} • Updates every 5 minutes
      </p>
    </div>
  );
}



