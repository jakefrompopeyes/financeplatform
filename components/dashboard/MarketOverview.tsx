'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { FlipNumber, FlipPercent } from '@/components/ui/FlipNumber';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  historical: { date: string; close: number }[];
}

export default function MarketOverview() {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setErrorMessage(null);
        const response = await fetch('/api/market-overview');
        const result = await response.json();

        if (result.error) {
          console.error('API Error:', result.error);
          setErrorMessage(result.error);
          setData([]);
        } else if (Array.isArray(result)) {
          setData(result);
        } else {
          setErrorMessage('Unexpected response format');
          setData([]);
        }
      } catch (error) {
        console.error('Error fetching market overview:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Network error');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-4 bg-muted rounded w-20 mb-4"></div>
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground">Stock Market Overview</h2>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Unable to load market data</p>
              {errorMessage && (
                <p className="text-sm mb-2 text-amber-600 dark:text-amber-400">{errorMessage}</p>
              )}
              {(!errorMessage || /api key/i.test(errorMessage)) ? (
                <p className="text-sm">Add FMP_API_KEY to .env.local (get a free key at financialmodelingprep.com)</p>
              ) : /restricted|subscription|upgrade/i.test(errorMessage) ? (
                <p className="text-sm">Your FMP plan may not include this endpoint. Consider upgrading or switching endpoints.</p>
              ) : (
                <p className="text-sm">Check your FMP key and try again.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-normal text-foreground">Stock Market Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.map((item) => {
          const isPositive = item.changesPercentage >= 0;
          const displayName = item.name.includes('S&P') ? 'S&P 500' : 
                            item.name.includes('NASDAQ') ? 'NASDAQ' : 'Dow Jones';
          
          return (
            <Card key={item.symbol}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-normal text-secondary">
                  {displayName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-light text-foreground">
                    <FlipNumber value={item.price} decimals={2} prefix="$" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{isPositive ? '+' : ''}{item.change != null ? item.change.toFixed(2) : 'N/A'}</span>
                    <span>(<FlipPercent value={item.changesPercentage ?? 0} className="inline" />)</span>
                    <span className="text-xs text-muted-foreground ml-1">today</span>
                  </div>
                </div>
                
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={item.historical} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <YAxis 
                        domain={['dataMin - 2', 'dataMax + 2']} 
                        hide={true}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="close" 
                        stroke={isPositive ? '#10b981' : '#ef4444'} 
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

