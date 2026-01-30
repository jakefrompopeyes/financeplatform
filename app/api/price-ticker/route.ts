import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

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

    // Fetch popular stocks via FMP batch quote
    if (FMP_API_KEY && FMP_API_KEY !== 'your_api_key_here') {
      const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
      const symbolsParam = popularStocks.join(',');

      const batchRes = await fetch(
        `${FMP_BASE_URL}/batch-quote?symbols=${symbolsParam}&apikey=${FMP_API_KEY}`
      );
      const batchData = await batchRes.json();

      const logoBase = 'https://financialmodelingprep.com/image-stock';
      if (Array.isArray(batchData)) {
        const stockItems: TickerItem[] = batchData
          .filter((q: any) => q?.symbol && q?.price != null)
          .map((q: any) => {
            const price = parseFloat(q.price);
            const prevClose = parseFloat(q.previousClose ?? q.price);
            const change = price - prevClose;
            const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
            const symbol = (q.symbol || '').toUpperCase();
            return {
              symbol,
              name: q.name || q.symbol || '',
              price,
              change,
              changePercent,
              type: 'stock' as const,
              image: `${logoBase}/${symbol}.png`
            };
          });
        tickerItems.push(...stockItems);
      }
    }

    // Fetch popular cryptocurrencies
    const cryptoIds = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'cardano', 'dogecoin'];
    const apiKeyParam = COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : '';

    try {
      const marketsResponse = await fetch(
        `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=${cryptoIds.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h${apiKeyParam}`,
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (marketsResponse.ok) {
        const marketsData = await marketsResponse.json();

        const cryptoItems: TickerItem[] = marketsData.map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change: coin.price_change_24h || 0,
          changePercent: coin.price_change_percentage_24h || 0,
          type: 'crypto' as const,
          image: coin.image
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
