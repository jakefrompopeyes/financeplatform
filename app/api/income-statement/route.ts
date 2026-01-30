import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

function toNum(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(n) ? null : n;
}

/** Normalize a single income statement row from FMP (handles camelCase and snake_case). */
function normalizeStatement(row: Record<string, unknown>): Record<string, number | null> {
  const get = (a: string, b?: string) => toNum(row[a] ?? row[b ?? '']) ?? null;
  const costOfRevenue = get('costOfRevenue', 'cost_of_revenue') ?? get('costOfGoodsSold', 'cost_of_goods_sold');
  return {
    revenue: get('revenue'),
    costOfRevenue,
    grossProfit: get('grossProfit', 'gross_profit'),
    operatingExpenses: get('operatingExpenses', 'operating_expenses'),
    operatingIncome: get('operatingIncome', 'operating_income'),
    netIncome: get('netIncome', 'net_income'),
    ebitda: get('ebitda'),
    depreciationAndAmortization: get('depreciationAndAmortization', 'depreciation_and_amortization'),
    interestExpense: get('interestExpense', 'interest_expense'),
    incomeTaxExpense: get('incomeTaxExpense', 'income_tax_expense'),
    date: null,
    period: (row.period ?? row.date ?? '') as string,
  };
}

export interface IncomeStatementPeriod {
  period: string;
  date?: string;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda: number | null;
  depreciationAndAmortization: number | null;
  interestExpense: number | null;
  incomeTaxExpense: number | null;
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

    const url = `${BASE_URL}/income-statement?symbol=${encodeURIComponent(symbol.toUpperCase())}&limit=${limit}&apikey=${FMP_API_KEY}`;
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
        error: 'No income statement data',
        symbol: symbol.toUpperCase(),
        periods: [],
      });
    }

    const periods: IncomeStatementPeriod[] = data.slice(0, limit).map((row: Record<string, unknown>) => {
      const n = normalizeStatement(row);
      return {
        period: (row.period ?? row.date ?? '') as string,
        date: typeof row.date === 'string' ? row.date : undefined,
        ...n,
      };
    });

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      periods,
    });
  } catch (error) {
    console.error('Income statement API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch income statement' },
      { status: 500 }
    );
  }
}
