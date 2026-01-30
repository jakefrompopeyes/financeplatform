import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
// Use v3 API (works with free tier); stable API may require different plan
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export async function GET() {
  try {
    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'API key not configured. Please add FMP_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // ETFs that track major indices
    const indices = [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', displayName: 'S&P 500 (SPY)' },
      { symbol: 'QQQ', name: 'Invesco QQQ ETF', displayName: 'NASDAQ (QQQ)' },
      { symbol: 'DIA', name: 'SPDR Dow Jones ETF', displayName: 'Dow Jones (DIA)' }
    ];

    const symbolsParam = indices.map((i) => i.symbol).join(',');
    const [batchRes, ...historicalResponses] = await Promise.all([
      fetch(`${BASE_URL}/quote/${symbolsParam}?apikey=${FMP_API_KEY}`),
      ...indices.map((index) =>
        fetch(
          `${BASE_URL}/historical-price-full/${index.symbol}?apikey=${FMP_API_KEY}`
        ).then((r) => r.json())
      )
    ]);

    const batchData = await batchRes.json();

    // FMP v3 returns error object e.g. { "Error Message": "Invalid API key" }
    const errorMsg =
      batchData && typeof batchData === 'object' && !Array.isArray(batchData)
        ? (batchData as any)['Error Message'] || (batchData as any).message
        : null;
    if (errorMsg) {
      return NextResponse.json(
        { error: errorMsg },
        { status: batchRes.status === 403 ? 403 : 500 }
      );
    }

    if (!Array.isArray(batchData) || batchData.length === 0) {
      return NextResponse.json(
        {
          error:
            'No quote data returned. Check your FMP API key at financialmodelingprep.com and ensure the free tier includes quote access.'
        },
        { status: 500 }
      );
    }

    const validResults = indices
      .map((index, i) => {
        const quote = batchData.find((q: any) => (q.symbol || '').toUpperCase() === index.symbol);
        if (!quote) return null;
        const price = quote.price ?? quote.previousClose;
        if (price == null) return null;

        const currentPrice = parseFloat(String(price));
        const open = parseFloat(String(quote.open ?? quote.price ?? currentPrice));
        const change = currentPrice - (quote.previousClose != null ? parseFloat(String(quote.previousClose)) : open);
        const changesPercentage =
          quote.changesPercentage != null
            ? parseFloat(String(quote.changesPercentage))
            : open !== 0
              ? (change / open) * 100
              : 0;

        let historical: { date: string; close: number }[] = [];
        const histRaw = historicalResponses[i];
        const histList = Array.isArray(histRaw)
          ? histRaw
          : (histRaw && (histRaw as any).historical) || [];
        if (histList.length > 0) {
          historical = histList
            .slice(0, 30)
            .map((item: any) => ({
              date: item.date || item.datetime,
              close: parseFloat(item.close ?? item.adjClose ?? item.price ?? 0)
            }))
            .reverse();
        }

        return {
          symbol: index.symbol,
          name: index.displayName,
          price: currentPrice,
          change,
          changesPercentage,
          historical
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (validResults.length === 0) {
      return NextResponse.json(
        { error: 'Unable to match quote data. Please check your FMP API key and try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(validResults);
  } catch (error) {
    console.error('Error fetching market overview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
