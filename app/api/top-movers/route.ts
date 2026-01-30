import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

const TRACKED_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX',
  'JPM', 'BAC', 'UNH', 'JNJ', 'WMT', 'HD', 'XOM', 'DIS'
];

export async function GET() {
  if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    // FMP batch-quote supports multiple symbols in one request
    const symbolsParam = TRACKED_STOCKS.join(',');
    const response = await fetch(
      `${BASE_URL}/batch-quote?symbols=${symbolsParam}&apikey=${FMP_API_KEY}`,
      { next: { revalidate: 60 } }
    );

    const data = await response.json();
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Failed to fetch top movers data' },
        { status: 500 }
      );
    }

    const stocks = data
      .filter((q: any) => q?.symbol && q?.price != null)
      .map((q: any) => {
        const price = parseFloat(q.price);
        const prevClose = parseFloat(q.previousClose ?? q.price);
        const change = price - prevClose;
        const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
        return {
          symbol: q.symbol,
          name: q.name || q.symbol,
          price,
          change,
          changePercent,
          volume: parseInt(q.volume ?? 0, 10) || 0
        };
      });

    const sorted = stocks.sort((a: any, b: any) => b.changePercent - a.changePercent);
    const gainers = sorted.slice(0, 5);
    const losers = sorted.slice(-5).reverse();

    return NextResponse.json(
      {
        gainers,
        losers,
        lastUpdated: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching top movers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top movers data' },
      { status: 500 }
    );
  }
}
