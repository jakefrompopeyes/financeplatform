import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';
const TWELVE_BASE_URL = 'https://api.twelvedata.com';

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

function isRestrictedMessage(msg: string): boolean {
  return /restricted|subscription|upgrade/i.test(msg);
}

function asNumber(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeQuoteLike(raw: any): { symbol: string; price: number; change: number; changesPercentage: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const symbol = String(raw.symbol || '').toUpperCase();
  const price = asNumber(raw.price);
  if (!symbol || price == null) return null;

  const change =
    asNumber(raw.change) ??
    asNumber(raw.changes) ??
    (asNumber(raw.previousClose) != null ? price - asNumber(raw.previousClose)! : 0);

  const changesPercentage =
    asNumber(raw.changesPercentage) ??
    asNumber(raw.changePercent) ??
    asNumber(raw.changePercentage) ??
    (price - change !== 0 ? (change / (price - change)) * 100 : 0);

  return { symbol, price, change, changesPercentage };
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
    // Prefer short quote endpoints (often less restricted than full quote/batch-quote).
    // 1) Try batch-quote-short
    // 2) If restricted, fall back to quote-short per symbol
    // 3) If FMP is entirely restricted, fall back to Twelve Data if configured
    let quotes: { symbol: string; price: number; change: number; changesPercentage: number }[] | null = null;
    let lastError: string | null = null;

    const batchShort = await fetchJson(
      `${BASE_URL}/batch-quote-short?symbols=${symbolsParam}&apikey=${FMP_API_KEY}`,
      60
    );
    if (batchShort.ok) {
      const data = batchShort.data;
      if (Array.isArray(data)) {
        quotes = data
          .map((x: any) => normalizeQuoteLike(x))
          .filter((x): x is NonNullable<typeof x> => x != null);
      } else {
        const msg =
          (data && typeof data === 'object' && !Array.isArray(data)
            ? (data as any)['Error Message'] ?? (data as any).message ?? (data as any).error
            : null) ?? 'Unexpected response';
        lastError = String(msg);
      }
    } else {
      lastError = batchShort.error;
    }

    if (!quotes || quotes.length === 0) {
      if (lastError && isRestrictedMessage(lastError)) {
        const perSymbol = await Promise.all(
          indices.map((index) =>
            fetchJson(`${BASE_URL}/quote-short?symbol=${index.symbol}&apikey=${FMP_API_KEY}`, 60)
          )
        );
        quotes = perSymbol
          .map((r) => {
            if (!r.ok) {
              lastError = r.error;
              return null;
            }
            const d = r.data;
            const item = Array.isArray(d) ? d[0] : d;
            return normalizeQuoteLike(item);
          })
          .filter((q): q is NonNullable<typeof q> => q != null);
      }
    }

    if ((!quotes || quotes.length === 0) && TWELVE_DATA_API_KEY && TWELVE_DATA_API_KEY !== 'your_twelve_data_key_here') {
      const perSymbol = await Promise.all(
        indices.map(async (index) => {
          const url = `${TWELVE_BASE_URL}/quote?symbol=${encodeURIComponent(index.symbol)}&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`;
          const res = await fetch(url, { next: { revalidate: 60 } });
          const data = await res.json().catch(() => null);
          // Twelve Data returns { code, message } on error
          if (!res.ok || (data && typeof data === 'object' && (data as any).code)) {
            lastError = (data as any)?.message ?? `Twelve Data error: HTTP ${res.status}`;
            return null;
          }
          const symbol = String(data.symbol || index.symbol).toUpperCase();
          const price = asNumber(data.close ?? data.price) ?? asNumber(data.open) ?? null;
          const change = asNumber(data.change) ?? 0;
          const changesPercentage = asNumber(data.percent_change) ?? asNumber(data.change_percent) ?? 0;
          if (!symbol || price == null) return null;
          return { symbol, price, change, changesPercentage };
        })
      );
      quotes = perSymbol.filter((q): q is NonNullable<typeof q> => q != null);
    }

    if (!quotes || quotes.length === 0) {
      const msg = lastError || 'Unable to fetch market quotes.';
      return NextResponse.json(
        {
          error: msg + (isRestrictedMessage(msg)
            ? ' If you do not want to upgrade FMP, set TWELVE_DATA_API_KEY to use Twelve Data for market overview.'
            : '')
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
        const quote = quotes!.find((q) => q.symbol === index.symbol);
        if (!quote) return null;
        const currentPrice = quote.price;
        const change = quote.change;
        const changesPercentage = quote.changesPercentage;

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
