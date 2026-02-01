'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { FlipPrice, FlipPercent } from '@/components/ui/FlipNumber';

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  sparkline24h: number[];
  sparkline7d: number[];
  high24h: number;
  low24h: number;
}

export default function CryptoPrices() {
  const router = useRouter();
  const [data, setData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/crypto-prices', { cache: 'no-store' });
      const result = await response.json();

      if (result.error) {
        console.error('API Error:', result.error);
        setData([]);
      } else if (Array.isArray(result)) {
        setData(result);
        setLastUpdated(new Date());
      } else {
        console.error('Invalid data format:', result);
        setData([]);
      }
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every 1 minute
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
        <h2 className="text-2xl font-normal text-foreground">Cryptocurrency Prices</h2>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Unable to load cryptocurrency data</p>
              <p className="text-sm">CoinGecko API may be rate limited or temporarily unavailable</p>
              <p className="text-xs mt-4">Data will refresh automatically every minute</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleFlip = (cryptoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cryptoId)) {
        newSet.delete(cryptoId);
      } else {
        newSet.add(cryptoId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-normal text-foreground">Cryptocurrency Prices</h2>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.map((crypto) => {
          const isPositive = crypto.priceChangePercentage24h >= 0;
          const isFlipped = flippedCards.has(crypto.id);
          
          // Prepare sparkline data for both timeframes
          const sparklineData24h = crypto.sparkline24h.map((price, index) => ({
            index,
            price
          }));

          const sparklineData7d = crypto.sparkline7d.map((price, index) => ({
            index,
            price
          }));

          // Calculate 7-day change for back of card
          const priceChange7d = crypto.sparkline7d.length > 0 
            ? crypto.currentPrice - crypto.sparkline7d[0]
            : 0;
          const priceChangePercentage7d = crypto.sparkline7d.length > 0
            ? ((crypto.currentPrice - crypto.sparkline7d[0]) / crypto.sparkline7d[0]) * 100
            : 0;
          const isPositive7d = priceChangePercentage7d >= 0;
          
          return (
            <div 
              key={crypto.id} 
              className="flip-card cursor-pointer relative group"
              style={{ perspective: '1000px', minHeight: '240px' }}
            >
              <div 
                className="flip-card-inner w-full h-full transition-transform duration-500"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  position: 'relative'
                }}
              >
                {/* Front of card - 24h */}
                <div 
                  className="flip-card-front"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    position: isFlipped ? 'absolute' : 'relative',
                    width: '100%',
                    top: 0,
                    left: 0
                  }}
                >
                  <Card 
                    className="h-full hover:border-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/crypto/${crypto.id}`);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img 
                            src={crypto.image} 
                            alt={crypto.name} 
                            className="w-6 h-6"
                          />
                          <CardTitle className="text-base font-normal text-secondary">
                            {crypto.name} ({crypto.symbol})
                          </CardTitle>
                        </div>
                        <button
                          onClick={(e) => toggleFlip(crypto.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent"
                          title="Flip card"
                        >
                          ↻
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-3xl font-light text-foreground">
                          <FlipPrice value={crypto.currentPrice} />
                        </div>
                        <div className={`flex items-center gap-1 text-sm mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span>{isPositive ? '+' : ''}{crypto.priceChange24h != null ? crypto.priceChange24h.toFixed(2) : 'N/A'}</span>
                          <span>(<FlipPercent value={crypto.priceChangePercentage24h ?? 0} className="inline" />)</span>
                          <span className="text-xs text-muted-foreground ml-1">24h</span>
                        </div>
                      </div>
                      
                      {sparklineData24h.length > 0 && (
                        <div className="h-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparklineData24h} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <YAxis 
                                domain={['dataMin - 2', 'dataMax + 2']} 
                                hide={true}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="price" 
                                stroke={isPositive ? '#10b981' : '#ef4444'} 
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Back of card - 7d */}
                <div 
                  className="flip-card-back"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    position: isFlipped ? 'relative' : 'absolute',
                    width: '100%',
                    top: 0,
                    left: 0
                  }}
                >
                  <Card 
                    className="h-full hover:border-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/crypto/${crypto.id}`);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img 
                            src={crypto.image} 
                            alt={crypto.name} 
                            className="w-6 h-6"
                          />
                          <CardTitle className="text-base font-normal text-secondary">
                            {crypto.name} ({crypto.symbol})
                          </CardTitle>
                        </div>
                        <button
                          onClick={(e) => toggleFlip(crypto.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent"
                          title="Flip card"
                        >
                          ↻
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-3xl font-light text-foreground">
                          <FlipPrice value={crypto.currentPrice} />
                        </div>
                        <div className={`flex items-center gap-1 text-sm mt-1 ${isPositive7d ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive7d ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span>{isPositive7d ? '+' : ''}{priceChange7d.toFixed(2)}</span>
                          <span>(<FlipPercent value={priceChangePercentage7d} className="inline" />)</span>
                          <span className="text-xs text-muted-foreground ml-1">7d</span>
                        </div>
                      </div>
                      
                      {sparklineData7d.length > 0 && (
                        <div className="h-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparklineData7d} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <YAxis 
                                domain={['dataMin - 2', 'dataMax + 2']} 
                                hide={true}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="price" 
                                stroke={isPositive7d ? '#10b981' : '#ef4444'} 
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

