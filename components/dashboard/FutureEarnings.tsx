'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Megaphone, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
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
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Future earnings
          </h2>
          <div className="h-24 flex items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasUpcoming = data.upcoming.length > 0;
  const hasLast = data.lastReported != null;

  if (data.error && !hasUpcoming && !hasLast) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Future earnings
          </h2>
          <p className="text-sm text-muted-foreground py-4">{data.error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          Future earnings
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Upcoming report dates with consensus estimates. Last reported quarter for comparison.
        </p>

        {hasUpcoming ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Upcoming
              </h3>
              <ul className="space-y-3">
                {data.upcoming.slice(0, 4).map((e, i) => {
                  const dateStr = e.earningsDate || e.reportDate;
                  const date = dateStr ? new Date(dateStr) : null;
                  const label = date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
                  const period = [e.fiscalPeriod, e.fiscalYear].filter(Boolean).join(' ') || null;
                  const revenueEst = i === 0 ? nextQuarterRevenue : null;
                  return (
                    <li
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 px-3 rounded-lg bg-muted/40 border border-border/50"
                    >
                      <div>
                        <span className="font-medium">{label}</span>
                        {period && <span className="text-muted-foreground text-sm ml-2">({period})</span>}
                        {e.reportTime && e.reportTime !== 'Unknown' && (
                          <span className="text-muted-foreground text-xs block mt-0.5">{e.reportTime}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm tabular-nums">
                        {e.estimatedEPS != null && !Number.isNaN(e.estimatedEPS) && (
                          <span className="text-muted-foreground">
                            Est. EPS: <span className="font-medium text-foreground">${formatNumber(e.estimatedEPS)}</span>
                          </span>
                        )}
                        {revenueEst != null && (
                          <span className="text-muted-foreground">
                            Est. revenue: <span className="font-medium text-foreground">{formatLargeNumber(revenueEst)}</span>
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">No upcoming earnings dates available.</p>
        )}

        {hasLast && (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              Last reported
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/30">
              <div>
                <span className="font-medium">
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
              <div className="flex flex-wrap items-center gap-4 text-sm tabular-nums">
                {data.lastReported!.reportedEPS != null && !Number.isNaN(data.lastReported!.reportedEPS) && (
                  <span className="text-muted-foreground">
                    EPS: <span className="font-medium text-foreground">${formatNumber(data.lastReported!.reportedEPS)}</span>
                  </span>
                )}
                {data.lastReported!.surprise != null && !Number.isNaN(data.lastReported!.surprise) && (
                  <span
                    className={cn(
                      'font-medium',
                      data.lastReported!.surprise >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {data.lastReported!.surprise >= 0 ? (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {formatNumber(data.lastReported!.surprise)}% beat
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" />
                        {formatNumber(data.lastReported!.surprise)}% miss
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
