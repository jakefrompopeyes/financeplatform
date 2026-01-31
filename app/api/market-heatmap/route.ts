import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

const SECTOR_DATA = [
  { sector: 'Technology', symbol: 'XLK', stocks: ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL'] },
  { sector: 'Financial', symbol: 'XLF', stocks: ['JPM', 'BAC', 'WFC', 'GS', 'MS'] },
  { sector: 'Healthcare', symbol: 'XLV', stocks: ['UNH', 'JNJ', 'LLY', 'ABBV', 'MRK'] },
  { sector: 'Consumer Cyclical', symbol: 'XLY', stocks: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'] },
  { sector: 'Communication', symbol: 'XLC', stocks: ['META', 'GOOGL', 'NFLX', 'DIS', 'CMCSA'] },
  { sector: 'Industrial', symbol: 'XLI', stocks: ['CAT', 'BA', 'UNP', 'HON', 'GE'] },
  { sector: 'Consumer Staples', symbol: 'XLP', stocks: ['PG', 'KO', 'PEP', 'WMT', 'COST'] },
  { sector: 'Energy', symbol: 'XLE', stocks: ['XOM', 'CVX', 'COP', 'SLB', 'EOG'] },
  { sector: 'Utilities', symbol: 'XLU', stocks: ['NEE', 'DUK', 'SO', 'D', 'AEP'] },
  { sector: 'Real Estate', symbol: 'XLRE', stocks: ['PLD', 'AMT', 'EQIX', 'PSA', 'SPG'] },
  { sector: 'Materials', symbol: 'XLB', stocks: ['LIN', 'APD', 'SHW', 'FCX', 'NEM'] }
];

export async function GET() {
  if (!FMP_API_KEY) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const allSymbols = [
      ...SECTOR_DATA.map((s) => s.symbol),
      ...SECTOR_DATA.flatMap((s) => s.stocks.slice(0, 3))
    ];
    const uniqueSymbols = [...new Set(allSymbols)];
    const symbolsParam = uniqueSymbols.join(',');

    const response = await fetch(
      `${BASE_URL}/batch-quote?symbols=${symbolsParam}&apikey=${FMP_API_KEY}`,
      { next: { revalidate: 60 } }
    );
    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { error: text?.trim() || 'Failed to parse response from FMP' },
        { status: response.status === 403 ? 403 : 500 }
      );
    }

    if (!response.ok) {
      const msg =
        data && typeof data === 'object' && !Array.isArray(data)
          ? data['Error Message'] ?? data.message ?? data.error
          : null;
      return NextResponse.json(
        { error: typeof msg === 'string' ? msg : text?.trim() || `FMP error: HTTP ${response.status}` },
        { status: response.status === 403 ? 403 : 500 }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Failed to fetch heatmap data' },
        { status: 500 }
      );
    }

    const quoteBySymbol = new Map<string, any>();
    for (const q of data) {
      if (q?.symbol) quoteBySymbol.set((q.symbol as string).toUpperCase(), q);
    }

    const heatmapData = SECTOR_DATA.map((sector) => {
      const sectorQuote = quoteBySymbol.get(sector.symbol);
      if (!sectorQuote || sectorQuote.price == null) return null;

      const price = parseFloat(sectorQuote.price);
      const prevClose = parseFloat(sectorQuote.previousClose ?? sectorQuote.price);
      const changePercent = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;

      const stocksData = sector.stocks.slice(0, 3).map((sym) => {
        const q = quoteBySymbol.get(sym);
        if (!q || q.price == null) return null;
        const p = parseFloat(q.price);
        const prev = parseFloat(q.previousClose ?? q.price);
        const chPct = prev !== 0 ? ((p - prev) / prev) * 100 : 0;
        return {
          symbol: q.symbol,
          name: q.name || sym,
          changePercent: chPct,
          price: p,
          volume: parseInt(q.volume ?? 0, 10) || 0
        };
      }).filter((x): x is NonNullable<typeof x> => x !== null);

      return {
        sector: sector.sector,
        symbol: sector.symbol,
        changePercent,
        price,
        stocks: stocksData
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    return NextResponse.json({
      sectors: heatmapData,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heatmap data' },
      { status: 500 }
    );
  }
}
