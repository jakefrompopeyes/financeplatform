'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Newspaper, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
  };
  category?: string;
}

interface NewsData {
  articles: NewsArticle[];
  totalResults: number;
  lastUpdated: string;
  note?: string;
}

interface StockNewsProps {
  symbol: string;
  companyName?: string;
  limit?: number;
}

export default function StockNews({ symbol, companyName, limit = 6 }: StockNewsProps) {
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/financial-news?symbol=${symbol}&limit=${limit}`);
      const result = await response.json();

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      setError('Failed to load news');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      fetchNews();
    }

    // Refresh every 10 minutes
    const interval = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [symbol, limit]);

  const getTimeAgo = (dateString: string) => {
    try {
      // Handle FMP date format: "20240115T143000"
      let date: Date;
      if (dateString.includes('T') && !dateString.includes('-')) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        const hour = dateString.substring(9, 11);
        const minute = dateString.substring(11, 13);
        date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
      } else {
        date = new Date(dateString);
      }

      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 0) return 'Just now';
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">News</h2>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-20 h-14 bg-muted rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render if no news and no error (API might not support this symbol)
  if (!data || data.articles.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold">News for {symbol}</h2>
          </div>
          <div className="text-center py-8 text-muted-foreground">
            <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No recent news found for {companyName || symbol}</p>
            <p className="text-xs mt-1">News availability depends on your API configuration</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">News for {symbol}</h2>
              <p className="text-xs text-muted-foreground">{data.totalResults} articles</p>
            </div>
          </div>
          <button
            onClick={fetchNews}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh news"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* News List */}
        <div className="space-y-4">
          {data.articles.map((article, index) => (
            <a
              key={index}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 group hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
            >
              {article.urlToImage && (
                <div className="w-20 h-14 rounded overflow-hidden shrink-0 bg-muted">
                  <img
                    src={article.urlToImage}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  <span className="font-medium">{article.source.name}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(article.publishedAt)}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
            </a>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground mt-4 pt-4 border-t border-border">
          Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}
