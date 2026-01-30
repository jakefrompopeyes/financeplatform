'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Stock {
  symbol: string;
  name: string;
  changePercent: number;
  price: number;
  volume: number;
}

interface Sector {
  sector: string;
  symbol: string;
  changePercent: number;
  price: number;
  stocks: Stock[];
}

interface HeatmapData {
  sectors: Sector[];
  lastUpdated: string;
}

export default function MarketHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

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
        console.error('Error fetching heatmap data:', error);
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

  const getColorFromPercent = (percent: number) => {
    const absPercent = Math.abs(percent);
    
    if (percent > 0) {
      // Green gradient for positive
      if (absPercent >= 3) return '#16A34A'; // Strong green
      if (absPercent >= 2) return '#22C55E'; // Medium green
      if (absPercent >= 1) return '#4ADE80'; // Light green
      return '#86EFAC'; // Very light green
    } else if (percent < 0) {
      // Red gradient for negative
      if (absPercent >= 3) return '#DC2626'; // Strong red
      if (absPercent >= 2) return '#EF4444'; // Medium red
      if (absPercent >= 1) return '#F87171'; // Light red
      return '#FCA5A5'; // Very light red
    } else {
      return '#6B7280'; // Neutral gray
    }
  };

  const getTextColor = (percent: number) => {
    const absPercent = Math.abs(percent);
    // Use white text for darker backgrounds
    if (absPercent >= 1.5) return '#FFFFFF';
    return '#1F2937'; // Dark gray for light backgrounds
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground">Market Heatmap</h2>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-48"></div>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.sectors.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground">Market Heatmap</h2>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Unable to load heatmap data</p>
              <p className="text-sm">Please check your API configuration</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedSectorData = selectedSector 
    ? data.sectors.find(s => s.sector === selectedSector)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-normal text-foreground">Market Heatmap</h2>
        <div className="flex items-center gap-4 text-xs text-secondary">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#16A34A' }}></div>
            <span>Strong Gain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#86EFAC' }}></div>
            <span>Slight Gain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6B7280' }}></div>
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FCA5A5' }}></div>
            <span>Slight Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DC2626' }}></div>
            <span>Strong Loss</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-normal text-secondary">
            S&P 500 Sector Performance {selectedSector && `- ${selectedSector}`}
          </CardTitle>
          {selectedSector && (
            <button
              onClick={() => setSelectedSector(null)}
              className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
            >
              ← Back to all sectors
            </button>
          )}
        </CardHeader>
        <CardContent>
          {!selectedSector ? (
            // Sector Grid View
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.sectors.map((sector) => {
                const bgColor = getColorFromPercent(sector.changePercent);
                const textColor = getTextColor(sector.changePercent);
                
                return (
                  <div
                    key={sector.sector}
                    className="rounded-lg p-4 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
                    style={{ 
                      backgroundColor: bgColor,
                      color: textColor
                    }}
                    onClick={() => setSelectedSector(sector.sector)}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <div>
                        <div className="text-xs font-medium opacity-80 mb-1">
                          {sector.symbol}
                        </div>
                        <div className="text-sm font-semibold mb-2">
                          {sector.sector}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          {sector.changePercent > 0.1 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : sector.changePercent < -0.1 ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : (
                            <Minus className="h-4 w-4" />
                          )}
                          <span className="text-lg font-bold">
                            {formatPercent(sector.changePercent)}
                          </span>
                        </div>
                        <div className="text-xs opacity-70">
                          ${sector.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Sector Detail View with Stocks
            <div className="space-y-4">
              {/* Sector Summary */}
              {selectedSectorData && (
                <div 
                  className="rounded-lg p-6 mb-4"
                  style={{ 
                    backgroundColor: getColorFromPercent(selectedSectorData.changePercent),
                    color: getTextColor(selectedSectorData.changePercent)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm opacity-80 mb-1">{selectedSectorData.symbol}</div>
                      <div className="text-2xl font-semibold mb-1">{selectedSectorData.sector}</div>
                      <div className="text-sm opacity-80">${selectedSectorData.price.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        {selectedSectorData.changePercent > 0.1 ? (
                          <TrendingUp className="h-6 w-6" />
                        ) : selectedSectorData.changePercent < -0.1 ? (
                          <TrendingDown className="h-6 w-6" />
                        ) : (
                          <Minus className="h-6 w-6" />
                        )}
                        <span className="text-3xl font-bold">
                          {formatPercent(selectedSectorData.changePercent)}
                        </span>
                      </div>
                      <div className="text-sm opacity-80">Sector Performance</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Stocks in Sector */}
              {selectedSectorData && selectedSectorData.stocks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-secondary mb-3">Top Stocks</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedSectorData.stocks.map((stock) => {
                      const bgColor = getColorFromPercent(stock.changePercent);
                      const textColor = getTextColor(stock.changePercent);
                      
                      return (
                        <div
                          key={stock.symbol}
                          className="rounded-lg p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                          style={{ 
                            backgroundColor: bgColor,
                            color: textColor
                          }}
                        >
                          <div className="flex flex-col h-full justify-between">
                            <div>
                              <div className="text-lg font-bold mb-1">{stock.symbol}</div>
                              <div className="text-xs opacity-80 mb-2 truncate">
                                {stock.name}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                {stock.changePercent > 0.1 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : stock.changePercent < -0.1 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : (
                                  <Minus className="h-3 w-3" />
                                )}
                                <span className="text-base font-bold">
                                  {formatPercent(stock.changePercent)}
                                </span>
                              </div>
                              <div className="text-xs opacity-70">
                                ${stock.price.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Click on a sector to view top performing stocks • Updates every 5 minutes
      </p>
    </div>
  );
}



