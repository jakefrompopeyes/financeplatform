'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FlipInteger, FlipNumber } from '@/components/ui/FlipNumber';

interface FearGreedData {
  current: {
    value: number;
    rating: string;
    timestamp: number;
  };
  previousClose: number;
  historical: Array<{
    date: string;
    value: number;
    rating: string;
  }>;
}

interface PolymarketMarket {
  question: string;
  probabilities: Array<{
    outcome: string;
    probability: number;
  }>;
  volume: number;
  endDate: string;
  url: string;
}

interface MarketSentimentData {
  vix: {
    current: number;
    change: number;
    changePercent: number;
    previousClose: number;
    historical: Array<{
      date: string;
      value: number;
    }>;
    demo?: boolean;
  } | null;
  putCall: {
    current: number;
    change: number;
    changePercent: number;
    previousClose: number;
    historical: Array<{
      date: string;
      value: number;
    }>;
    demo?: boolean;
  } | null;
  polymarketMarkets?: PolymarketMarket[];
  lastUpdated: string;
  note?: string;
}

interface BitcoinHistoricalData {
  historical: Array<{
    date: string;
    price: number;
    percentChange: number;
  }>;
  basePrice: number;
  currentPrice: number;
}

export default function FearGreedIndex() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [sentimentData, setSentimentData] = useState<MarketSentimentData | null>(null);
  const [bitcoinData, setBitcoinData] = useState<BitcoinHistoricalData | null>(null);
  const [showBitcoin, setShowBitcoin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Fear & Greed Index
        const fearGreedResponse = await fetch('/api/fear-greed-index');
        const fearGreedResult = await fearGreedResponse.json();
        
        if (fearGreedResult.error) {
          console.error('API Error:', fearGreedResult.error);
          setData(null);
        } else {
          setData(fearGreedResult);
        }

        // Fetch VIX and Put/Call ratio data
        const sentimentResponse = await fetch('/api/market-sentiment');
        const sentimentResult = await sentimentResponse.json();
        setSentimentData(sentimentResult);

        // Fetch Bitcoin historical data
        const bitcoinResponse = await fetch('/api/bitcoin-historical');
        const bitcoinResult = await bitcoinResponse.json();
        
        if (bitcoinResult.error) {
          console.error('Bitcoin API Error:', bitcoinResult.error);
          setBitcoinData(null);
        } else {
          setBitcoinData(bitcoinResult);
        }
      } catch (error) {
        console.error('Error fetching market sentiment data:', error);
        setData(null);
        setSentimentData(null);
        setBitcoinData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every hour
    const interval = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getColorFromValue = (value: number) => {
    if (value <= 25) return '#EA3943'; // Extreme Fear - Red
    if (value <= 45) return '#F5A623'; // Fear - Orange
    if (value <= 55) return '#F8E71C'; // Neutral - Yellow
    if (value <= 75) return '#7ED321'; // Greed - Light Green
    return '#50E3C2'; // Extreme Greed - Teal
  };

  const getGaugePosition = (value: number) => {
    // Convert 0-100 to rotation angle (-90 to 90 degrees)
    return (value / 100) * 180 - 90;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground">Market Sentiment</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-48"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground">Market Sentiment</h2>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Unable to load Fear and Greed Index</p>
              <p className="text-sm">Data temporarily unavailable</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const change = data.current.value - data.previousClose;
  const changePercent = ((change / data.previousClose) * 100);
  const color = getColorFromValue(data.current.value);
  const rotation = getGaugePosition(data.current.value);

  // Merge Fear & Greed data with Bitcoin data
  const mergedChartData = data.historical.map((item) => {
    const btcItem = bitcoinData?.historical.find((btc) => btc.date === item.date);
    return {
      date: item.date,
      value: item.value,
      rating: item.rating,
      btcPercentChange: btcItem?.percentChange || null,
    };
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-normal text-foreground">Market Sentiment</h2>
      
      {sentimentData?.note && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ {sentimentData.note}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gauge Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal text-secondary">
              Crypto Fear & Greed Index
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gauge Display */}
            <div className="relative flex flex-col items-center justify-center py-4">
              {/* Semi-circle gauge background */}
              <div className="relative w-64 h-32">
                <svg viewBox="0 0 200 100" className="w-full h-full">
                  {/* Background arc segments - precisely equal 36° segments */}
                  {/* Extreme Fear: 180° to 144° */}
                  <path
                    d="M 10,100 A 90,90 0 0,1 27,47"
                    fill="none"
                    stroke="#EA3943"
                    strokeWidth="20"
                    opacity="0.3"
                  />
                  {/* Fear: 144° to 108° */}
                  <path
                    d="M 27,47 A 90,90 0 0,1 72,14"
                    fill="none"
                    stroke="#F5A623"
                    strokeWidth="20"
                    opacity="0.3"
                  />
                  {/* Neutral: 108° to 72° */}
                  <path
                    d="M 72,14 A 90,90 0 0,1 128,14"
                    fill="none"
                    stroke="#F8E71C"
                    strokeWidth="20"
                    opacity="0.3"
                  />
                  {/* Greed: 72° to 36° */}
                  <path
                    d="M 128,14 A 90,90 0 0,1 173,47"
                    fill="none"
                    stroke="#7ED321"
                    strokeWidth="20"
                    opacity="0.3"
                  />
                  {/* Extreme Greed: 36° to 0° */}
                  <path
                    d="M 173,47 A 90,90 0 0,1 190,100"
                    fill="none"
                    stroke="#50E3C2"
                    strokeWidth="20"
                    opacity="0.3"
                  />
                  
                  {/* Needle */}
                  <g transform={`rotate(${rotation} 100 100)`}>
                    <line
                      x1="100"
                      y1="100"
                      x2="100"
                      y2="20"
                      stroke={color}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="100" cy="100" r="5" fill={color} />
                  </g>
                </svg>
              </div>

              {/* Value and Rating */}
              <div className="text-center mt-2">
                <div className="text-5xl font-light text-foreground" style={{ color }}>
                  <FlipInteger value={data.current.value} />
                </div>
                <div className="text-xl font-medium mt-1" style={{ color }}>
                  {data.current.rating}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historical Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-normal text-secondary">
                Fear & Greed 30-Day Trend
              </CardTitle>
              {bitcoinData && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="bitcoin-toggle" className="text-xs text-secondary cursor-pointer">
                    Show Bitcoin %
                  </Label>
                  <Switch
                    id="bitcoin-toggle"
                    checked={showBitcoin}
                    onCheckedChange={setShowBitcoin}
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#BEBEBE"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#BEBEBE"
                    tick={{ fontSize: 10 }}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    label={{ value: 'Fear & Greed', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#BEBEBE' } }}
                  />
                  {showBitcoin && bitcoinData && (
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#F7931A"
                      tick={{ fontSize: 10, fill: '#F7931A' }}
                      label={{ value: 'Bitcoin %', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#F7931A' } }}
                    />
                  )}
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#2A2A2A', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#EDEDED'
                    }}
                    formatter={(value: any, name: any, props: any) => {
                      if (name === 'btcPercentChange') {
                        return [`${value?.toFixed(2)}%`, 'Bitcoin Change'];
                      }
                      const rating = props.payload.rating || '';
                      return [`${value} - ${rating}`, 'Fear & Greed'];
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="value" 
                    stroke="#4A90E2"
                    strokeWidth={2}
                    dot={{ fill: '#4A90E2', r: 2 }}
                    name="Fear & Greed"
                  />
                  {showBitcoin && bitcoinData && (
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="btcPercentChange" 
                      stroke="#F7931A"
                      strokeWidth={2}
                      dot={{ fill: '#F7931A', r: 2 }}
                      name="Bitcoin %"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* VIX (Volatility Index) Card */}
        {sentimentData?.vix && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-normal text-secondary">
                  VIX (Volatility Index)
                </CardTitle>
                {sentimentData.vix.demo && (
                  <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded">
                    DEMO
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current VIX Value */}
              <div className="text-center py-4">
                <div className="text-5xl font-light text-foreground">
                  <FlipNumber value={sentimentData.vix.current} decimals={2} />
                </div>
                <div className="text-sm text-secondary mt-1">Current VIX Level</div>
                <div className={`text-sm mt-2 ${sentimentData.vix.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {sentimentData.vix.change >= 0 ? '▲' : '▼'} {Math.abs(sentimentData.vix.change).toFixed(2)} ({sentimentData.vix.changePercent >= 0 ? '+' : ''}{sentimentData.vix.changePercent.toFixed(2)}%)
                  <span className="text-secondary ml-1">vs. previous close</span>
                </div>
              </div>

              {/* VIX Interpretation Guide */}
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div>
                  <div className="w-full h-2 rounded bg-green-500"></div>
                  <div className="mt-1 text-secondary">{'< 15'}</div>
                  <div className="text-muted-foreground">Low Volatility</div>
                </div>
                <div>
                  <div className="w-full h-2 rounded bg-amber-500"></div>
                  <div className="mt-1 text-secondary">15-25</div>
                  <div className="text-muted-foreground">Normal</div>
                </div>
                <div>
                  <div className="w-full h-2 rounded bg-red-500"></div>
                  <div className="mt-1 text-secondary">{'> 25'}</div>
                  <div className="text-muted-foreground">High Volatility</div>
                </div>
              </div>

              {/* VIX Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sentimentData.vix.historical}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#BEBEBE"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      stroke="#BEBEBE"
                      tick={{ fontSize: 9 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#2A2A2A', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#EDEDED'
                      }}
                      formatter={(value: any) => [value.toFixed(2), 'VIX']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <ReferenceLine y={15} stroke="#7ED321" strokeDasharray="3 3" strokeWidth={1} />
                    <ReferenceLine y={25} stroke="#EA3943" strokeDasharray="3 3" strokeWidth={1} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#9B59B6"
                      strokeWidth={2}
                      dot={{ fill: '#9B59B6', r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Put/Call Ratio Card */}
        {sentimentData?.putCall && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-normal text-secondary">
                  Put/Call Ratio
                </CardTitle>
                {sentimentData.putCall.demo && (
                  <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded">
                    DEMO
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Put/Call Ratio */}
              <div className="text-center py-4">
                <div className="text-5xl font-light text-foreground">
                  <FlipNumber value={sentimentData.putCall.current} decimals={3} />
                </div>
                <div className="text-sm text-secondary mt-1">Current Ratio</div>
                <div className={`text-sm mt-2 ${sentimentData.putCall.change >= 0 ? 'text-amber-500' : 'text-blue-500'}`}>
                  {sentimentData.putCall.change >= 0 ? '▲' : '▼'} {Math.abs(sentimentData.putCall.change).toFixed(3)} ({sentimentData.putCall.changePercent >= 0 ? '+' : ''}{sentimentData.putCall.changePercent.toFixed(2)}%)
                  <span className="text-secondary ml-1">vs. previous close</span>
                </div>
              </div>

              {/* Put/Call Interpretation Guide */}
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div>
                  <div className="w-full h-2 rounded bg-green-500"></div>
                  <div className="mt-1 text-secondary">{'< 0.7'}</div>
                  <div className="text-muted-foreground">Bullish</div>
                </div>
                <div>
                  <div className="w-full h-2 rounded bg-amber-500"></div>
                  <div className="mt-1 text-secondary">0.7-1.0</div>
                  <div className="text-muted-foreground">Neutral</div>
                </div>
                <div>
                  <div className="w-full h-2 rounded bg-red-500"></div>
                  <div className="mt-1 text-secondary">{'> 1.0'}</div>
                  <div className="text-muted-foreground">Bearish</div>
                </div>
              </div>

              {/* Put/Call Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sentimentData.putCall.historical}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#BEBEBE"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      stroke="#BEBEBE"
                      tick={{ fontSize: 9 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#2A2A2A', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#EDEDED'
                      }}
                      formatter={(value: any) => [value.toFixed(3), 'P/C Ratio']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <ReferenceLine y={0.7} stroke="#7ED321" strokeDasharray="3 3" strokeWidth={1} />
                    <ReferenceLine y={1.0} stroke="#EA3943" strokeDasharray="3 3" strokeWidth={1} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#E67E22"
                      strokeWidth={2}
                      dot={{ fill: '#E67E22', r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Polymarket Prediction Markets Section */}
      {sentimentData?.polymarketMarkets && sentimentData.polymarketMarkets.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-normal text-foreground">Market Predictions (Polymarket)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sentimentData.polymarketMarkets.map((market, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-normal text-foreground leading-tight">
                    {market.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Probabilities */}
                  <div className="space-y-2">
                    {market.probabilities.map((prob, pIndex) => (
                      <div key={pIndex} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-secondary">{prob.outcome}</span>
                          <span className="text-foreground font-medium">{prob.probability.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${prob.probability}%`,
                              backgroundColor: pIndex === 0 ? '#4A90E2' : '#7ED321'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Market Info */}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      Volume: ${(market.volume / 1000000).toFixed(2)}M
                    </div>
                    <a
                      href={market.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
                    >
                      View on Polymarket →
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

