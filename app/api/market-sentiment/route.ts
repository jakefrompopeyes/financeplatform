import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

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
    const marketsData = await response.json();
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
  let polymarketMarkets: any[] = [];
  try {
    polymarketMarkets = (await fetchPolymarketSentiment()) || [];
  } catch (e) {
    polymarketMarkets = [];
  }

  try {
    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json({
        vix: null,
        putCall: null,
        polymarketMarkets,
        lastUpdated: new Date().toISOString(),
        note: polymarketMarkets.length > 0
          ? 'FMP API key not configured. Showing Polymarket prediction markets only.'
          : 'FMP API key not configured and no Polymarket markets found.'
      });
    }

    // FMP: VIX is often ^VIX; try both
    const vixSymbol = '^VIX';
    const [vixQuoteRes, vixHistRes] = await Promise.all([
      fetch(`${BASE_URL}/quote?symbol=${encodeURIComponent(vixSymbol)}&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/historical-price-eod/full?symbol=${encodeURIComponent(vixSymbol)}&apikey=${FMP_API_KEY}`)
    ]);
    const vixQuoteData = await vixQuoteRes.json();
    const vixHistoricalData = await vixHistRes.json();

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

    // Put/Call: FMP may not have CBOE put/call; use demo data
    const baseRatio = 0.85 + Math.random() * 0.3;
    const putCallData = {
      current: parseFloat(baseRatio.toFixed(3)),
      change: parseFloat((Math.random() * 0.1 - 0.05).toFixed(3)),
      changePercent: parseFloat((Math.random() * 10 - 5).toFixed(2)),
      previousClose: parseFloat((baseRatio - (Math.random() * 0.1 - 0.05)).toFixed(3)),
      historical: Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return { date: d.toISOString().split('T')[0], value: parseFloat((0.85 + Math.random() * 0.3).toFixed(3)) };
      }),
      demo: true
    };

    return NextResponse.json({
      vix: vixData,
      putCall: putCallData,
      polymarketMarkets,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching market sentiment data:', error);
    const baseVix = 15.5;
    return NextResponse.json({
      vix: {
        current: baseVix,
        change: 0.5,
        changePercent: 3.33,
        previousClose: 15.0,
        historical: Array.from({ length: 30 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          return { date: d.toISOString().split('T')[0], value: parseFloat((12 + Math.random() * 8).toFixed(2)) };
        }),
        demo: true
      },
      putCall: {
        current: 0.95,
        change: 0.05,
        changePercent: 5.56,
        previousClose: 0.90,
        historical: Array.from({ length: 30 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          return { date: d.toISOString().split('T')[0], value: parseFloat((0.85 + Math.random() * 0.3).toFixed(3)) };
        }),
        demo: true
      },
      polymarketMarkets,
      lastUpdated: new Date().toISOString(),
      note: 'Using demo VIX and Put/Call data - FMP API unavailable or VIX symbol not supported'
    });
  }
}
