'use client';

import { useEffect, useState, Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SECFiling {
  symbol: string;
  cik: string | null;
  acceptedDate: string | null;
  filingDate: string | null;
  type: string | null;
  title: string | null;
  link: string | null;
  description: string;
}

interface SECFilingsData {
  symbol: string;
  filings: SECFiling[];
}

export default function SECFilings({ symbol }: { symbol: string }) {
  const [data, setData] = useState<SECFilingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['8-K']));
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    
    setLoading(true);
    fetch(`/api/sec-filings?symbol=${symbol}&limit=30`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && data.filings) {
          setData(data);
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

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

  if (!data || data.filings.length === 0) {
    return null;
  }

  // Group filings by type
  const filingsByType = data.filings.reduce((acc, filing) => {
    const type = filing.type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(filing);
    return acc;
  }, {} as { [key: string]: SECFiling[] });

  // Sort types by importance
  const priorityTypes = ['8-K', '10-K', '10-Q', 'DEF 14A', '4', 'S-1', 'S-3', '13F-HR', '13D', '13G'];
  const sortedTypes = Object.keys(filingsByType).sort((a, b) => {
    const aIdx = priorityTypes.indexOf(a);
    const bIdx = priorityTypes.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  const displayTypes = showAll ? sortedTypes : sortedTypes.slice(0, 6);

  const getTypeColor = (type: string | null) => {
    if (!type) return 'bg-muted';
    if (type === '8-K') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    if (type === '10-K') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (type === '10-Q') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (type === 'DEF 14A') return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    if (type === '4') return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    return 'bg-muted/50 text-muted-foreground border-muted';
  };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">SEC Filings</h2>
            <p className="text-sm text-muted-foreground">Recent regulatory filings and disclosures</p>
          </div>
        </div>

        <div className="space-y-3">
          {displayTypes.map((type) => {
            const filings = filingsByType[type];
            const isExpanded = expandedTypes.has(type);
            const latestFiling = filings[0];
            const description = latestFiling.description;

            return (
              <div key={type} className="border border-border rounded-lg overflow-hidden">
                {/* Type Header */}
                <button
                  onClick={() => toggleType(type)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("px-2 py-1 rounded text-xs font-mono font-medium border", getTypeColor(type))}>
                      {type}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">{description}</div>
                      <div className="text-xs text-muted-foreground">
                        {filings.length} filing{filings.length !== 1 ? 's' : ''} • Latest: {
                          latestFiling.acceptedDate 
                            ? new Date(latestFiling.acceptedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Filings */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20">
                    {filings.map((filing, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start justify-between gap-3 p-3 hover:bg-muted/30 transition-colors",
                          idx !== filings.length - 1 && "border-b border-border/50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" title={filing.title || undefined}>
                            {filing.title || filing.type || 'SEC Filing'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {filing.acceptedDate 
                              ? new Date(filing.acceptedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : 'Date unknown'
                            }
                          </div>
                        </div>
                        {filing.link && (
                          <a
                            href={filing.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-2 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            aria-label="View SEC filing"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sortedTypes.length > 6 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAll ? 'Show Less' : `Show ${sortedTypes.length - 6} More Filing Types`}
          </button>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Filing Types:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 pl-2">
              <li><strong>8-K:</strong> Material events (acquisitions, CEO changes, etc.)</li>
              <li><strong>10-K:</strong> Annual reports with full financials</li>
              <li><strong>10-Q:</strong> Quarterly reports</li>
              <li><strong>DEF 14A:</strong> Proxy statements (executive compensation, voting)</li>
              <li><strong>Form 4:</strong> Insider trading activity</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
