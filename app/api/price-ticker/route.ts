import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const FMP_STABLE_URL = 'https://financialmodelingprep.com/stable';
const FMP_V3_URL = 'https://financialmodelingprep.com/api/v3';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

const POPULAR_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
const LOGO_BASE = 'https://financialmodelingprep.com/image-stock';

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: 'stock' | 'crypto';
  image?: string;
}

export async function GET() {
  try {
    const tickerItems: TickerItem[] = [];

    // Fetch popular stocks: try stable batch-quote first, then v3 quote (free tier)
    if (FMP_API_KEY && FMP_API_KEY !== 'your_api_key_here') {
      const symbolsParam = POPULAR_STOCKS.join(',');

      // 1) Try stable batch-quote (paid starter+; returns array or wrapped)
      try {
        const batchRes = await fetch(
          `${FMP_STABLE_URL}/batch-quote?symbols=${symbolsParam}&apikey=${FMP_API_KEY}`,
          { cache: 'no-store' }
        );
        const text = await batchRes.text();
        let raw: any;
        try {
          raw = text ? JSON.parse(text) : null;
        } catch {
          // fall through to v3
        }
        const batchData: any[] = Array.isArray(raw)
          ? raw
          : raw?.data ?? raw?.quotes ?? raw?.results ?? (Array.isArray(raw?.quote) ? raw.quote : []);
        if (batchRes.ok && batchData.length > 0) {
          const stockItems: TickerItem[] = batchData
            .filter((q: any) => q?.symbol != null && (q?.price != null || q?.last != null))
            .map((q: any) => {
              const price = parseFloat(q.price ?? q.last ?? q.close ?? 0);
              const prevClose = parseFloat(q.previousClose ?? q.dayBefore ?? q.price ?? q.last ?? price);
              const change =
                typeof q.change === 'number'
                  ? q.change
                  : typeof q.change === 'string'
                    ? parseFloat(q.change) || 0
                    : price - prevClose;
              const changePercent =
                typeof q.changesPercentage === 'number'
                  ? q.changesPercentage
                  : typeof q.changesPercentage === 'string'
                    ? parseFloat(q.changesPercentage) || 0
                    : prevClose !== 0
                      ? (change / prevClose) * 100
                      : 0;
              const symbol = (q.symbol || '').toUpperCase();
              return {
                symbol,
                name: q.name || q.symbol || q.shortName || '',
                price,
                change,
                changePercent,
                type: 'stock' as const,
                image: `${LOGO_BASE}/${symbol}.png`
              };
            });
          if (stockItems.length > 0) tickerItems.push(...stockItems);
        }
      } catch (err) {
        console.error('FMP batch-quote error:', err);
      }

      // 2) If no stocks yet, try v3 quote with multi-symbol path (some plans support this)
      if (tickerItems.length === 0) {
        try {
          const v3Res = await fetch(
            `${FMP_V3_URL}/quote/${symbolsParam}?apikey=${FMP_API_KEY}`,
            { cache: 'no-store' }
          );
          const v3Text = await v3Res.text();
          let v3Data: any;
          try {
            v3Data = v3Text ? JSON.parse(v3Text) : null;
          } catch {
            // skip
          }
          if (v3Res.ok && Array.isArray(v3Data) && v3Data.length > 0) {
            const stockItems: TickerItem[] = v3Data
              .filter((q: any) => q?.symbol && q?.price != null)
              .map((q: any) => {
                const price = parseFloat(q.price);
                const change = typeof q.change === 'number' ? q.change : parseFloat(q.change) ?? 0;
                const changePercent =
                  typeof q.changesPercentage === 'number'
                    ? q.changesPercentage
                    : parseFloat(q.changesPercentage) ?? (q.change != null && q.price ? (change / price) * 100 : 0);
                const symbol = (q.symbol || '').toUpperCase();
                return {
                  symbol,
                  name: q.name || q.symbol || '',
                  price,
                  change,
                  changePercent,
                  type: 'stock' as const,
                  image: `${LOGO_BASE}/${symbol}.png`
                };
              });
            if (stockItems.length > 0) tickerItems.push(...stockItems);
          }
        } catch (err) {
          console.error('FMP v3 quote error:', err);
        }
      }

      // 3) Fallback: fetch each stock via stable quote?symbol= (works on free tier)
      if (tickerItems.length === 0) {
        const quotePromises = POPULAR_STOCKS.map((symbol) =>
          fetch(
            `${FMP_STABLE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_API_KEY}`,
            { cache: 'no-store' }
          ).then((r) => r.json())
        );
        const quoteResults = await Promise.all(quotePromises);
        for (let i = 0; i < quoteResults.length; i++) {
          const raw = quoteResults[i];
          const arr = Array.isArray(raw) ? raw : raw?.data ?? raw?.quote ?? (raw ? [raw] : []);
          const q = arr[0];
          if (q?.symbol && (q?.price != null || q?.last != null)) {
            const price = parseFloat(q.price ?? q.last ?? q.close ?? 0);
            const prevClose = parseFloat(q.previousClose ?? q.dayBefore ?? price);
            const change =
              typeof q.change === 'number'
                ? q.change
                : typeof q.change === 'string'
                  ? parseFloat(q.change) || 0
                  : price - prevClose;
            const changePercent =
              typeof q.changesPercentage === 'number'
                ? q.changesPercentage
                : prevClose !== 0
                  ? (change / prevClose) * 100
                  : 0;
            const symbol = (q.symbol || '').toUpperCase();
            tickerItems.push({
              symbol,
              name: q.name || q.symbol || '',
              price,
              change,
              changePercent,
              type: 'stock' as const,
              image: `${LOGO_BASE}/${symbol}.png`
            });
          }
        }
      }
    }

    // Fetch popular cryptocurrencies
    const cryptoIds = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'cardano', 'dogecoin'];
    const apiKeyParam = COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : '';

    try {
      const marketsResponse = await fetch(
        `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=${cryptoIds.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h${apiKeyParam}`,
        {
          cache: 'no-store',
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (marketsResponse.ok) {
        const marketsData = await marketsResponse.json();
        const normImg = (c: any) => typeof c?.image === 'string' ? c.image : (c?.image?.small || c?.image?.large || '');

        const cryptoItems: TickerItem[] = marketsData.map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change: coin.price_change_24h || 0,
          changePercent: coin.price_change_percentage_24h || 0,
          type: 'crypto' as const,
          image: normImg(coin) || undefined
        }));

        tickerItems.push(...cryptoItems);
      }
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
    }

    return NextResponse.json(tickerItems);
  } catch (error) {
    console.error('Error fetching price ticker data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ticker data' },
      { status: 500 }
    );
  }
}
