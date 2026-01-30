import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${BASE_URL}/search-symbol?query=${encodeURIComponent(query)}&apikey=${FMP_API_KEY}`
    );
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'API error' },
        { status: response.status === 429 ? 429 : 500 }
      );
    }

    // FMP returns array of results; filter US stocks/ETFs and format
    const items = Array.isArray(data) ? data : data.data || [];
    const majorExchanges = ['NASDAQ', 'NYSE', 'AMEX', 'NYSE ARCA', 'BATS'];
    const results = items
      .filter((item: any) => {
        const ex = (item.exchangeShortName || item.exchange || '').toUpperCase();
        return majorExchanges.some((e) => ex.includes(e));
      })
      .slice(0, 10)
      .map((item: any) => ({
        symbol: item.symbol || item.ticker,
        name: item.name || item.instrument_name || item.symbol,
        exchange: item.exchangeShortName || item.exchange || '',
        type: item.type || item.instrument_type || 'stock',
        currency: item.currency || 'USD',
        country: item.country || 'US'
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching stocks:', error);
    return NextResponse.json(
      { error: 'Failed to search stocks' },
      { status: 500 }
    );
  }
}
