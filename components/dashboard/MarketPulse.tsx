'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PulseItem {
  label: string;
  value: string;
  change: number;
  changeStr: string;
  type: 'index' | 'crypto' | 'sentiment';
}

export default function MarketPulse() {
  const [items, setItems] = useState<PulseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const pulseItems: PulseItem[] = [];

      try {
        // Fetch market indices
        const marketRes = await fetch('/api/market-overview');
        const marketData = await marketRes.json();
        if (Array.isArray(marketData)) {
          marketData.forEach((item: any) => {
            pulseItems.push({
              label: item.symbol || item.name,
              value: `$${item.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}`,
              change: item.changesPercentage ?? 0,
              changeStr: `${item.changesPercentage >= 0 ? '+' : ''}${item.changesPercentage?.toFixed(2) ?? '0.00'}%`,
              type: 'index',
            });
          });
        }
      } catch (e) {
        console.error('MarketPulse: market-overview fetch failed', e);
      }

      try {
        // Fetch crypto
        const cryptoRes = await fetch('/api/crypto-prices', { cache: 'no-store' });
        const cryptoData = await cryptoRes.json();
        if (Array.isArray(cryptoData)) {
          const top = cryptoData.slice(0, 2); // BTC, ETH
          top.forEach((item: any) => {
            const price = item.currentPrice ?? item.current_price;
            const pct = item.priceChangePercentage24h ?? item.price_change_percentage_24h ?? 0;
            pulseItems.push({
              label: (item.symbol || '').toUpperCase(),
              value: `$${price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}`,
              change: pct,
              changeStr: `${pct >= 0 ? '+' : ''}${pct?.toFixed(2)}%`,
              type: 'crypto',
            });
          });
        }
      } catch (e) {
        console.error('MarketPulse: crypto-prices fetch failed', e);
      }

      try {
        // Fetch VIX from sentiment
        const sentRes = await fetch('/api/market-sentiment');
        const sentData = await sentRes.json();
        if (sentData?.vix) {
          pulseItems.push({
            label: 'VIX',
            value: sentData.vix.current?.toFixed(2) ?? '—',
            change: sentData.vix.changePercent ?? 0,
            changeStr: `${sentData.vix.changePercent >= 0 ? '+' : ''}${sentData.vix.changePercent?.toFixed(2) ?? '0.00'}%`,
            type: 'sentiment',
          });
        }
      } catch (e) {
        console.error('MarketPulse: market-sentiment fetch failed', e);
      }

      try {
        // Fetch Fear & Greed
        const fgRes = await fetch('/api/fear-greed-index');
        const fgData = await fgRes.json();
        if (fgData?.current) {
          const val = fgData.current.value;
          const prev = fgData.previousClose ?? val;
          const chg = prev ? ((val - prev) / prev) * 100 : 0;
          pulseItems.push({
            label: 'Fear/Greed',
            value: `${val}`,
            change: chg,
            changeStr: fgData.current.rating,
            type: 'sentiment',
          });
        }
      } catch (e) {
        console.error('MarketPulse: fear-greed-index fetch failed', e);
      }

      setItems(pulseItems);
      setLoading(false);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-card/60 backdrop-blur border border-border overflow-x-auto">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse">
            <div className="h-3 w-10 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-3 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-2.5 rounded-xl bg-card/60 backdrop-blur border border-border overflow-x-auto scrollbar-hide">
      {items.map((item, idx) => (
        <div key={item.label} className="flex items-center">
          {idx > 0 && (
            <div className="w-px h-5 bg-border mx-2 flex-shrink-0" />
          )}
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors flex-shrink-0">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {item.label}
            </span>
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {item.value}
            </span>
            <span
              className={`flex items-center gap-0.5 text-xs font-medium whitespace-nowrap ${
                item.type === 'sentiment' && item.label === 'Fear/Greed'
                  ? 'text-muted-foreground'
                  : item.change >= 0
                  ? 'text-green-500'
                  : 'text-red-500'
              }`}
            >
              {item.type !== 'sentiment' || item.label !== 'Fear/Greed' ? (
                item.change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )
              ) : null}
              {item.changeStr}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
