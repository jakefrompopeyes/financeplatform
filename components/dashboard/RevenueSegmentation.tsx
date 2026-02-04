'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface ProductSegment {
  segment: string;
  revenue: number;
}

interface GeoSegment {
  region: string;
  revenue: number;
}

interface YearData {
  year: number;
  date: string;
  productSegments: ProductSegment[];
  geoSegments: GeoSegment[];
}

interface RevenueSegmentationData {
  symbol: string;
  years: YearData[];
  error?: string;
}

// Color palette for segments
const PRODUCT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#84cc16', // Lime
];

const GEO_COLORS = [
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
];

function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

// Truncate long segment names
function truncateName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
}

// Custom tooltip component
const CustomTooltip = ({ 
  active, 
  payload,
  total,
  type 
}: { 
  active?: boolean; 
  payload?: Array<{ payload: { name: string; value: number; fill: string } }>; 
  total: number;
  type: 'product' | 'geo';
}) => {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload[0].payload;
  const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-4 py-3 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
        <p className="text-sm font-semibold text-foreground">{data.name}</p>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs text-muted-foreground">Revenue</span>
          <span className="text-sm font-bold text-foreground">
            {formatLargeNumber(data.value)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs text-muted-foreground">% of Total</span>
          <span className="text-sm font-medium text-foreground">{percent}%</span>
        </div>
      </div>
    </div>
  );
};

// Custom legend component
const CustomLegend = ({ 
  payload,
  total 
}: { 
  payload?: Array<{ value: string; color: string; payload: { value: number } }>; 
  total: number;
}) => {
  if (!payload) return null;
  
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
      {payload.slice(0, 6).map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div 
            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
            style={{ backgroundColor: entry.color }} 
          />
          <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={entry.value}>
            {truncateName(entry.value, 15)}
          </span>
          <span className="text-xs text-foreground font-medium">
            {formatPercent(entry.payload.value, total)}
          </span>
        </div>
      ))}
      {payload.length > 6 && (
        <span className="text-xs text-muted-foreground">
          +{payload.length - 6} more
        </span>
      )}
    </div>
  );
};

export default function RevenueSegmentation({ symbol }: { symbol: string }) {
  const [data, setData] = useState<RevenueSegmentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYearIndex, setSelectedYearIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/revenue-segmentation?symbol=${encodeURIComponent(symbol)}&limit=5`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
          setData(null);
        } else {
          setData(json);
          setError(null);
          setSelectedYearIndex(0); // Reset to latest year
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbol]);

  // Get selected year data
  const selectedYear = data?.years?.[selectedYearIndex];
  
  const hasProductData = selectedYear?.productSegments && selectedYear.productSegments.length > 0;
  const hasGeoData = selectedYear?.geoSegments && selectedYear.geoSegments.length > 0;
  const hasAnyData = hasProductData || hasGeoData;
  const hasMultipleYears = (data?.years?.length || 0) > 1;

  // Calculate totals
  const productTotal = selectedYear?.productSegments?.reduce((sum, s) => sum + s.revenue, 0) || 0;
  const geoTotal = selectedYear?.geoSegments?.reduce((sum, s) => sum + s.revenue, 0) || 0;

  // Prepare chart data
  const productChartData = selectedYear?.productSegments?.map((s, i) => ({
    name: s.segment,
    value: s.revenue,
    fill: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
  })) || [];

  const geoChartData = selectedYear?.geoSegments?.map((s, i) => ({
    name: s.region,
    value: s.revenue,
    fill: GEO_COLORS[i % GEO_COLORS.length],
  })) || [];

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Breakdown</h2>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading revenue data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !hasAnyData) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Revenue Breakdown</h2>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {error || 'No revenue segmentation data available for this symbol.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Revenue Breakdown</h2>
            <p className="text-sm text-muted-foreground mt-1">
              How {symbol} generates its revenue
            </p>
          </div>
          {hasMultipleYears && data?.years && (
            <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
              {data.years.map((yearData, i) => (
                <button
                  key={yearData.year}
                  onClick={() => setSelectedYearIndex(i)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    selectedYearIndex === i
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                >
                  {yearData.year}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className={`grid gap-6 ${hasProductData && hasGeoData ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Product Segmentation */}
          {hasProductData && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-foreground mb-1">By Product/Service</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Total: {formatLargeNumber(productTotal)}
              </p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {productChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill}
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip total={productTotal} type="product" />} />
                    <Legend content={<CustomLegend total={productTotal} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Geographic Segmentation */}
          {hasGeoData && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-foreground mb-1">By Geography</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Total: {formatLargeNumber(geoTotal)}
              </p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={geoChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {geoChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill}
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip total={geoTotal} type="geo" />} />
                    <Legend content={<CustomLegend total={geoTotal} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Breakdown Table */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className={`grid gap-6 ${hasProductData && hasGeoData ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Product Segments Table */}
            {hasProductData && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Product/Service Details {selectedYear?.year && `(${selectedYear.year})`}
                </h4>
                <div className="space-y-2">
                  {selectedYear?.productSegments?.slice(0, 8).map((segment, index) => (
                    <div 
                      key={segment.segment} 
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: PRODUCT_COLORS[index % PRODUCT_COLORS.length] }} 
                        />
                        <span className="truncate text-foreground" title={segment.segment}>
                          {truncateName(segment.segment, 25)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-muted-foreground tabular-nums">
                          {formatPercent(segment.revenue, productTotal)}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatLargeNumber(segment.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(selectedYear?.productSegments?.length || 0) > 8 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{(selectedYear?.productSegments?.length || 0) - 8} more segments
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Geographic Segments Table */}
            {hasGeoData && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Geographic Details {selectedYear?.year && `(${selectedYear.year})`}
                </h4>
                <div className="space-y-2">
                  {selectedYear?.geoSegments?.slice(0, 8).map((segment, index) => (
                    <div 
                      key={segment.region} 
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: GEO_COLORS[index % GEO_COLORS.length] }} 
                        />
                        <span className="truncate text-foreground" title={segment.region}>
                          {truncateName(segment.region, 25)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-muted-foreground tabular-nums">
                          {formatPercent(segment.revenue, geoTotal)}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatLargeNumber(segment.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(selectedYear?.geoSegments?.length || 0) > 8 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{(selectedYear?.geoSegments?.length || 0) - 8} more regions
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
