import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

async function safeJson(res: Response): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const text = await res.text();
  try {
    return { ok: true, data: text ? JSON.parse(text) : null };
  } catch {
    return { ok: false, error: text?.trim() || `Failed to parse JSON (HTTP ${res.status})` };
  }
}

async function fetchPolymarketSentiment() {
  try {
    const response = await fetch(
      `${GAMMA_API_BASE}/markets?limit=100&closed=false`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 }
      }
    );
    if (!response.ok) return null;
    const parsed = await safeJson(response);
    if (!parsed.ok) return null;
    const marketsData = parsed.data;
    const markets = Array.isArray(marketsData) ? marketsData : marketsData.data || [];
    const sentimentMarkets = markets.filter((market: any) => {
      const question = market.question?.toLowerCase() || '';
      const desc = market.description?.toLowerCase() || '';
      const combined = `${question} ${desc}`;
      return combined.includes('vix') || combined.includes('volatility') || combined.includes('recession') ||
        combined.includes('market crash') || combined.includes('correction') || combined.includes('bear market') ||
        combined.includes('bull market') ||
        (combined.includes('s&p') && (combined.includes('above') || combined.includes('below') || combined.includes('close'))) ||
        (combined.includes('spy') && (combined.includes('above') || combined.includes('below') || combined.includes('close'))) ||
        (combined.includes('dow') && (combined.includes('above') || combined.includes('below'))) ||
        (combined.includes('fed') && (combined.includes('rate') || combined.includes('hike') || combined.includes('cut') || combined.includes('emergency'))) ||
        (combined.includes('stock market') && (combined.includes('high') || combined.includes('low') || combined.includes('record')));
    }).slice(0, 6);

    return sentimentMarkets.map((market: any) => {
      let outcomes: string[] = [];
      let prices: string[] = [];
      if (typeof market.outcomes === 'string') {
        try { outcomes = JSON.parse(market.outcomes); } catch { outcomes = market.outcomes.split(','); }
      } else if (Array.isArray(market.outcomes)) outcomes = market.outcomes;
      else if (market.tokens?.length) outcomes = market.tokens.map((t: any) => t.outcome || 'Unknown');
      if (typeof market.outcomePrices === 'string') {
        try { prices = JSON.parse(market.outcomePrices); } catch { prices = market.outcomePrices.split(','); }
      } else if (Array.isArray(market.outcomePrices)) prices = market.outcomePrices;
      else if (market.tokens?.length) prices = market.tokens.map((t: any) => t.price || '0.5');
      const probabilities = prices.map((price: string, index: number) => {
        const parsedPrice = parseFloat(price);
        return {
          outcome: outcomes[index] || 'Unknown',
          probability: Math.max(0, Math.min(100, !isNaN(parsedPrice) ? parsedPrice * 100 : 50))
        };
      }).filter((p: any) => p.outcome !== 'Unknown');
      if (probabilities.length === 0) return null;
      return {
        question: market.question,
        probabilities,
        volume: parseFloat(market.volume || '0'),
        endDate: market.endDate,
        url: market.slug ? `https://polymarket.com/event/${market.slug}` : 'https://polymarket.com'
      };
    }).filter((m: any) => m !== null);
  } catch (error) {
    console.error('Error fetching Polymarket sentiment:', error);
    return null;
  }
}

export async function GET() {
  try {
    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'FMP API key not configured' },
        { status: 500 }
      );
    }

    // FMP: VIX is often ^VIX; try both
    const vixSymbol = '^VIX';
    const [vixQuoteRes, vixHistRes] = await Promise.all([
      fetch(`${BASE_URL}/quote?symbol=${encodeURIComponent(vixSymbol)}&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/historical-price-eod/full?symbol=${encodeURIComponent(vixSymbol)}&apikey=${FMP_API_KEY}`)
    ]);
    const vixQuoteParsed = await safeJson(vixQuoteRes);
    const vixHistParsed = await safeJson(vixHistRes);
    if (!vixQuoteParsed.ok || !vixHistParsed.ok) {
      return NextResponse.json(
        { error: 'Unable to fetch VIX data from FMP.' },
        { status: 500 }
      );
    }
    const vixQuoteData = vixQuoteParsed.data;
    const vixHistoricalData = vixHistParsed.data;

    let vixData: any = null;
    const vixQuote = Array.isArray(vixQuoteData) ? vixQuoteData[0] : vixQuoteData;
    if (vixQuote && vixQuote.price != null) {
      const currentVix = parseFloat(vixQuote.price);
      const previousVix = parseFloat(vixQuote.previousClose ?? vixQuote.price);
      const change = currentVix - previousVix;
      const changePercent = previousVix !== 0 ? (change / previousVix) * 100 : 0;
      const histArr = Array.isArray(vixHistoricalData) ? vixHistoricalData : [];
      vixData = {
        current: currentVix,
        change,
        changePercent,
        previousClose: previousVix,
        historical: histArr.slice(0, 30).reverse().map((item: any) => ({
          date: item.date || item.datetime,
          value: parseFloat(item.close ?? item.adjClose ?? 0)
        }))
      };
    }

    const polymarketMarkets = (await fetchPolymarketSentiment()) || [];
    return NextResponse.json({
      vix: vixData,
      putCall: null,
      polymarketMarkets,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching market sentiment data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch market sentiment data' },
      { status: 500 }
    );
  }
}
