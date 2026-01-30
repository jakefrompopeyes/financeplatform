import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

type FetchJsonResult =
  | { ok: true; status: number; data: any }
  | { ok: false; status: number; error: string };

async function fetchJson(url: string, revalidateSeconds = 60): Promise<FetchJsonResult> {
  const res = await fetch(url, { next: { revalidate: revalidateSeconds } });
  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // FMP sometimes returns plain text like "Restricted Endpoint..." (non-JSON)
    const msg = text?.trim() || `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: msg };
  }

  if (!res.ok) {
    const msgRaw =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as any)['Error Message'] ?? (data as any).message ?? (data as any).error
        : null;
    const msg = (typeof msgRaw === 'string' ? msgRaw : null) ?? text?.trim() ?? `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: msg };
  }

  return { ok: true, status: res.status, data };
}

export async function GET() {
  try {
    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'API key not configured. Please add FMP_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // ETFs that track major indices (use stable API)
    const indices = [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', displayName: 'S&P 500 (SPY)' },
      { symbol: 'QQQ', name: 'Invesco QQQ ETF', displayName: 'NASDAQ (QQQ)' },
      { symbol: 'DIA', name: 'SPDR Dow Jones ETF', displayName: 'Dow Jones (DIA)' }
    ];

    const symbolsParam = indices.map((i) => i.symbol).join(',');
    const batch = await fetchJson(
      `${BASE_URL}/batch-quote?symbols=${symbolsParam}&apikey=${FMP_API_KEY}`,
      60
    );
    if (!batch.ok) {
      return NextResponse.json(
        { error: batch.error },
        { status: batch.status === 403 ? 403 : 500 }
      );
    }

    const batchData = batch.data;

    const batchErrorMsg =
      batchData && typeof batchData === 'object' && !Array.isArray(batchData)
        ? (batchData as any)['Error Message'] ?? (batchData as any).message ?? (batchData as any).error
        : null;

    // Some plans restrict batch endpoints. If so, fall back to per-symbol quote.
    let quotes: any[] | null = null;
    if (Array.isArray(batchData)) {
      quotes = batchData;
    } else if (batchErrorMsg) {
      const msgStr = typeof batchErrorMsg === 'string' ? batchErrorMsg : String(batchErrorMsg);
      const isRestricted = /restricted|subscription|upgrade/i.test(msgStr);
      if (isRestricted) {
        const perSymbol = await Promise.all(
          indices.map((index) =>
            fetchJson(`${BASE_URL}/quote?symbol=${index.symbol}&apikey=${FMP_API_KEY}`, 60)
          )
        );
        quotes = perSymbol
          .map((r) => {
            if (!r.ok) return null;
            const d = r.data;
            return Array.isArray(d) ? d[0] : d;
          })
          .filter((q): q is NonNullable<typeof q> => q != null);
      } else {
        return NextResponse.json(
          { error: msgStr },
          { status: batch.status === 403 ? 403 : 500 }
        );
      }
    }

    if (!quotes || quotes.length === 0) {
      return NextResponse.json(
        {
          error:
            'No quote data returned. Check your FMP API key at financialmodelingprep.com and ensure your plan includes quote access.'
        },
        { status: 500 }
      );
    }

    // Historical sparkline data is "nice to have". If an endpoint is restricted, still show quotes.
    const historicalLists = await Promise.all(
      indices.map(async (index) => {
        const hist = await fetchJson(
          `${BASE_URL}/historical-price-eod/full?symbol=${index.symbol}&apikey=${FMP_API_KEY}`,
          3600
        );
        if (!hist.ok) return [];
        const raw = hist.data;
        const list = Array.isArray(raw) ? raw : raw?.historical || [];
        return Array.isArray(list) ? list : [];
      })
    );

    const validResults = indices
      .map((index, i) => {
        const quote = quotes!.find((q: any) => (q.symbol || '').toUpperCase() === index.symbol);
        if (!quote) return null;
        const price = quote.price ?? quote.previousClose;
        if (price == null) return null;

        const currentPrice = parseFloat(String(price));
        const previousClose = quote.previousClose != null ? parseFloat(String(quote.previousClose)) : currentPrice;
        const change = currentPrice - previousClose;
        const changesPercentage =
          previousClose !== 0 ? (change / previousClose) * 100 : 0;

        let historical: { date: string; close: number }[] = [];
        const histList = historicalLists[i] || [];
        if (histList.length > 0) {
          historical = histList
            .slice(0, 30)
            .map((item: any) => ({
              date: (item.date || item.datetime || '').toString().slice(0, 10),
              close: parseFloat(item.close ?? item.adjClose ?? item.price ?? 0)
            }))
            .filter((x: { date: string }) => x.date)
            .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
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
