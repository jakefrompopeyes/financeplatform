'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator, TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DCFData {
  symbol: string;
  dcf: number | null;
  stockPrice: number | null;
  date: string | null;
  priceDifference: number | null;
  percentageDifference: number | null;
  isUndervalued: boolean | null;
  message?: string;
}

export default function DCFValuation({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  const [data, setData] = useState<DCFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    fetch(`/api/dcf-valuation?symbol=${symbol}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
          setData(null);
        } else {
          // Use current price from props if available and dcf data doesn't have it
          if (currentPrice && !result.stockPrice) {
            result.stockPrice = currentPrice;
            if (result.dcf !== null && result.dcf > 0) {
              result.priceDifference = result.dcf - currentPrice;
              result.percentageDifference = ((result.dcf - currentPrice) / currentPrice) * 100;
              result.isUndervalued = result.dcf > currentPrice;
            }
          }
          setData(result);
        }
      })
      .catch(() => {
        setError('Failed to load DCF data');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [symbol, currentPrice]);

  const formatNumber = (num: number | null, decimals = 2) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatPercent = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show component if no DCF data available
  if (!data || data.dcf === null || error) {
    return null;
  }

  const isUndervalued = data.isUndervalued === true;
  const isOvervalued = data.isUndervalued === false;
  const priceUsed = data.stockPrice ?? currentPrice ?? 0;
  const upsidePercent = data.percentageDifference ?? 0;

  // Calculate the position for the gauge visualization
  // Map percentage difference to a -100 to +100 scale, clamped
  const gaugePosition = Math.max(-100, Math.min(100, upsidePercent));
  const gaugePercent = ((gaugePosition + 100) / 200) * 100;

  return (
    <Card className="mb-8 overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
              <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">DCF Valuation</h2>
              <p className="text-sm text-muted-foreground">
                Discounted Cash Flow intrinsic value estimate
              </p>
            </div>
          </div>
          {data.date && (
            <span className="text-xs text-muted-foreground">
              Updated: {new Date(data.date).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Main Valuation Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* DCF Value */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-muted-foreground">Fair Value (DCF)</span>
            </div>
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              ${formatNumber(data.dcf)}
            </span>
          </div>

          {/* Current Price */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50 border border-border">
            <span className="text-sm font-medium text-muted-foreground mb-1">Current Price</span>
            <span className="text-3xl font-bold">
              ${formatNumber(priceUsed)}
            </span>
          </div>

          {/* Upside/Downside */}
          <div className={cn(
            "flex flex-col items-center justify-center p-4 rounded-xl border",
            isUndervalued 
              ? "bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20"
              : isOvervalued 
                ? "bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20"
                : "bg-muted/50 border-border"
          )}>
            <div className="flex items-center gap-2 mb-1">
              {isUndervalued ? (
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : isOvervalued ? (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {isUndervalued ? 'Potential Upside' : isOvervalued ? 'Potential Downside' : 'Difference'}
              </span>
            </div>
            <span className={cn(
              "text-3xl font-bold",
              isUndervalued && "text-green-600 dark:text-green-400",
              isOvervalued && "text-red-600 dark:text-red-400"
            )}>
              {formatPercent(upsidePercent)}
            </span>
          </div>
        </div>

        {/* Valuation Gauge */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Overvalued</span>
            <span>Fair Value</span>
            <span>Undervalued</span>
          </div>
          <div className="relative h-4 rounded-full bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-green-500/30 overflow-hidden">
            {/* Center line for fair value */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-muted-foreground/30 -translate-x-1/2" />
            
            {/* Current position indicator */}
            <div 
              className="absolute top-0 bottom-0 w-3 rounded-full bg-foreground shadow-lg transition-all duration-500"
              style={{ left: `calc(${gaugePercent}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>-100%</span>
            <span>0%</span>
            <span>+100%</span>
          </div>
        </div>

        {/* Valuation Status Badge */}
        <div className="flex items-center justify-center">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            isUndervalued 
              ? "bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20"
              : isOvervalued
                ? "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"
                : "bg-muted text-muted-foreground border border-border"
          )}>
            {isUndervalued ? (
              <>
                <TrendingUp className="w-4 h-4" />
                Stock appears undervalued by {formatPercent(Math.abs(upsidePercent))}
              </>
            ) : isOvervalued ? (
              <>
                <TrendingDown className="w-4 h-4" />
                Stock appears overvalued by {formatPercent(Math.abs(upsidePercent))}
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Trading near fair value
              </>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            DCF valuations are estimates based on projected cash flows and discount rates. 
            This is not financial advice. Always conduct your own research.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
