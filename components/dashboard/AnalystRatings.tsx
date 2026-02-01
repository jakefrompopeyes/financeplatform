'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalystRating {
  rating: string | null;
  ratingScore: number | null;
  ratingRecommendation: string | null;
  ratingDetailsDCFScore: number | null;
  ratingDetailsDCFRecommendation: string | null;
  ratingDetailsROEScore: number | null;
  ratingDetailsROERecommendation: string | null;
  ratingDetailsDEScore: number | null;
  ratingDetailsDERecommendation: string | null;
  ratingDetailsPEScore: number | null;
  ratingDetailsPERecommendation: string | null;
  ratingDetailsPBScore: number | null;
  ratingDetailsPBRecommendation: string | null;
  date: string | null;
}

interface AnalystEstimate {
  date: string | null;
  estimatedRevenueAvg: number | null;
  estimatedEpsAvg: number | null;
  estimatedEpsHigh: number | null;
  estimatedEpsLow: number | null;
  numberAnalystEstimatedRevenue: number | null;
  numberAnalystsEstimatedEps: number | null;
}

interface AnalystData {
  symbol: string;
  rating: AnalystRating | null;
  estimates: AnalystEstimate[];
}

export default function AnalystRatings({ symbol }: { symbol: string }) {
  const [data, setData] = useState<AnalystData | null>(null);
  const [loading, setLoading] = useState(true);
  const [planUpgradeRequired, setPlanUpgradeRequired] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    
    setLoading(true);
    fetch(`/api/analyst-ratings?symbol=${symbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setData(data);
          setPlanUpgradeRequired(false);
        } else {
          setData(null);
          setPlanUpgradeRequired(data.planUpgradeRequired || false);
        }
      })
      .catch(() => {
        setData(null);
        setPlanUpgradeRequired(false);
      })
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.rating && data.estimates.length === 0)) {
    if (planUpgradeRequired) {
      return (
        <Card className="mb-8 border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold tracking-tight">Analyst Ratings & Estimates</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyst ratings and estimates are not available with your current FMP plan.
                </p>
                <a 
                  href="https://site.financialmodelingprep.com/pricing-plans" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  Upgrade your FMP plan
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const rating = data.rating;
  const latestEstimate = data.estimates && data.estimates.length > 0 ? data.estimates[0] : null;

  const getRatingColor = (recommendation: string | null) => {
    if (!recommendation) return 'text-muted-foreground';
    const rec = recommendation.toLowerCase();
    if (rec.includes('strong buy') || rec.includes('buy')) return 'text-green-600 dark:text-green-400';
    if (rec.includes('sell')) return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getRatingIcon = (recommendation: string | null) => {
    if (!recommendation) return <Minus className="w-5 h-5" />;
    const rec = recommendation.toLowerCase();
    if (rec.includes('buy')) return <TrendingUp className="w-5 h-5" />;
    if (rec.includes('sell')) return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  const formatLargeNumber = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Analyst Ratings & Estimates</h2>
            <p className="text-sm text-muted-foreground">Professional analysis and price targets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overall Rating */}
          {rating && rating.ratingRecommendation && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Overall Rating</h3>
              <div className="flex items-center gap-4">
                <div className={cn("flex items-center gap-2", getRatingColor(rating.ratingRecommendation))}>
                  {getRatingIcon(rating.ratingRecommendation)}
                  <span className="text-2xl font-bold">{rating.ratingRecommendation}</span>
                </div>
                {rating.ratingScore !== null && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
                    <span className="text-xs text-muted-foreground">Score:</span>
                    <span className="text-sm font-semibold">{rating.ratingScore.toFixed(1)}/5</span>
                  </div>
                )}
              </div>
              {rating.date && (
                <p className="text-xs text-muted-foreground">
                  Updated: {new Date(rating.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}

              {/* Rating Details */}
              {(rating.ratingDetailsDCFRecommendation || rating.ratingDetailsROERecommendation || 
                rating.ratingDetailsDERecommendation || rating.ratingDetailsPERecommendation) && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rating Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {rating.ratingDetailsDCFRecommendation && (
                      <div className="flex justify-between items-center py-1.5 px-2 bg-muted/30 rounded">
                        <span className="text-xs text-muted-foreground">DCF Valuation</span>
                        <span className={cn("text-xs font-medium", getRatingColor(rating.ratingDetailsDCFRecommendation))}>
                          {rating.ratingDetailsDCFRecommendation}
                        </span>
                      </div>
                    )}
                    {rating.ratingDetailsROERecommendation && (
                      <div className="flex justify-between items-center py-1.5 px-2 bg-muted/30 rounded">
                        <span className="text-xs text-muted-foreground">ROE</span>
                        <span className={cn("text-xs font-medium", getRatingColor(rating.ratingDetailsROERecommendation))}>
                          {rating.ratingDetailsROERecommendation}
                        </span>
                      </div>
                    )}
                    {rating.ratingDetailsDERecommendation && (
                      <div className="flex justify-between items-center py-1.5 px-2 bg-muted/30 rounded">
                        <span className="text-xs text-muted-foreground">D/E Ratio</span>
                        <span className={cn("text-xs font-medium", getRatingColor(rating.ratingDetailsDERecommendation))}>
                          {rating.ratingDetailsDERecommendation}
                        </span>
                      </div>
                    )}
                    {rating.ratingDetailsPERecommendation && (
                      <div className="flex justify-between items-center py-1.5 px-2 bg-muted/30 rounded">
                        <span className="text-xs text-muted-foreground">P/E Ratio</span>
                        <span className={cn("text-xs font-medium", getRatingColor(rating.ratingDetailsPERecommendation))}>
                          {rating.ratingDetailsPERecommendation}
                        </span>
                      </div>
                    )}
                    {rating.ratingDetailsPBRecommendation && (
                      <div className="flex justify-between items-center py-1.5 px-2 bg-muted/30 rounded">
                        <span className="text-xs text-muted-foreground">P/B Ratio</span>
                        <span className={cn("text-xs font-medium", getRatingColor(rating.ratingDetailsPBRecommendation))}>
                          {rating.ratingDetailsPBRecommendation}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analyst Estimates */}
          {latestEstimate && (latestEstimate.estimatedEpsAvg !== null || latestEstimate.estimatedRevenueAvg !== null) && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Consensus Estimates</h3>
              
              {latestEstimate.estimatedEpsAvg !== null && (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">EPS Estimate</span>
                    <span className="text-2xl font-bold">${latestEstimate.estimatedEpsAvg.toFixed(2)}</span>
                  </div>
                  {latestEstimate.estimatedEpsLow !== null && latestEstimate.estimatedEpsHigh !== null && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Range: ${latestEstimate.estimatedEpsLow.toFixed(2)} - ${latestEstimate.estimatedEpsHigh.toFixed(2)}</span>
                      {latestEstimate.numberAnalystsEstimatedEps && (
                        <span>{latestEstimate.numberAnalystsEstimatedEps} analysts</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {latestEstimate.estimatedRevenueAvg !== null && (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Revenue Estimate</span>
                    <span className="text-2xl font-bold">{formatLargeNumber(latestEstimate.estimatedRevenueAvg)}</span>
                  </div>
                  {latestEstimate.numberAnalystEstimatedRevenue && (
                    <div className="flex items-center justify-end text-xs text-muted-foreground">
                      <span>{latestEstimate.numberAnalystEstimatedRevenue} analysts</span>
                    </div>
                  )}
                </div>
              )}

              {latestEstimate.date && (
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Estimate period: {new Date(latestEstimate.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Data from Financial Modeling Prep. Analyst ratings and estimates are updated periodically and should be used as one factor in investment decisions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
