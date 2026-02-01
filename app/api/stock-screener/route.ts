import { NextRequest, NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Valid sectors for filtering
const VALID_SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Communication Services',
  'Industrials',
  'Consumer Defensive',
  'Energy',
  'Basic Materials',
  'Real Estate',
  'Utilities'
];

// Valid exchanges
const VALID_EXCHANGES = ['NYSE', 'NASDAQ', 'AMEX'];

export async function GET(request: NextRequest) {
  if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Build query parameters for FMP stock screener
    const params = new URLSearchParams();
    params.append('apikey', FMP_API_KEY);
    
    // Market Cap filters
    const marketCapMin = searchParams.get('marketCapMin');
    const marketCapMax = searchParams.get('marketCapMax');
    if (marketCapMin) params.append('marketCapMoreThan', marketCapMin);
    if (marketCapMax) params.append('marketCapLowerThan', marketCapMax);
    
    // Price filters
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    if (priceMin) params.append('priceMoreThan', priceMin);
    if (priceMax) params.append('priceLowerThan', priceMax);
    
    // Volume filter
    const volumeMin = searchParams.get('volumeMin');
    if (volumeMin) params.append('volumeMoreThan', volumeMin);
    
    // Beta filters
    const betaMin = searchParams.get('betaMin');
    const betaMax = searchParams.get('betaMax');
    if (betaMin) params.append('betaMoreThan', betaMin);
    if (betaMax) params.append('betaLowerThan', betaMax);
    
    // Dividend yield filter
    const dividendMin = searchParams.get('dividendMin');
    const dividendMax = searchParams.get('dividendMax');
    if (dividendMin) params.append('dividendMoreThan', dividendMin);
    if (dividendMax) params.append('dividendLowerThan', dividendMax);
    
    // Sector filter
    const sector = searchParams.get('sector');
    if (sector && VALID_SECTORS.includes(sector)) {
      params.append('sector', sector);
    }
    
    // Exchange filter
    const exchange = searchParams.get('exchange');
    if (exchange && VALID_EXCHANGES.includes(exchange)) {
      params.append('exchange', exchange);
    }
    
    // Country filter (default to US)
    const country = searchParams.get('country') || 'US';
    params.append('country', country);
    
    // Only actively trading stocks
    params.append('isActivelyTrading', 'true');
    
    // Limit results
    const limit = searchParams.get('limit') || '50';
    params.append('limit', limit);

    const response = await fetch(
      `${BASE_URL}/stock-screener?${params.toString()}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    const text = await response.text();
    let data: any;
    
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { error: text?.trim() || 'Failed to parse response from FMP' },
        { status: response.status === 403 ? 403 : 500 }
      );
    }

    if (!response.ok) {
      const msg = data?.['Error Message'] ?? data?.message ?? data?.error;
      return NextResponse.json(
        { error: typeof msg === 'string' ? msg : `FMP error: HTTP ${response.status}` },
        { status: response.status === 403 ? 403 : 500 }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid response format from screener API' },
        { status: 500 }
      );
    }

    // Transform and enrich the data
    const logoBase = 'https://financialmodelingprep.com/image-stock';
    const stocks = data.map((stock: any) => ({
      symbol: stock.symbol,
      companyName: stock.companyName,
      sector: stock.sector,
      industry: stock.industry,
      marketCap: stock.marketCap,
      price: stock.price,
      beta: stock.beta,
      volume: stock.volume,
      lastAnnualDividend: stock.lastAnnualDividend,
      exchange: stock.exchangeShortName || stock.exchange,
      country: stock.country,
      isActivelyTrading: stock.isActivelyTrading,
      image: `${logoBase}/${stock.symbol}.png`
    }));

    return NextResponse.json(
      {
        stocks,
        count: stocks.length,
        filters: {
          sectors: VALID_SECTORS,
          exchanges: VALID_EXCHANGES
        },
        lastUpdated: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    );
  } catch (error) {
    console.error('Error in stock screener:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screener data' },
      { status: 500 }
    );
  }
}
