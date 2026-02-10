import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';
const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

// ── Asset definitions ──
// We use ETFs as proxies for each asset class so we can batch-fetch from FMP.

type AssetCategory = 'equities' | 'fixed-income' | 'commodities' | 'crypto' | 'currency' | 'money-market' | 'sector';

interface AssetDef {
  symbol: string;
  name: string;
  category: AssetCategory;
}

const ASSETS: AssetDef[] = [
  // Equities
  { symbol: 'SPY', name: 'S&P 500', category: 'equities' },
  { symbol: 'QQQ', name: 'Nasdaq 100', category: 'equities' },
  { symbol: 'DIA', name: 'Dow Jones', category: 'equities' },
  { symbol: 'IWM', name: 'Russell 2000', category: 'equities' },
  // Fixed Income
  { symbol: 'TLT', name: '20+ Yr Treasury', category: 'fixed-income' },
  { symbol: 'IEF', name: '7-10 Yr Treasury', category: 'fixed-income' },
  { symbol: 'SHY', name: '1-3 Yr Treasury', category: 'fixed-income' },
  { symbol: 'HYG', name: 'High Yield Corp', category: 'fixed-income' },
  // Money Market / Cash Equivalents
  { symbol: 'BIL', name: '1-3 Month T-Bill', category: 'money-market' },
  { symbol: 'SGOV', name: '0-3 Month Treasury', category: 'money-market' },
  { symbol: 'SHV', name: 'Short Treasury Bond', category: 'money-market' },
  // Commodities
  { symbol: 'GLD', name: 'Gold', category: 'commodities' },
  { symbol: 'SLV', name: 'Silver', category: 'commodities' },
  { symbol: 'USO', name: 'Crude Oil', category: 'commodities' },
  { symbol: 'DBC', name: 'Commodities Index', category: 'commodities' },
  // Currency
  { symbol: 'UUP', name: 'US Dollar', category: 'currency' },
  // Sector ETFs (11 GICS sectors)
  { symbol: 'XLK', name: 'Technology', category: 'sector' },
  { symbol: 'XLF', name: 'Financials', category: 'sector' },
  { symbol: 'XLV', name: 'Health Care', category: 'sector' },
  { symbol: 'XLE', name: 'Energy', category: 'sector' },
  { symbol: 'XLY', name: 'Consumer Disc.', category: 'sector' },
  { symbol: 'XLP', name: 'Consumer Staples', category: 'sector' },
  { symbol: 'XLI', name: 'Industrials', category: 'sector' },
  { symbol: 'XLB', name: 'Materials', category: 'sector' },
  { symbol: 'XLU', name: 'Utilities', category: 'sector' },
  { symbol: 'XLRE', name: 'Real Estate', category: 'sector' },
  { symbol: 'XLC', name: 'Communication', category: 'sector' },
];

// Helper to safely parse a number
function toNum(v: any): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  try {
    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'FMP API key not configured. Add FMP_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // ── 1. Batch-fetch quotes for all ETFs from FMP ──
    const allSymbols = ASSETS.map((a) => a.symbol);
    const symbolStr = allSymbols.join(',');

    const quoteUrl = `${FMP_BASE}/batch-quote?symbols=${symbolStr}&apikey=${FMP_API_KEY}`;
    const quoteRes = await fetch(quoteUrl, { next: { revalidate: 120 } });

    let quotes: Record<string, any> = {};
    if (quoteRes.ok) {
      const raw = await quoteRes.json();
      const list = Array.isArray(raw) ? raw : [];
      for (const q of list) {
        if (q.symbol) quotes[q.symbol] = q;
      }
    } else {
      // Fallback: fetch individually
      const individual = await Promise.allSettled(
        allSymbols.map(async (sym) => {
          const r = await fetch(
            `${FMP_BASE}/quote?symbol=${sym}&apikey=${FMP_API_KEY}`,
            { next: { revalidate: 120 } }
          );
          if (!r.ok) return null;
          const d = await r.json();
          return Array.isArray(d) ? d[0] : d;
        })
      );
      for (const result of individual) {
        if (result.status === 'fulfilled' && result.value?.symbol) {
          quotes[result.value.symbol] = result.value;
        }
      }
    }

    // ── 2. Fetch multi-period % changes via stock-price-change ──
    let priceChanges: Record<string, any> = {};
    try {
      const changeUrl = `${FMP_BASE}/stock-price-change?symbol=${symbolStr}&apikey=${FMP_API_KEY}`;
      const changeRes = await fetch(changeUrl, { next: { revalidate: 300 } });
      if (changeRes.ok) {
        const raw = await changeRes.json();
        const list = Array.isArray(raw) ? raw : [];
        for (const item of list) {
          if (item.symbol) priceChanges[item.symbol] = item;
        }
      }
    } catch (e) {
      console.error('money-flow: stock-price-change failed, using daily only', e);
    }

    // ── 3. Fetch crypto data from CoinGecko ──
    let cryptoData: any[] = [];
    try {
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&sparkline=false&price_change_percentage=1h,24h,7d,30d',
        {
          next: { revalidate: 120 },
          headers: process.env.COINGECKO_API_KEY
            ? { 'x-cg-demo-key': process.env.COINGECKO_API_KEY }
            : {},
        }
      );
      if (cgRes.ok) {
        cryptoData = await cgRes.json();
      }
    } catch (e) {
      console.error('money-flow: CoinGecko fetch failed', e);
    }

    // ── 4. Fetch FRED money market & macro data ──
    interface FredPoint { date: string; value: number }
    let moneyMarketFund: { current: number; previous: number; weekChange: number; monthChange: number; history: FredPoint[] } | null = null;
    let overnightRRP: { current: number; history: FredPoint[] } | null = null;
    let fedFundsRate: number | null = null;

    if (FRED_API_KEY && FRED_API_KEY !== 'your_api_key_here') {
      const fetchFred = async (seriesId: string, limit: number): Promise<FredPoint[]> => {
        try {
          const res = await fetch(
            `${FRED_BASE}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`,
            { next: { revalidate: 3600 } }
          );
          if (!res.ok) return [];
          const data = await res.json();
          if (!data.observations?.length) return [];
          return data.observations
            .filter((o: any) => o.value !== '.')
            .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }))
            .reverse(); // oldest → newest
        } catch (e) {
          console.error(`FRED fetch failed for ${seriesId}:`, e);
          return [];
        }
      };

      const [mmfRaw, rrpRaw, fedRaw] = await Promise.all([
        fetchFred('MMMFFAQ027S', 20),  // Money Market Funds Total Assets (quarterly, $B)
        fetchFred('RRPONTSYD', 90),     // Overnight Reverse Repo (daily, $B)
        fetchFred('FEDFUNDS', 3),       // Fed Funds Rate (most recent)
      ]);

      // Money Market Fund total assets
      if (mmfRaw.length >= 2) {
        const current = mmfRaw[mmfRaw.length - 1].value;
        const previous = mmfRaw[mmfRaw.length - 2].value;
        // Find ~1 month ago and ~1 quarter ago for change calculations
        const oneMonthAgo = mmfRaw.length >= 3 ? mmfRaw[mmfRaw.length - 3].value : previous;
        moneyMarketFund = {
          current,
          previous,
          weekChange: current - previous, // quarterly data, so this is quarter-over-quarter
          monthChange: current - oneMonthAgo,
          history: mmfRaw,
        };
      }

      // Overnight Reverse Repo
      if (rrpRaw.length >= 2) {
        overnightRRP = {
          current: rrpRaw[rrpRaw.length - 1].value,
          history: rrpRaw,
        };
      }

      // Fed Funds Rate
      if (fedRaw.length >= 1) {
        fedFundsRate = fedRaw[fedRaw.length - 1].value;
      }
    }

    // ── 5. Build unified response ──
    const assets = ASSETS.map((def) => {
      const q = quotes[def.symbol] ?? {};
      const pc = priceChanges[def.symbol] ?? {};

      const price = toNum(q.price) ?? 0;
      const previousClose = toNum(q.previousClose);
      const dayChange = previousClose ? price - previousClose : (toNum(q.change) ?? 0);
      const dayChangePct =
        previousClose && previousClose !== 0
          ? (dayChange / previousClose) * 100
          : (toNum(q.changesPercentage) ?? 0);

      return {
        symbol: def.symbol,
        name: def.name,
        category: def.category,
        price,
        dayChange,
        dayChangePct,
        weekChangePct: toNum(pc['5D']) ?? null,
        monthChangePct: toNum(pc['1M']) ?? null,
        threeMonthChangePct: toNum(pc['3M']) ?? null,
        ytdChangePct: toNum(pc.ytd) ?? null,
        yearChangePct: toNum(pc['1Y']) ?? null,
      };
    });

    // Add crypto entries
    const cryptoEntries = cryptoData.map((c: any) => ({
      symbol: (c.symbol || '').toUpperCase(),
      name: c.name || c.id,
      category: 'crypto' as const,
      price: toNum(c.current_price) ?? 0,
      dayChange: toNum(c.price_change_24h) ?? 0,
      dayChangePct: toNum(c.price_change_percentage_24h) ?? 0,
      weekChangePct: toNum(c.price_change_percentage_7d_in_currency) ?? null,
      monthChangePct: toNum(c.price_change_percentage_30d_in_currency) ?? null,
      threeMonthChangePct: null,
      ytdChangePct: null,
      yearChangePct: null,
    }));

    // ── 6. Generate flow narrative ──
    const narrative = generateNarrative([...assets, ...cryptoEntries], {
      moneyMarketFund,
      overnightRRP,
      fedFundsRate,
    });

    return NextResponse.json(
      {
        assets: [...assets, ...cryptoEntries],
        narrative,
        moneyMarketFund,
        overnightRRP,
        fedFundsRate,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' },
      }
    );
  } catch (error) {
    console.error('money-flow error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch money flow data' },
      { status: 500 }
    );
  }
}

// ── Rule-based narrative generator ──
interface AssetEntry {
  symbol: string;
  name: string;
  category: string;
  dayChangePct: number;
  weekChangePct: number | null;
}

interface FredContext {
  moneyMarketFund: { current: number; previous: number; weekChange: number; monthChange: number } | null;
  overnightRRP: { current: number } | null;
  fedFundsRate: number | null;
}

function generateNarrative(assets: AssetEntry[], fred: FredContext): string[] {
  const signals: string[] = [];
  const get = (sym: string) => assets.find((a) => a.symbol === sym);

  const spy = get('SPY');
  const qqq = get('QQQ');
  const gld = get('GLD');
  const tlt = get('TLT');
  const uup = get('UUP');
  const uso = get('USO');
  const hyg = get('HYG');
  const iwm = get('IWM');
  const btc = get('BTC');
  const bil = get('BIL');
  const sgov = get('SGOV');

  // Risk-off / Risk-on
  const equitiesDown = spy && spy.dayChangePct < -0.3;
  const equitiesUp = spy && spy.dayChangePct > 0.3;
  const goldUp = gld && gld.dayChangePct > 0.3;
  const goldDown = gld && gld.dayChangePct < -0.3;
  const bondsUp = tlt && tlt.dayChangePct > 0.2;
  const bondsDown = tlt && tlt.dayChangePct < -0.2;
  const dollarUp = uup && uup.dayChangePct > 0.15;
  const dollarDown = uup && uup.dayChangePct < -0.15;

  if (equitiesDown && (goldUp || bondsUp)) {
    signals.push(
      'Risk-off rotation detected: equities are declining while safe havens (gold/treasuries) are rising — capital appears to be moving toward safety.'
    );
  }
  if (equitiesUp && goldDown && bondsDown) {
    signals.push(
      'Risk-on environment: equities rallying as gold and bonds decline — investors are favoring growth assets over safety.'
    );
  }
  if (equitiesDown && bondsDown && goldUp) {
    signals.push(
      'Stagflation signal: both stocks and bonds falling while gold rises — markets may be pricing in persistent inflation with slowing growth.'
    );
  }
  if (bondsUp && equitiesUp) {
    signals.push(
      'Goldilocks environment: both stocks and bonds rising — markets expect moderate growth with easing monetary policy.'
    );
  }

  // Dollar dynamics
  if (dollarUp && goldDown) {
    signals.push(
      'Strong dollar is pressuring gold and commodities — capital is flowing into USD-denominated assets.'
    );
  }
  if (dollarDown && goldUp) {
    signals.push(
      'Weakening dollar is boosting gold and commodities — capital rotating away from USD.'
    );
  }

  // Sector rotation
  const xlk = get('XLK');
  const xle = get('XLE');
  const xlu = get('XLU');
  const xly = get('XLY');
  const xlp = get('XLP');

  if (xlk && xle && xlk.dayChangePct < -0.5 && xle.dayChangePct > 0.5) {
    signals.push(
      'Growth-to-value rotation: tech is selling off while energy rallies — capital rotating from growth to value/cyclical sectors.'
    );
  }
  if (xlu && xly && xlu.dayChangePct > 0.3 && xly.dayChangePct < -0.3) {
    signals.push(
      'Defensive rotation: utilities outperforming consumer discretionary — investors shifting toward defensive sectors.'
    );
  }
  if (xlp && xly && xlp.dayChangePct > 0.3 && xly.dayChangePct < -0.3) {
    signals.push(
      'Consumer caution: staples outperforming discretionary — consumers may be pulling back on spending.'
    );
  }

  // Small vs large cap
  if (iwm && spy && iwm.dayChangePct > spy.dayChangePct + 0.5) {
    signals.push(
      'Small-cap outperformance: Russell 2000 leading S&P 500 — risk appetite expanding to smaller companies.'
    );
  }
  if (iwm && spy && iwm.dayChangePct < spy.dayChangePct - 0.5) {
    signals.push(
      'Flight to quality: large-caps holding up better than small-caps — investors preferring established names.'
    );
  }

  // High yield
  if (hyg && hyg.dayChangePct < -0.3 && bondsUp) {
    signals.push(
      'Credit stress signal: high-yield bonds falling while treasuries rise — investors dumping risky debt for government bonds.'
    );
  }

  // Crypto
  if (btc && btc.dayChangePct > 3) {
    signals.push(
      'Crypto surge: Bitcoin up significantly — speculative appetite is elevated, or fiat debasement concerns are rising.'
    );
  }
  if (btc && btc.dayChangePct < -3 && goldUp) {
    signals.push(
      'Digital-to-physical rotation: Bitcoin falling while gold rises — investors may be shifting from speculative to traditional stores of value.'
    );
  }

  // Oil dynamics
  if (uso && uso.dayChangePct > 1.5) {
    signals.push(
      'Oil surging — energy sector likely benefiting. Watch for inflation implications if this persists.'
    );
  }
  if (uso && uso.dayChangePct < -1.5 && equitiesDown) {
    signals.push(
      'Oil and equities both declining — could signal demand destruction concerns or recession fears.'
    );
  }

  // ── Money market signals ──
  // Money market ETFs rising while equities fall = cash hoarding
  const mmEtfsUp = bil && sgov && (bil.dayChangePct > 0.02 || sgov.dayChangePct > 0.02);

  if (equitiesDown && mmEtfsUp) {
    signals.push(
      'Cash rotation: money market ETFs (BIL, SGOV) holding steady or gaining while equities sell off — investors are parking capital in cash equivalents.'
    );
  }

  if (equitiesUp && bil && sgov && bil.dayChangePct < -0.01 && sgov.dayChangePct < -0.01) {
    signals.push(
      'Cash leaving money markets: T-bill ETFs seeing outflows as equities rally — sidelined capital may be re-entering risk assets.'
    );
  }

  // FRED money market fund total assets
  if (fred.moneyMarketFund) {
    const mmf = fred.moneyMarketFund;
    const currentTrillions = (mmf.current / 1000).toFixed(2);
    const qoqChange = mmf.current - mmf.previous;
    const qoqPct = mmf.previous > 0 ? ((qoqChange / mmf.previous) * 100).toFixed(1) : '0';

    if (qoqChange > 50) {
      signals.push(
        `Money market fund assets at $${currentTrillions}T, up $${(qoqChange / 1000).toFixed(2)}T (${qoqPct}%) quarter-over-quarter — significant cash accumulation, investors are defensive.`
      );
    } else if (qoqChange < -50) {
      signals.push(
        `Money market fund assets at $${currentTrillions}T, down $${(Math.abs(qoqChange) / 1000).toFixed(2)}T (${qoqPct}%) quarter-over-quarter — cash leaving money markets, likely flowing into risk assets.`
      );
    } else {
      signals.push(
        `Money market fund assets at $${currentTrillions}T (${qoqChange >= 0 ? '+' : ''}${qoqPct}% QoQ) — cash levels relatively stable.`
      );
    }
  }

  // Overnight reverse repo context
  if (fred.overnightRRP) {
    const rrpBillions = fred.overnightRRP.current;
    if (rrpBillions < 100) {
      signals.push(
        `Overnight reverse repo near zero ($${rrpBillions.toFixed(0)}B) — excess liquidity has been largely drained from the system.`
      );
    } else if (rrpBillions > 500) {
      signals.push(
        `Overnight reverse repo at $${rrpBillions.toFixed(0)}B — significant excess liquidity still parked at the Fed.`
      );
    }
  }

  if (signals.length === 0) {
    signals.push(
      'Markets are relatively balanced today — no strong directional capital rotation signals detected.'
    );
  }

  return signals;
}
