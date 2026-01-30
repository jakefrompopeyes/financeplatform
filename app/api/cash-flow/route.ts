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

export interface CashFlowPeriod {
  period: string;
  date?: string;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  dividendPaid: number | null;
  netBorrowings: number | null;
  netChangeInCash: number | null;
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

    const url = `${BASE_URL}/cash-flow-statement?symbol=${encodeURIComponent(symbol.toUpperCase())}&limit=${limit}&apikey=${FMP_API_KEY}`;
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
        error: 'No cash flow data',
        symbol: symbol.toUpperCase(),
        periods: [],
      });
    }

    const periods: CashFlowPeriod[] = data.slice(0, limit).map((row: Record<string, unknown>) => ({
      period: String(row.period ?? row.date ?? ''),
      date: typeof row.date === 'string' ? row.date : undefined,
      operatingCashFlow: get(row, 'operatingCashFlow', 'operating_cash_flow', 'netCashProvidedByOperatingActivities'),
      capitalExpenditure: get(row, 'capitalExpenditure', 'capital_expenditure', 'capitalExpenditures'),
      freeCashFlow: get(row, 'freeCashFlow', 'free_cash_flow'),
      dividendPaid: get(row, 'dividendPaid', 'dividend_paid', 'dividendsPaid'),
      netBorrowings: get(row, 'netBorrowings', 'net_borrowings', 'debtRepayment'),
      netChangeInCash: get(row, 'netChangeInCash', 'net_change_in_cash', 'netChangeInCashAndCashEquivalents'),
    }));

    return NextResponse.json({ symbol: symbol.toUpperCase(), periods });
  } catch (error) {
    console.error('Cash flow API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch cash flow' },
      { status: 500 }
    );
  }
}
