import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

export interface StockPerformance {
  symbol: string;
  '1D': number | null;
  '1W': number | null;
  '1M': number | null;
  '6M': number | null;
  '1Y': number | null;
  'YTD': number | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // FMP stock price change endpoint
    const res = await fetch(
      `${BASE_URL}/stock-price-change?symbol=${encodeURIComponent(symbol.toUpperCase())}&apikey=${FMP_API_KEY}`
    );

    if (res.status === 429) {
      return NextResponse.json(
        { error: 'API rate limit exceeded', code: 429, retryAfter: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        error: 'No performance data available',
        symbol: symbol.toUpperCase(),
      });
    }

    const priceChange = data[0];
    
    // Map FMP fields to our format
    const performance: StockPerformance = {
      symbol: symbol.toUpperCase(),
      '1D': priceChange['1D'] ?? null,
      '1W': priceChange['5D'] ?? null, // FMP uses 5D for ~1 week
      '1M': priceChange['1M'] ?? null,
      '6M': priceChange['6M'] ?? null,
      '1Y': priceChange['1Y'] ?? null,
      'YTD': priceChange['ytd'] ?? priceChange['YTD'] ?? null,
    };

    return NextResponse.json(performance, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Stock performance API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch performance' },
      { status: 500 }
    );
  }
}
