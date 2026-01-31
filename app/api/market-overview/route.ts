import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

type MarketPoint = { date: string; close: number };

type MarketItem = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  historical: MarketPoint[];
  sparklineAvailable: boolean;
};

type FetchResult =
  | { ok: true; status: number; data: any }
  | { ok: false; status: number; error: string };

function toNumber(value: any): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getErrorMessageFromBody(body: any): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return (
    body['Error Message'] ??
    body.message ??
    body.error ??
    null
  );
}

async function fetchFmpJson(url: string, revalidateSeconds = 60): Promise<FetchResult> {
  const res = await fetch(url, { next: { revalidate: revalidateSeconds } });
  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // FMP sometimes returns plain text like "Restricted Endpoint..." (non-JSON)
    return { ok: false, status: res.status, error: text?.trim() || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    const msg = getErrorMessageFromBody(data) ?? text?.trim() ?? `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: msg };
  }

  return { ok: true, status: res.status, data };
}

// Use the actual index symbols (not ETF proxies like QQQ/DIA).
// This makes the displayed levels + % change match the real indices.
const INDICES = [
  { symbol: '^GSPC', displayName: 'S&P 500' },
  { symbol: '^IXIC', displayName: 'NASDAQ' },
  { symbol: '^DJI', displayName: 'Dow Jones' }
] as const;

export async function GET() {
  try {
    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'API key not configured. Please add FMP_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Quotes (required). Use full `quote` so we reliably have previousClose for accurate %.
    const quoteResponses = await Promise.all(
      INDICES.map((idx) =>
        fetchFmpJson(
          `${BASE_URL}/quote?symbol=${encodeURIComponent(idx.symbol)}&apikey=${FMP_API_KEY}`,
          60
        )
      )
    );

    for (const r of quoteResponses) {
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status === 403 ? 403 : 500 });
    }

    const quotes = quoteResponses.map((r) => {
      const payload = (r as any).data;
      return Array.isArray(payload) ? payload[0] : payload;
    });

    // Historical (optional). Still real data; if restricted we return empty sparklines but keep quotes.
    const histResponses = await Promise.all(
      INDICES.map((idx) =>
        fetchFmpJson(
          `${BASE_URL}/historical-price-eod/full?symbol=${encodeURIComponent(idx.symbol)}&apikey=${FMP_API_KEY}`,
          3600
        )
      )
    );

    const out: MarketItem[] = INDICES.map((idx, i) => {
      const q = quotes[i] ?? {};
      const symbol = idx.symbol;
      const price = toNumber(q.price) ?? 0;
      const previousClose = toNumber(q.previousClose);
      const change =
        previousClose != null ? price - previousClose : (toNumber(q.change ?? q.changes) ?? 0);
      const changesPercentage =
        previousClose != null && previousClose !== 0
          ? (change / previousClose) * 100
          : (toNumber(q.changesPercentage ?? q.changePercent ?? q.changePercentage) ?? 0);

      const histRes = histResponses[i];
      let sparklineAvailable = false;
      let historical: MarketPoint[] = [];

      if (histRes.ok) {
        const raw = histRes.data;
        const list = Array.isArray(raw) ? raw : raw?.historical || [];
        if (Array.isArray(list) && list.length > 0) {
          sparklineAvailable = true;
          historical = list
            .slice(0, 30)
            .map((item: any) => ({
              date: (item.date || item.datetime || '').toString().slice(0, 10),
              close: Number.parseFloat(item.close ?? item.adjClose ?? item.price ?? 0),
            }))
            .filter((p: MarketPoint) => p.date && Number.isFinite(p.close))
            .sort((a: MarketPoint, b: MarketPoint) => a.date.localeCompare(b.date));
        }
      }

      return {
        symbol,
        name: idx.displayName,
        price,
        change,
        changesPercentage,
        historical,
        sparklineAvailable
      };
    });

    return NextResponse.json(out, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching market overview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
