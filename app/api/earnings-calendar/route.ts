import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    let url = `${BASE_URL}/earnings-calendar?apikey=${FMP_API_KEY}`;
    if (symbol) {
      url += `&symbol=${encodeURIComponent(symbol)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: (data as any).message || 'API error' },
        { status: response.status === 429 ? 429 : 500 }
      );
    }

    const raw = Array.isArray(data) ? data : (data as any).earnings || [];
    const formattedEarnings = raw.map((item: any) => ({
      symbol: item.symbol || item.ticker,
      name: item.name || item.companyName || item.symbol,
      earningsDate: item.date || item.earnings_date || item.report_date,
      reportDate: item.date || item.report_date,
      fiscalPeriod: item.fiscalPeriod || item.fiscal_period || item.period,
      fiscalYear: item.fiscalYear ?? item.fiscal_year,
      estimatedEPS: item.epsEstimated != null ? parseFloat(item.epsEstimated) : (item.estimate ? parseFloat(item.estimate) : null),
      reportedEPS: item.eps != null ? parseFloat(item.eps) : (item.reportedEPS != null ? parseFloat(item.reportedEPS) : null),
      surprise: item.surprisePercent != null ? parseFloat(item.surprisePercent) : (item.surprise_pct ? parseFloat(item.surprise_pct) : null),
      currency: item.currency || 'USD',
      reportTime: item.time || item.reportTime || 'Unknown'
    }));

    formattedEarnings.sort((a: any, b: any) => {
      const dateA = new Date(a.earningsDate || a.reportDate || 0).getTime();
      const dateB = new Date(b.earningsDate || b.reportDate || 0).getTime();
      return dateB - dateA;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = symbol
      ? formattedEarnings.filter((e: any) => {
          const d = e.earningsDate || e.reportDate;
          if (!d) return false;
          const date = new Date(d);
          date.setHours(0, 0, 0, 0);
          return date.getTime() >= today.getTime();
        }).sort((a: any, b: any) => {
          const dateA = new Date(a.earningsDate || a.reportDate || 0).getTime();
          const dateB = new Date(b.earningsDate || b.reportDate || 0).getTime();
          return dateA - dateB;
        })
      : [];

    const lastReported = symbol
      ? formattedEarnings.find((e: any) => {
          const d = e.earningsDate || e.reportDate;
          if (!d) return false;
          const date = new Date(d);
          date.setHours(0, 0, 0, 0);
          return date.getTime() < today.getTime();
        }) ?? null
      : null;

    return NextResponse.json({
      earnings: formattedEarnings,
      count: formattedEarnings.length,
      ...(symbol ? { upcoming, lastReported } : {}),
    });
  } catch (error) {
    console.error('Error fetching earnings calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings calendar' },
      { status: 500 }
    );
  }
}
