'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Megaphone, Calendar, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EarningsItem {
  earningsDate: string;
  reportDate?: string;
  fiscalPeriod?: string;
  fiscalYear?: number;
  estimatedEPS?: number | null;
  reportedEPS?: number | null;
  surprise?: number | null;
  reportTime?: string;
}

interface LastReported {
  earningsDate: string;
  reportDate?: string;
  fiscalPeriod?: string;
  fiscalYear?: number;
  estimatedEPS?: number | null;
  reportedEPS?: number | null;
  surprise?: number | null;
  reportTime?: string;
}

interface QuarterlyEstimate {
  period: string | null;
  date: string | null;
  revenueEst: number | null;
  epsEst: number | null;
}

export default function FutureEarnings({
  symbol,
  quarterlyEstimates = [],
}: {
  symbol: string;
  quarterlyEstimates?: QuarterlyEstimate[];
}) {
  const [data, setData] = useState<{
    upcoming: EarningsItem[];
    lastReported: LastReported | null;
    error: string | null;
  }>({ upcoming: [], lastReported: null, error: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/earnings-calendar?symbol=${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setData({ upcoming: [], lastReported: null, error: json.error });
          return;
        }
        setData({
          upcoming: json.upcoming ?? [],
          lastReported: json.lastReported ?? null,
          error: null,
        });
      })
      .catch((err) => {
        if (!cancelled) setData({ upcoming: [], lastReported: null, error: err?.message || 'Failed to load' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  const formatNumber = (num: number | null | undefined, decimals = 2) => {
    if (num === null || num === undefined) return '—';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatLargeNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '—';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const nextQuarterRevenue = data.upcoming.length > 0 && quarterlyEstimates.length > 0
    ? quarterlyEstimates[0]?.revenueEst ?? null
    : null;

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Future Earnings</h2>
          </div>
          <div className="h-[160px] flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading earnings data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasUpcoming = data.upcoming.length > 0;
  const hasLast = data.lastReported != null;

  if (data.error && !hasUpcoming && !hasLast) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Future Earnings</h2>
          </div>
          <div className="h-[160px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-md">{data.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Future Earnings</h2>
              <p className="text-sm text-muted-foreground">
                Upcoming report dates with consensus estimates
              </p>
            </div>
          </div>
        </div>

        {hasUpcoming ? (
          <div className="space-y-3">
            {data.upcoming.slice(0, 3).map((e, i) => {
              const dateStr = e.earningsDate || e.reportDate;
              const date = dateStr ? new Date(dateStr) : null;
              const label = date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
              const period = [e.fiscalPeriod, e.fiscalYear].filter(Boolean).join(' ') || null;
              const revenueEst = i === 0 ? nextQuarterRevenue : null;
              const isNext = i === 0;

              return (
                <div
                  key={i}
                  className={cn(
                    "relative rounded-xl border p-4 transition-all",
                    isNext 
                      ? "border-primary/30 bg-gradient-to-r from-primary/5 to-transparent" 
                      : "border-border/50 bg-muted/20"
                  )}
                >
                  {isNext && (
                    <span className="absolute -top-2.5 left-4 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-primary text-primary-foreground rounded-full">
                      Next Report
                    </span>
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isNext ? "bg-primary/10" : "bg-muted/50"
                      )}>
                        <Calendar className={cn("w-4 h-4", isNext ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{label}</span>
                        {period && <span className="text-muted-foreground text-sm ml-2">({period})</span>}
                        {e.reportTime && e.reportTime !== 'Unknown' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{e.reportTime}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      {e.estimatedEPS != null && !Number.isNaN(e.estimatedEPS) && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Est. EPS</p>
                          <p className="text-sm font-semibold tabular-nums text-foreground">${formatNumber(e.estimatedEPS)}</p>
                        </div>
                      )}
                      {revenueEst != null && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Est. Revenue</p>
                          <p className="text-sm font-semibold tabular-nums text-foreground">{formatLargeNumber(revenueEst)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-muted/20 p-6 text-center">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No upcoming earnings dates available.</p>
          </div>
        )}

        {hasLast && (
          <div className="mt-6 pt-6 border-t border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Last Reported
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-medium text-foreground">
                    {data.lastReported!.earningsDate || data.lastReported!.reportDate
                      ? new Date(data.lastReported!.earningsDate || data.lastReported!.reportDate!).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                  {[data.lastReported!.fiscalPeriod, data.lastReported!.fiscalYear].filter(Boolean).length > 0 && (
                    <span className="text-muted-foreground text-sm ml-2">
                      ({[data.lastReported!.fiscalPeriod, data.lastReported!.fiscalYear].filter(Boolean).join(' ')})
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {data.lastReported!.reportedEPS != null && !Number.isNaN(data.lastReported!.reportedEPS) && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Reported EPS</p>
                      <p className="text-sm font-semibold tabular-nums">${formatNumber(data.lastReported!.reportedEPS)}</p>
                    </div>
                  )}
                  {data.lastReported!.surprise != null && !Number.isNaN(data.lastReported!.surprise) && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                      data.lastReported!.surprise >= 0 
                        ? "bg-emerald-500/10 text-emerald-500" 
                        : "bg-rose-500/10 text-rose-500"
                    )}>
                      {data.lastReported!.surprise >= 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          <span>{formatNumber(data.lastReported!.surprise)}% beat</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4" />
                          <span>{formatNumber(Math.abs(data.lastReported!.surprise))}% miss</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
