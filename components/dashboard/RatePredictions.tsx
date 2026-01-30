'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';

interface FedWatchOutcome {
  target: string;
  probability: number;
  description: string;
}

interface FedWatchData {
  meeting: {
    date: string;
    type: string;
  };
  currentTarget: string;
  outcomes: FedWatchOutcome[];
  lastUpdated: string;
  source: string;
  note?: string;
  disclaimer?: string;
}

export default function RatePredictions() {
  const [data, setData] = useState<FedWatchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/cme-fedwatch');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching CME FedWatch data:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 15 minutes (CME data updates less frequently)
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-normal text-foreground">December Fed Rate Probabilities</h2>
          <span className="text-xs text-muted-foreground">CME FedWatch Tool</span>
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.outcomes || data.outcomes.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-normal text-foreground">December Fed Rate Probabilities</h2>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Unable to load Fed rate probabilities</p>
              <p className="text-sm">CME FedWatch data temporarily unavailable</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'TBD';
      return date.toLocaleDateString('en-US', { 
        month: 'long',
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'TBD';
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  };

  const topOutcome = data.outcomes.reduce((max, outcome) => 
    outcome.probability > max.probability ? outcome : max
  , data.outcomes[0]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-normal text-foreground">December Fed Rate Probabilities</h2>
        <span className="text-xs text-muted-foreground">
          CME FedWatch Tool
        </span>
      </div>
      
      {data.note && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ {data.note}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <div className="space-y-2">
            <CardTitle className="text-lg font-normal text-foreground">
              {data.meeting.type} - {formatDate(data.meeting.date)}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Current Target: <span className="text-foreground font-medium">{data.currentTarget}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Probability Bars */}
          <div className="space-y-3">
            {data.outcomes.map((outcome, idx) => {
              const isTopOutcome = outcome.probability === topOutcome.probability;
              
              // Color based on description
              let barColor = 'bg-primary'; // default blue
              const description = outcome.description.toLowerCase();
              
              if (description.includes('cut')) {
                barColor = 'bg-green-500'; // Rate cuts are green
              } else if (description.includes('hike') || description.includes('increase')) {
                barColor = 'bg-red-500'; // Rate hikes are red
              } else if (description.includes('no change')) {
                barColor = 'bg-amber-500'; // No change is amber
              }
              
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-base text-foreground font-medium">{outcome.target}</span>
                      <span className="text-xs text-muted-foreground">{outcome.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-light text-foreground ${isTopOutcome ? 'font-normal' : ''}`}>
                        {outcome.probability.toFixed(1)}%
                      </span>
                      {isTopOutcome && (
                        <TrendingUp className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.max(0, Math.min(100, outcome.probability))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Source Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
            <div className="flex flex-col gap-1">
              <span className="text-xs">Based on 30-Day Fed Funds futures</span>
              {data.disclaimer && (
                <span className="text-xs text-muted-foreground/70">{data.disclaimer}</span>
              )}
            </div>
            <a
              href="https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors text-sm font-medium"
            >
              CME FedWatch Tool
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
}

