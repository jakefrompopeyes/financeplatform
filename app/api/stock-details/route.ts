import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

function toNumber(value: any): number | null {
  if (value == null || value === '') return null;
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? null : n;
}

function toPositiveNumber(value: any): number | null {
  const n = toNumber(value);
  return n != null && n > 0 ? n : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const range = searchParams.get('range') || '1month';
    const includeHistorical = searchParams.get('includeHistorical') === 'true';
    const debug = searchParams.get('debug') === 'true';
    const noCache = debug || searchParams.get('noCache') === 'true';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const cacheKey = `${symbol}_${includeHistorical}`;
    const cached = cache.get(cacheKey);
    if (!noCache && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      });
    }

    const [quoteRes, profileRes, ratiosRes, keyMetricsTtmRes] = await Promise.all([
      fetch(`${BASE_URL}/quote?symbol=${symbol}&apikey=${FMP_API_KEY}`),
      includeHistorical
        ? fetch(
            `${BASE_URL}/historical-price-eod/full?symbol=${symbol}&apikey=${FMP_API_KEY}`
          )
        : null,
      fetch(`${BASE_URL}/ratios?symbol=${symbol}&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/key-metrics-ttm?symbol=${symbol}&apikey=${FMP_API_KEY}`)
    ]);

    const quoteData = await quoteRes.json();
    if (quoteRes.status === 429) {
      return NextResponse.json(
        {
          error: 'API rate limit exceeded. Please wait a moment and try again.',
          code: 429,
          retryAfter: 60
        },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const quote = Array.isArray(quoteData) ? quoteData[0] : quoteData;
    if (!quote || quote.price == null) {
      return NextResponse.json(
        { error: 'Unable to fetch stock data. Symbol may not exist or market is closed.' },
        { status: 404 }
      );
    }

    const currentPrice = parseFloat(quote.price);
    const previousClose = parseFloat(quote.previousClose ?? quote.price);
    const change = currentPrice - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    let historical: any[] = [];
    if (includeHistorical && profileRes?.ok) {
      const histData = await profileRes.json();
      const rangeLimit: Record<string, number> = {
        '1day': 78,
        '1week': 35,
        '1month': 30,
        '3month': 90,
        '1year': 365,
        '5year': 365 * 5
      };
      const limit = rangeLimit[range] ?? 30;
      const arr = Array.isArray(histData) ? histData : [];
      historical = arr
        .slice(0, limit)
        .map((item: any) => ({
          date: item.date || item.datetime,
          open: parseFloat(item.open ?? 0),
          high: parseFloat(item.high ?? 0),
          low: parseFloat(item.low ?? 0),
          close: parseFloat(item.close ?? item.adjClose ?? 0),
          volume: parseInt(item.volume ?? 0, 10) || 0
        }))
        .reverse();
    }

    let priceToBook: number | null = null;
    let priceToSales: number | null = null;
    let peFromRatios: number | null = null;
    let ratiosPeRaw: any = null;
    if (ratiosRes?.ok) {
      try {
        const ratiosData = await ratiosRes.json();
        const ratiosArr = Array.isArray(ratiosData) ? ratiosData : [];
        const latest = ratiosArr[0];
        if (latest) {
          const pb = latest.priceToBookRatio ?? latest.price_to_book_ratio ?? latest.priceToBook;
          const ps = latest.priceToSalesRatio ?? latest.price_to_sales_ratio ?? latest.priceToSales;
          const pe = latest.priceEarningsRatio ?? latest.priceEarnings ?? latest.price_earnings_ratio ?? latest.pe;
          ratiosPeRaw = pe;
          priceToBook = toNumber(pb);
          priceToSales = toNumber(ps);
          peFromRatios = toPositiveNumber(pe);
        }
      } catch {
        // ignore ratios parse errors
      }
    }

    let epsFromKeyMetrics: number | null = null;
    let peFromKeyMetrics: number | null = null;
    let keyMetricsEpsRaw: any = null;
    let keyMetricsPeRaw: any = null;
    let keyMetricsEarningsYieldRaw: any = null;
    let keyMetricsCount: number | null = null;
    let keyMetricsKeys: string[] | null = null;
    if (keyMetricsTtmRes?.ok) {
      try {
        const kmData = await keyMetricsTtmRes.json();
        const kmArr = Array.isArray(kmData) ? kmData : [];
        keyMetricsCount = kmArr.length;
        const latest = kmArr[0];
        if (latest) {
          keyMetricsKeys = Object.keys(latest).slice(0, 80);
          keyMetricsEpsRaw =
            latest.epsTTM ??
            latest.epsTtm ??
            latest.eps ??
            latest.netIncomePerShareTTM ??
            latest.netIncomePerShareTtm;
          keyMetricsPeRaw =
            latest.peRatioTTM ?? latest.peRatioTtm ?? latest.peRatio ?? latest.pe ?? latest.priceEarningsRatioTTM;

          epsFromKeyMetrics = toNumber(keyMetricsEpsRaw);
          peFromKeyMetrics = toPositiveNumber(keyMetricsPeRaw);

          // Some FMP key-metrics-ttm payloads include earnings yield (E/P) but not EPS or P/E directly.
          // In that case:
          // - P/E = 1 / (E/P)
          // - EPS = Price * (E/P)
          keyMetricsEarningsYieldRaw = latest.earningsYieldTTM ?? latest.earningsYieldTtm ?? latest.earningsYield;
          const earningsYield = toPositiveNumber(keyMetricsEarningsYieldRaw);
          if (earningsYield != null) {
            if (peFromKeyMetrics == null) peFromKeyMetrics = 1 / earningsYield;
            if (epsFromKeyMetrics == null) epsFromKeyMetrics = currentPrice * earningsYield;
          }
        }
      } catch {
        // ignore key metrics parse errors
      }
    }

    const quotePeRaw = quote.pe ?? quote.priceEarnings ?? quote.peRatio;
    const quotePe = toPositiveNumber(quotePeRaw);
    const epsFromQuote = toNumber(quote.eps);
    const eps = epsFromQuote ?? epsFromKeyMetrics;
    const peComputed = eps != null && eps > 0 ? currentPrice / eps : null;
    const pe = quotePe ?? peFromRatios ?? peFromKeyMetrics ?? (peComputed != null && Number.isFinite(peComputed) ? peComputed : null);

    const stockDetails: any = {
      symbol: symbol.toUpperCase(),
      name: quote.name || symbol,
      price: currentPrice,
      change,
      changePercent,
      previousClose,
      open: parseFloat(quote.open ?? quote.price),
      high: parseFloat(quote.dayHigh ?? quote.high ?? quote.price),
      low: parseFloat(quote.dayLow ?? quote.low ?? quote.price),
      volume: parseInt(quote.volume ?? 0, 10) || 0,
      averageVolume: parseInt(quote.avgVolume ?? quote.volume ?? 0, 10) || 0,
      fiftyTwoWeekHigh: parseFloat(quote.yearHigh ?? 0) || 0,
      fiftyTwoWeekLow: parseFloat(quote.yearLow ?? 0) || 0,
      marketCap: quote.marketCap ?? null,
      pe,
      eps,
      exchange: quote.exchange ?? 'N/A',
      currency: quote.currency ?? 'USD',
      timestamp: quote.timestamp ?? Date.now(),
      historical,
      priceToBook: priceToBook ?? null,
      priceToSales: priceToSales ?? null
    };

    if (debug) {
      stockDetails._debug = {
        quoteStatus: quoteRes.status,
        ratiosStatus: ratiosRes.status,
        keyMetricsTtmStatus: keyMetricsTtmRes.status,
        quotePeRaw,
        quoteEpsRaw: quote.eps ?? null,
        ratiosPeRaw,
        keyMetricsCount,
        keyMetricsKeys,
        keyMetricsEpsRaw,
        keyMetricsPeRaw,
        keyMetricsEarningsYieldRaw
      };
    }

    cache.set(cacheKey, { data: stockDetails, timestamp: Date.now() });

    return NextResponse.json(stockDetails, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error('Error fetching stock details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock details' },
      { status: 500 }
    );
  }
}
