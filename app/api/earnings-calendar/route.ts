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

    let raw: any[] = [];

    if (symbol) {
      // Try multiple endpoints to get earnings data for specific symbol
      const endpoints = [
        // v3 historical earnings (most reliable for past data)
        `https://financialmodelingprep.com/api/v3/historical/earning_calendar/${symbol}?apikey=${FMP_API_KEY}`,
        // Stable historical earnings
        `${BASE_URL}/historical-earning-calendar?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_API_KEY}`,
        // Stable earnings calendar with symbol
        `${BASE_URL}/earnings-calendar?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_API_KEY}`,
      ];
      
      for (const url of endpoints) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const arr = Array.isArray(data) ? data : (data as any).earnings || [];
            if (arr.length > 0) {
              raw = arr;
              console.log(`Earnings data found from: ${url.split('apikey')[0]} (${arr.length} items)`);
              break;
            }
          }
        } catch (e) {
          // Try next endpoint
        }
      }
      
      if (raw.length === 0) {
        console.log(`No earnings data found for ${symbol} from any endpoint`);
      }
    } else {
      // For general calendar (no symbol), use earnings-calendar
      const url = `${BASE_URL}/earnings-calendar?apikey=${FMP_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        return NextResponse.json(
          { error: (data as any).message || 'API error' },
          { status: response.status === 429 ? 429 : 500 }
        );
      }
      
      raw = Array.isArray(data) ? data : (data as any).earnings || [];
    }

    console.log(`Earnings data for ${symbol || 'all'}: ${raw.length} items, sample:`, JSON.stringify(raw[0] || {}).slice(0, 300));
    
    const formattedEarnings = raw.map((item: any) => {
      // Handle multiple field name variations from different FMP endpoints
      const epsEst = item.epsEstimated ?? item.eps_estimated ?? item.estimate ?? null;
      const epsActual = item.eps ?? item.reportedEPS ?? item.actual ?? null;
      
      return {
        symbol: item.symbol || item.ticker,
        name: item.name || item.companyName || item.symbol,
        earningsDate: item.date || item.earnings_date || item.report_date || item.fiscalDateEnding,
        reportDate: item.date || item.report_date || item.fiscalDateEnding,
        fiscalPeriod: item.fiscalPeriod || item.fiscal_period || item.period,
        fiscalYear: item.fiscalYear ?? item.fiscal_year,
        estimatedEPS: epsEst != null ? parseFloat(epsEst) : null,
        reportedEPS: epsActual != null ? parseFloat(epsActual) : null,
        surprise: item.surprisePercent != null ? parseFloat(item.surprisePercent) : (item.surprise_pct ? parseFloat(item.surprise_pct) : null),
        currency: item.currency || 'USD',
        reportTime: item.time || item.reportTime || 'Unknown',
        revenue: item.revenue ?? item.actualRevenue ?? null,
        revenueEstimated: item.revenueEstimated ?? item.revenue_estimated ?? null,
      };
    });

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

    const result = {
      earnings: formattedEarnings,
      count: formattedEarnings.length,
      ...(symbol ? { upcoming, lastReported } : {}),
    };
    console.log(`Earnings calendar response for ${symbol || 'all'}: upcoming=${upcoming?.length || 0}, lastReported=${lastReported ? 'yes' : 'no'}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching earnings calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings calendar' },
      { status: 500 }
    );
  }
}
