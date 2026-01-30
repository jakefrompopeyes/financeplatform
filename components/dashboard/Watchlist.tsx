'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { X, TrendingUp, TrendingDown, Star, Clock } from 'lucide-react';

const STOCK_LOGO_BASE = 'https://financialmodelingprep.com/image-stock';

interface WatchlistAsset {
  symbol: string;
  price?: number;
  change?: number;
  changePercent?: number;
  type: 'stock' | 'crypto';
  viewedAt?: number; // timestamp for recently viewed
  image?: string;
}

type ViewMode = 'watchlist' | 'recent';

interface WatchlistProps {
  onSelectAsset?: (symbol: string) => void;
  recentlyViewed?: string[]; // symbols of recently viewed assets
}

export default function Watchlist({ onSelectAsset, recentlyViewed = [] }: WatchlistProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('watchlist');
  const [watchlist, setWatchlist] = useState<WatchlistAsset[]>([]);
  const [recentAssets, setRecentAssets] = useState<WatchlistAsset[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  
  // Use refs to avoid stale closure issues in intervals
  const watchlistRef = useRef<WatchlistAsset[]>([]);
  const recentAssetsRef = useRef<WatchlistAsset[]>([]);
  
  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);
  
  useEffect(() => {
    recentAssetsRef.current = recentAssets;
  }, [recentAssets]);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      setWatchlist(JSON.parse(saved));
    } else {
      // Default watchlist
      setWatchlist([
        { symbol: 'AAPL', type: 'stock' },
        { symbol: 'GOOGL', type: 'stock' },
        { symbol: 'MSFT', type: 'stock' },
        { symbol: 'BTC', type: 'crypto' },
        { symbol: 'ETH', type: 'crypto' },
      ]);
    }
  }, []);

  // Load recently viewed from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentlyViewed');
    if (saved) {
      const recent = JSON.parse(saved);
      setRecentAssets(recent);
    }
  }, []); // Remove recentlyViewed dependency to prevent infinite loop

  // Fetch prices for assets
  const fetchPricesForAssets = async (assets: WatchlistAsset[]) => {
    return await Promise.all(
      assets.map(async (asset) => {
        try {
          if (asset.type === 'stock') {
            const response = await fetch(`/api/stock-details?symbol=${asset.symbol}`);
            if (response.ok) {
              const data = await response.json();
              return {
                ...asset,
                price: parseFloat(data.price),
                change: parseFloat(data.change),
                changePercent: (() => {
                const p = data.changePercent ?? data.percent_change;
                const n = p != null ? Number(p) : NaN;
                return Number.isFinite(n) ? n : undefined;
              })(),
                image: data.image ?? (asset.type === 'stock' ? `${STOCK_LOGO_BASE}/${asset.symbol}.png` : undefined),
              };
            }
          } else if (asset.type === 'crypto') {
            const cryptoMap: { [key: string]: string } = {
              'BTC': 'bitcoin',
              'ETH': 'ethereum',
              'BNB': 'binancecoin',
              'SOL': 'solana',
              'XRP': 'ripple',
              'ADA': 'cardano',
              'DOGE': 'dogecoin',
              'DOT': 'polkadot',
            };
            const cryptoId = cryptoMap[asset.symbol] || asset.symbol.toLowerCase();
            const response = await fetch('/api/crypto-prices');
            if (response.ok) {
              const data = await response.json();
              // API returns array at top level (not data.prices)
              const list = Array.isArray(data) ? data : data?.prices ?? [];
              const crypto = list.find((c: any) => (c.id || c.symbol?.toLowerCase()) === cryptoId);
              if (crypto) {
                const price = crypto.currentPrice ?? crypto.current_price;
                const change = crypto.priceChange24h ?? crypto.price_change_24h;
                const pct = crypto.priceChangePercentage24h ?? crypto.price_change_percentage_24h;
                return {
                  ...asset,
                  price: price != null ? Number(price) : undefined,
                  change: change != null ? Number(change) : undefined,
                  changePercent: pct != null && Number.isFinite(Number(pct)) ? Number(pct) : undefined,
                };
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching price for ${asset.symbol}:`, error);
        }
        return asset;
      })
    );
  };

  // Fetch prices for watchlist assets
  useEffect(() => {
    if (watchlist.length === 0) return;

    let isMounted = true;

    const fetchPrices = async () => {
      const currentWatchlist = watchlistRef.current;
      const updatedWatchlist = await fetchPricesForAssets(currentWatchlist);
      if (isMounted) {
        setWatchlist(updatedWatchlist);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length]);

  // Fetch prices for recently viewed assets
  useEffect(() => {
    if (recentAssets.length === 0) return;

    let isMounted = true;

    const fetchPrices = async () => {
      const currentRecentAssets = recentAssetsRef.current;
      const updatedRecent = await fetchPricesForAssets(currentRecentAssets);
      if (isMounted) {
        setRecentAssets(updatedRecent);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentAssets.length]);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    if (watchlist.length > 0) {
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }
  }, [watchlist]);

  const handleRemoveAsset = (symbol: string) => {
    setWatchlist(watchlist.filter(asset => asset.symbol !== symbol));
    toast.success(`${symbol} removed from watchlist`);
  };

  const formatPrice = (price: number | undefined, type: string) => {
    if (price === undefined || price === null) return '---';
    if (type === 'crypto' && price < 1) {
      return `$${price.toFixed(4)}`;
    }
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatChange = (change: number | undefined, changePercent: number | undefined) => {
    if (changePercent === undefined || changePercent === null || !Number.isFinite(changePercent)) return '—';
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const currentList = viewMode === 'watchlist' ? watchlist : recentAssets;

  // Update content height when currentList changes
  useEffect(() => {
    if (innerContentRef.current && !isTransitioning) {
      const height = innerContentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, [currentList, isTransitioning]);

  // Handle mode change with transition
  const handleModeChange = (checked: boolean) => {
    // Capture current height before transition
    if (innerContentRef.current) {
      const currentHeight = innerContentRef.current.scrollHeight;
      setContentHeight(currentHeight);
    }
    
    setIsTransitioning(true);
    
    // Fade out and switch mode
    setTimeout(() => {
      setViewMode(checked ? 'recent' : 'watchlist');
      
      // Measure new content height and animate to it
      setTimeout(() => {
        if (innerContentRef.current) {
          const newHeight = innerContentRef.current.scrollHeight;
          setContentHeight(newHeight);
        }
        setIsTransitioning(false);
      }, 100);
    }, 250);
  };

  return (
    <div className="sticky top-8">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold transition-all duration-300">
            {viewMode === 'watchlist' ? 'Watchlist' : 'Recently Viewed'}
          </h3>
        </div>

        {/* Mode Toggle Switch */}
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-accent/30">
          <div className="flex items-center gap-2">
            <Star className={`h-4 w-4 transition-all duration-300 ${
              viewMode === 'watchlist' ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <span className={`text-sm font-medium transition-all duration-300 ${
              viewMode === 'watchlist' ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              Watchlist
            </span>
          </div>
          
          <Switch
            checked={viewMode === 'recent'}
            onCheckedChange={handleModeChange}
            className="transition-all duration-300"
          />
          
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-all duration-300 ${
              viewMode === 'recent' ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              Recent
            </span>
            <Clock className={`h-4 w-4 transition-all duration-300 ${
              viewMode === 'recent' ? 'text-primary' : 'text-muted-foreground'
            }`} />
          </div>
        </div>

        <div 
          ref={contentRef}
          className="relative overflow-hidden transition-all duration-700 ease-in-out"
          style={{
            height: contentHeight ? `${contentHeight}px` : 'auto',
            minHeight: '200px'
          }}
        >
          <div 
            ref={innerContentRef}
            className={`space-y-2 transition-all duration-500 ease-in-out ${
              isTransitioning 
                ? 'opacity-0 translate-y-6' 
                : 'opacity-100 translate-y-0'
            }`}
          >
            {currentList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 animate-in fade-in duration-300">
                {viewMode === 'watchlist' 
                  ? 'No assets in watchlist' 
                  : 'No recently viewed assets'}
              </p>
            ) : (
              currentList.map((asset, index) => (
                <Card
                  key={`${asset.symbol}-${asset.viewedAt || ''}`}
                  className="p-3 hover:bg-accent/50 transition-all duration-200 cursor-pointer group relative animate-in fade-in slide-in-from-top-3"
                  style={{ 
                    animationDelay: isTransitioning ? '0ms' : `${index * 60}ms`,
                    animationDuration: '500ms',
                    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onClick={() => {
                    if (asset.type === 'stock') {
                      if (onSelectAsset) {
                        onSelectAsset(asset.symbol);
                      }
                      router.push(`/stock/${asset.symbol}`);
                    } else if (asset.type === 'crypto') {
                      // Map symbol to CoinGecko ID
                      const cryptoMap: { [key: string]: string } = {
                        'BTC': 'bitcoin',
                        'ETH': 'ethereum',
                        'BNB': 'binancecoin',
                        'SOL': 'solana',
                        'XRP': 'ripple',
                        'ADA': 'cardano',
                        'DOGE': 'dogecoin',
                        'DOT': 'polkadot',
                      };
                      const cryptoId = cryptoMap[asset.symbol] || asset.symbol.toLowerCase();
                      router.push(`/crypto/${cryptoId}`);
                    }
                  }}
                >
                  {viewMode === 'watchlist' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAsset(asset.symbol);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}

                  <div className="pr-6">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {(asset.type === 'stock' && (asset.image || true)) && (
                          <img
                            src={asset.image ?? `${STOCK_LOGO_BASE}/${asset.symbol}.png`}
                            alt=""
                            className="w-8 h-8 rounded object-contain bg-muted/50 flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        {asset.type === 'crypto' && asset.image && (
                          <img
                            src={asset.image}
                            alt=""
                            className="w-8 h-8 rounded object-contain bg-muted/50 flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <p className="font-semibold text-sm">{asset.symbol}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {asset.type}
                            {viewMode === 'recent' && asset.viewedAt && (
                              <> · {formatTimeAgo(asset.viewedAt)}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <p className="text-sm font-medium">
                        {formatPrice(asset.price, asset.type)}
                      </p>
                      {asset.changePercent !== undefined && Number.isFinite(asset.changePercent) && (
                        <div className={`flex items-center gap-1 text-xs transition-colors duration-200 ${
                          asset.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {asset.changePercent >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{formatChange(asset.change, asset.changePercent)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center transition-all duration-300">
            {viewMode === 'watchlist' 
              ? 'Click assets to view details'
              : 'Recently viewed assets'}
          </p>
        </div>
      </Card>
    </div>
  );
}

