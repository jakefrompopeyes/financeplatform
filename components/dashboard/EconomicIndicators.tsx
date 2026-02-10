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
  corePCE: IndicatorData;
  gdp: IndicatorData;
  unemployment: IndicatorData;
  joblessClaims: IndicatorData;
  federalFundsRate: IndicatorData;
  mortgageRate: IndicatorData;
  nfci: IndicatorData;
  fedBalanceSheet: IndicatorData;
}

interface IndicatorConfig {
  title: string;
  expandedTitle: string;
  current: number;
  data: { date: string; value: number }[];
  prefix: string;
  suffix: string;
  color: string;
  id: string;
  formatValue: (v: number) => string;
  description: string;
}

/** Compute a Y-axis domain with proportional padding so all series look good */
function getYDomain(data: { value: number }[]): [number, number] {
  if (data.length === 0) return [0, 1];
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.abs(max) * 0.2 || 1;
  const padding = range * 0.15;
  return [min - padding, max + padding];
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
        {Array.from({ length: 9 }).map((_, i) => (
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

  const indicators: IndicatorConfig[] = [
    // Row 1 — Price & Growth
    {
      title: 'Inflation (CPI)',
      expandedTitle: 'Inflation (CPI) — 3 Year View',
      current: data.cpi.current,
      data: data.cpi.historical,
      prefix: '',
      suffix: '%',
      color: '#EF4444',
      id: 'cpi',
      formatValue: (v) => v.toFixed(2),
      description: 'Year-over-year Consumer Price Index',
    },
    {
      title: 'Core PCE',
      expandedTitle: 'Core PCE Inflation — 3 Year View',
      current: data.corePCE.current,
      data: data.corePCE.historical,
      prefix: '',
      suffix: '%',
      color: '#F97316',
      id: 'corePCE',
      formatValue: (v) => v.toFixed(2),
      description: "Fed's preferred inflation measure (ex food & energy)",
    },
    {
      title: 'Real GDP Growth',
      expandedTitle: 'Real GDP Growth — 3 Year View',
      current: data.gdp.current,
      data: data.gdp.historical,
      prefix: '',
      suffix: '%',
      color: '#F59E0B',
      id: 'gdp',
      formatValue: (v) => v.toFixed(1),
      description: 'Quarterly annualized real GDP growth rate',
    },
    // Row 2 — Labor & Policy
    {
      title: 'Unemployment Rate',
      expandedTitle: 'Unemployment Rate — 3 Year View',
      current: data.unemployment.current,
      data: data.unemployment.historical,
      prefix: '',
      suffix: '%',
      color: '#3B82F6',
      id: 'unemployment',
      formatValue: (v) => v.toFixed(1),
      description: 'U.S. civilian unemployment rate',
    },
    {
      title: 'Jobless Claims',
      expandedTitle: 'Initial Jobless Claims — 3 Year View',
      current: data.joblessClaims.current,
      data: data.joblessClaims.historical,
      prefix: '',
      suffix: 'K',
      color: '#06B6D4',
      id: 'joblessClaims',
      formatValue: (v) => v.toFixed(0),
      description: 'Weekly initial unemployment claims (thousands)',
    },
    {
      title: 'Fed Funds Rate',
      expandedTitle: 'Federal Funds Rate — 3 Year View',
      current: data.federalFundsRate.current,
      data: data.federalFundsRate.historical,
      prefix: '',
      suffix: '%',
      color: '#10B981',
      id: 'fedFunds',
      formatValue: (v) => v.toFixed(2),
      description: 'Federal funds effective rate',
    },
    // Row 3 — Financial Conditions
    {
      title: '30Y Mortgage Rate',
      expandedTitle: '30-Year Mortgage Rate — 3 Year View',
      current: data.mortgageRate.current,
      data: data.mortgageRate.historical,
      prefix: '',
      suffix: '%',
      color: '#14B8A6',
      id: 'mortgageRate',
      formatValue: (v) => v.toFixed(2),
      description: '30-year fixed mortgage rate',
    },
    {
      title: 'Financial Conditions',
      expandedTitle: 'Chicago Fed Financial Conditions Index — 3 Year View',
      current: data.nfci.current,
      data: data.nfci.historical,
      prefix: '',
      suffix: '',
      color: '#8B5CF6',
      id: 'nfci',
      formatValue: (v) => v.toFixed(2),
      description: 'NFCI — Negative = loose, Positive = tight',
    },
    {
      title: 'Fed Balance Sheet',
      expandedTitle: 'Federal Reserve Balance Sheet — 3 Year View',
      current: data.fedBalanceSheet.current,
      data: data.fedBalanceSheet.historical,
      prefix: '$',
      suffix: 'T',
      color: '#A855F7',
      id: 'fedBalanceSheet',
      formatValue: (v) => v.toFixed(2),
      description: 'Total Federal Reserve assets (trillions)',
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-normal text-foreground">Economic Indicators</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {indicators.map((indicator) => {
          const isExpanded = expandedView === indicator.id;
          const isOtherCard = expandedView && expandedView !== indicator.id;
          const chartData = isExpanded && extendedData ? extendedData.historical : indicator.data;
          const domain = getYDomain(chartData);

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
                    {isExpanded ? indicator.expandedTitle : indicator.title}
                  </span>
                  {!expandedView && (
                    <span className="text-xs text-muted-foreground">
                      Click to expand
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isExpanded && loadingExtended ? (
                  <>
                    <div className="h-8 bg-muted rounded w-20 mb-4"></div>
                    <div className="h-48 bg-muted rounded"></div>
                  </>
                ) : (
                  <div className={isExpanded ? 'animate-in fade-in duration-300' : ''}>
                    <div className="text-3xl font-light text-foreground">
                      {indicator.prefix}
                      {isExpanded && extendedData
                        ? indicator.formatValue(extendedData.current)
                        : indicator.current != null
                        ? indicator.formatValue(indicator.current)
                        : 'N/A'}
                      {indicator.suffix}
                    </div>

                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
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
                            domain={domain}
                            tickFormatter={(value) => indicator.formatValue(value)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#2A2A2A',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#EDEDED',
                            }}
                            formatter={(value: number) => [
                              `${indicator.prefix}${indicator.formatValue(value)}${indicator.suffix}`,
                              null,
                            ]}
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
