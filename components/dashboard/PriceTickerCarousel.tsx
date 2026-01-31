'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { FlipPrice, FlipPercent } from '@/components/ui/FlipNumber';

const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
};

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: 'stock' | 'crypto';
  image?: string;
}

export default function PriceTickerCarousel() {
  const router = useRouter();
  const [data, setData] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  const handleTickerClick = (item: TickerItem) => {
    if (item.type === 'stock') {
      router.push(`/stock/${item.symbol}`);
    } else {
      const cryptoId = CRYPTO_ID_MAP[item.symbol] || item.symbol.toLowerCase();
      router.push(`/crypto/${cryptoId}`);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/price-ticker', { cache: 'no-store' });
        const result = await response.json();
        
        if (result.error) {
          console.error('API Error:', result.error);
          setData([]);
        } else if (Array.isArray(result)) {
          // Duplicate the array for seamless loop
          setData([...result, ...result]);
        } else {
          console.error('Invalid data format:', result);
          setData([]);
        }
      } catch (error) {
        console.error('Error fetching ticker data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every 1 minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-16 bg-muted/30 rounded-lg animate-pulse"></div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full overflow-hidden bg-muted/20 rounded-lg border border-border/50 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Live prices could not be loaded. Ensure <code className="text-xs bg-muted px-1 rounded">FMP_API_KEY</code> and <code className="text-xs bg-muted px-1 rounded">COINGECKO_API_KEY</code> are set in <code className="text-xs bg-muted px-1 rounded">.env.local</code> and restart the dev server.
        </p>
      </div>
    );
  }

  // Duplicate for seamless infinite scroll
  const displayData = [...data, ...data];

  return (
    <div className="w-full overflow-hidden bg-muted/20 rounded-lg border border-border/50">
      <div className="relative h-16 flex items-center">
        <div className="flex animate-scroll whitespace-nowrap will-change-transform">
          {displayData.map((item, index) => {
            const isPositive = item.changePercent >= 0;
            return (
              <button
                type="button"
                key={`${item.symbol}-${index}`}
                onClick={() => handleTickerClick(item)}
                className="flex items-center gap-4 px-6 border-r border-border/50 flex-shrink-0 cursor-pointer hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset rounded-sm text-left"
              >
                <div className="flex items-center gap-2 min-w-[120px]">
                  {item.type === 'crypto' ? (
                    item.image ? (
                      <img 
                        src={item.image} 
                        alt="" 
                        className="w-5 h-5 rounded object-contain flex-shrink-0 bg-muted/30"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-muted/30 flex-shrink-0 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                        {item.symbol.slice(0, 2)}
                      </div>
                    )
                  ) : item.image ? (
                    <img 
                      src={item.image} 
                      alt="" 
                      className="w-5 h-5 rounded object-contain flex-shrink-0 bg-muted/30"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : null}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      {item.symbol}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {item.name}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[100px] flex-shrink-0">
                  <div className="text-sm font-light text-foreground">
                    <FlipPrice value={item.price} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="w-3 h-3 flex-shrink-0" />
                    )}
                    <span>{isPositive ? '+' : ''}{item.change.toFixed(2)}</span>
                    <span>(<FlipPercent value={item.changePercent} className="inline" />)</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

