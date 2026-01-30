import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10) || 30));

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const cacheKey = `${symbol.toUpperCase()}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    // FMP stable: search insider trades by symbol
    const url = `${BASE_URL}/insider-trading/search?symbol=${encodeURIComponent(symbol.toUpperCase())}&page=0&limit=${limit}&apikey=${FMP_API_KEY}`;
    const res = await fetch(url);

    if (res.status === 429) {
      return NextResponse.json(
        { error: 'API rate limit exceeded', code: 429, retryAfter: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const raw = await res.json();

    // Handle array or { data: [...] } wrapper
    let list: any[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.list ?? [];
    if (!Array.isArray(list)) list = [];

    const trades = list.slice(0, limit).map((item: any) => ({
      filingDate: item.filingDate ?? item.filing_date ?? item.date ?? null,
      transactionDate: item.transactionDate ?? item.transaction_date ?? item.transDate ?? null,
      reportingName: item.reportingName ?? item.reporting_name ?? item.name ?? item.ownerName ?? null,
      typeOfOwner: item.typeOfOwner ?? item.type_of_owner ?? item.relationship ?? null,
      transactionType: item.transactionType ?? item.transaction_type ?? item.type ?? item.acquistionOrDisposition ?? null,
      securitiesTransacted: item.securitiesTransacted ?? item.securities_transacted ?? item.shares ?? item.numberOfSecurities ?? null,
      price: item.price ?? item.pricePerShare ?? null,
      value: item.value ?? item.totalValue ?? (item.price != null && item.securitiesTransacted != null ? item.price * item.securitiesTransacted : null),
      symbol: item.symbol ?? symbol.toUpperCase(),
      link: item.link ?? item.secUrl ?? item.filingUrl ?? null,
    }));

    const data = { symbol: symbol.toUpperCase(), trades };
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Error fetching insider trading:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insider trading data' },
      { status: 500 }
    );
  }
}
