import { NextRequest, NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'FMP API key not configured' }, { status: 500 });
  }

  try {
    // Fetch DCF valuation from FMP stable API
    const response = await fetch(
      `${FMP_BASE}/discounted-cash-flow?symbol=${symbol}&apikey=${FMP_API_KEY}`
    );

    if (!response.ok) {
      console.error(`DCF API error: ${response.status} for symbol ${symbol}`);
      return NextResponse.json(
        { error: 'Failed to fetch DCF valuation' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Handle empty or error responses
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({
        symbol,
        dcf: null,
        stockPrice: null,
        date: null,
        message: 'No DCF data available for this symbol',
      });
    }

    // FMP returns array for this endpoint
    const dcfData = Array.isArray(data) ? data[0] : data;

    // Transform the response
    const result = {
      symbol: dcfData.symbol || symbol,
      dcf: dcfData.dcf ?? null,
      stockPrice: dcfData.stockPrice ?? dcfData.price ?? null,
      date: dcfData.date || null,
      // Calculate the difference between current price and DCF value
      priceDifference: null as number | null,
      percentageDifference: null as number | null,
      isUndervalued: null as boolean | null,
    };

    // Calculate valuation metrics if we have both values
    if (result.dcf !== null && result.stockPrice !== null && result.dcf > 0) {
      result.priceDifference = result.dcf - result.stockPrice;
      result.percentageDifference = ((result.dcf - result.stockPrice) / result.stockPrice) * 100;
      result.isUndervalued = result.dcf > result.stockPrice;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching DCF valuation:', error);
    return NextResponse.json({ error: 'Failed to fetch DCF valuation' }, { status: 500 });
  }
}
