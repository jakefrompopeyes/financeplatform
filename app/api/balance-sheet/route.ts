import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

function toNum(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(n) ? null : n;
}

function get(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = toNum(row[k]);
    if (v != null) return v;
  }
  return null;
}

export interface BalanceSheetPeriod {
  period: string;
  date?: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  cashAndEquivalents: number | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '4', 10), 1), 20);

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const url = `${BASE_URL}/balance-sheet-statement?symbol=${encodeURIComponent(symbol.toUpperCase())}&limit=${limit}&apikey=${FMP_API_KEY}`;
    const res = await fetch(url);

    if (res.status === 429) {
      return NextResponse.json(
        { error: 'API rate limit exceeded', code: 429, retryAfter: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        error: 'No balance sheet data',
        symbol: symbol.toUpperCase(),
        periods: [],
      });
    }

    const periods: BalanceSheetPeriod[] = data.slice(0, limit).map((row: Record<string, unknown>) => ({
      period: String(row.period ?? row.date ?? ''),
      date: typeof row.date === 'string' ? row.date : undefined,
      totalAssets: get(row, 'totalAssets', 'total_assets'),
      totalLiabilities: get(row, 'totalLiabilities', 'total_liabilities'),
      totalEquity: get(row, 'totalEquity', 'total_equity', 'totalStockholdersEquity'),
      totalDebt: get(row, 'totalDebt', 'total_debt', 'netDebt'),
      cashAndEquivalents: get(row, 'cashAndEquivalents', 'cash_and_equivalents', 'cashAndCashEquivalents'),
    }));

    return NextResponse.json({ symbol: symbol.toUpperCase(), periods });
  } catch (error) {
    console.error('Balance sheet API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch balance sheet' },
      { status: 500 }
    );
  }
}
