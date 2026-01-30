'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


interface IndicatorData {
  current: number;
  historical: { date: string; value: number }[];
}

interface EconomicData {
  cpi: IndicatorData;
  unemployment: IndicatorData;
  federalFundsRate: IndicatorData;
}

export default function EconomicIndicators() {
  const [data, setData] = useState<EconomicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedView, setExpandedView] = useState<string | null>(null);
  const [extendedData, setExtendedData] = useState<IndicatorData | null>(null);
  const [loadingExtended, setLoadingExtended] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/economic-indicators-fred');
        const result = await response.json();
        
        if (result.error) {
          console.error('API Error:', result.error);
          setData(null);
        } else {
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching economic indicators:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleToggleIndicator = async (indicatorId: string) => {
    if (expandedView === indicatorId) {
      // Close the expanded view
      setExpandedView(null);
      setExtendedData(null);
    } else {
      setExpandedView(indicatorId);
      setLoadingExtended(true);
      
      try {
        const response = await fetch(`/api/economic-indicators-fred-extended?series=${indicatorId}`);
        const result = await response.json();
        
        if (result.error) {
          console.error('API Error:', result.error);
          setExtendedData(null);
        } else {
          setExtendedData(result);
        }
      } catch (error) {
        console.error('Error fetching extended data:', error);
        setExtendedData(null);
      } finally {
        setLoadingExtended(false);
      }
    }
  };


  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-20 mb-4"></div>
              <div className="h-48 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground">Economic Indicators</h2>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Unable to load economic indicators</p>
              <p className="text-sm">Please check that your FRED_API_KEY is configured in .env.local</p>
              <p className="text-xs mt-4">Get a free API key at: fred.stlouisfed.org</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const indicators = [
    {
      title: 'Inflation (CPI)',
      expandedTitle: 'Inflation (CPI) - 3 Year View',
      current: data.cpi.current,
      data: data.cpi.historical,
      suffix: '%',
      color: '#4A90E2',
      id: 'cpi',
      description: 'Year-over-year Consumer Price Index (CPI) inflation data'
    },
    {
      title: 'Unemployment Rate',
      expandedTitle: 'Unemployment Rate - 3 Year View',
      current: data.unemployment.current,
      data: data.unemployment.historical,
      suffix: '%',
      color: '#4A90E2',
      id: 'unemployment',
      description: 'U.S. unemployment rate data'
    },
    {
      title: 'Federal Funds Rate',
      expandedTitle: 'Federal Funds Rate - 3 Year View',
      current: data.federalFundsRate.current,
      data: data.federalFundsRate.historical,
      suffix: '%',
      color: '#4A90E2',
      id: 'fedFunds',
      description: 'Federal funds effective rate data'
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-normal text-foreground">Economic Indicators</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {indicators.map((indicator) => {
          const isExpanded = expandedView === indicator.id;
          const isOtherCard = expandedView && expandedView !== indicator.id;
          
          return (
        <Card 
          key={indicator.id}
          className={`cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all duration-300 ease-out ${
            isExpanded ? 'md:col-span-3 shadow-2xl shadow-blue-500/20' : 'md:col-span-1'
          } ${isOtherCard ? 'opacity-0 scale-95 pointer-events-none absolute' : 'opacity-100 scale-100'}`}
          onClick={() => handleToggleIndicator(indicator.id)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal text-secondary flex items-center justify-between">
              <span>
                {expandedView === indicator.id ? indicator.expandedTitle : indicator.title}
              </span>
              {!expandedView && (
                <span className="text-xs text-muted-foreground">
                  Click to expand
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expandedView === indicator.id && loadingExtended ? (
              <>
                <div className="h-8 bg-muted rounded w-20 mb-4"></div>
                <div className="h-48 bg-muted rounded"></div>
              </>
            ) : (
              <div className={isExpanded ? 'animate-in fade-in duration-300' : ''}>
                <div className="text-3xl font-light text-foreground">
                  {isExpanded && extendedData 
                    ? extendedData.current.toFixed(2) 
                    : indicator.current != null ? indicator.current.toFixed(2) : 'N/A'
                  }{indicator.suffix}
                </div>
                
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={isExpanded && extendedData ? extendedData.historical : indicator.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#BEBEBE"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`;
                        }}
                      />
                      <YAxis 
                        stroke="#BEBEBE"
                        tick={{ fontSize: 10 }}
                        domain={['dataMin - 1', 'dataMax + 1']}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#2A2A2A', 
                          border: 'none',
                          borderRadius: '8px',
                          color: '#EDEDED'
                        }}
                        formatter={(value: any) => [`${value.toFixed(2)}${indicator.suffix}`, null]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={indicator.color}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          );
        })}
      </div>
    </div>
  );
}

