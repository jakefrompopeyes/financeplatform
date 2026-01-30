import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

export interface DividendItem {
  date: string;
  dividend: number;
  adjDividend?: number;
  recordDate?: string;
  paymentDate?: string;
  declarationDate?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // FMP stable: dividends by company (historical)
    const url = `${BASE_URL}/dividends-company?symbol=${encodeURIComponent(symbol.toUpperCase())}&apikey=${FMP_API_KEY}`;
    const res = await fetch(url);

    if (res.status === 429) {
      return NextResponse.json(
        { error: 'API rate limit exceeded', code: 429, retryAfter: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const data = await res.json();
    const raw = Array.isArray(data) ? data : (data?.dividends ?? data?.historical ?? []);

    const dividends: DividendItem[] = raw.slice(0, limit).map((row: Record<string, unknown>) => ({
      date: String(row.date ?? row.recordDate ?? row.exDividendDate ?? ''),
      dividend: Number(row.dividend ?? row.amount ?? 0) || 0,
      adjDividend: row.adjDividend != null ? Number(row.adjDividend) : undefined,
      recordDate: row.recordDate != null ? String(row.recordDate) : undefined,
      paymentDate: row.paymentDate != null ? String(row.paymentDate) : undefined,
      declarationDate: row.declarationDate != null ? String(row.declarationDate) : undefined,
    }));

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      dividends,
    });
  } catch (error) {
    console.error('Dividends API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dividends' },
      { status: 500 }
    );
  }
}
