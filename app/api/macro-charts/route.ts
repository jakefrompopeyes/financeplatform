import { NextResponse } from 'next/server';

const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

/** Aggregate daily series to monthly: last value per month (by date), sorted oldest first */
function dailyToMonthlyByLastDay<T extends { date: string }>(
  items: T[],
  valueKey: keyof T
): { date: string; value: number }[] {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const byMonth = new Map<string, number>();
  for (const item of sorted) {
    const month = item.date.slice(0, 7);
    byMonth.set(month, Number((item as any)[valueKey]));
  }
  return Array.from(byMonth.entries())
    .map(([month, value]) => ({ date: `${month}-01`, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Index series to 100 at first observation */
function indexTo100(series: { date: string; value: number }[]): { date: string; value: number }[] {
  if (series.length === 0) return [];
  const first = series[0].value;
  if (first === 0) return series;
  return series.map(({ date, value }) => ({ date, value: (value / first) * 100 }));
}

export async function GET() {
  try {
    const out: {
      btcVsM2?: { date: string; btcIndex: number; m2Index: number }[];
      sp500VsRates?: { date: string; sp500: number; fedFunds: number }[];
      tenYVsFed?: { date: string; tenY: number; fedFunds: number }[];
      yieldCurveSpread?: { date: string; value: number }[];
      m2YoY?: { date: string; value: number }[];
      highYieldSpread?: { date: string; value: number }[];
      error?: string;
    } = {};

    // ---- BTC (CoinGecko) ----
    const cgKey = COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : '';
    let btcDaily: { date: string; value: number }[] = [];
    try {
      // 5 years; CoinGecko may return daily or auto-aggregate for long range
      const btcRes = await fetch(
        `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=1825&interval=daily${cgKey}`,
        { next: { revalidate: 3600 } }
      );
      if (btcRes.ok) {
        const btcData = await btcRes.json();
        if (btcData.prices?.length) {
          btcDaily = btcData.prices
            .map((p: [number, number]) => ({
              date: new Date(p[0]).toISOString().split('T')[0],
              value: p[1],
            }))
            .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
        }
      }
    } catch (e) {
      console.warn('Macro charts: BTC fetch failed', e);
    }

    // ---- M2 & Fed Funds (FRED) ----
    let m2Monthly: { date: string; value: number }[] = [];
    let fedMonthly: { date: string; value: number }[] = [];
    let tenYMonthly: { date: string; value: number }[] = [];

    if (FRED_API_KEY && FRED_API_KEY !== 'your_api_key_here') {
      const fred = async (seriesId: string, limit: number) => {
        const res = await fetch(
          `${FRED_BASE}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        if (!data.observations?.length) return [];
        return data.observations
          .filter((o: any) => o.value !== '.')
          .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }))
          .reverse();
      };
      // 10 years for monthly; daily series for 10Y, yield curve, high yield
      const [m2Raw, fedRaw, tenYRaw, t10y2yRaw, hyRaw] = await Promise.all([
        fred('M2SL', 120),
        fred('FEDFUNDS', 120),
        fred('DGS10', 2520),
        fred('T10Y2Y', 2520), // 10Y-2Y spread (daily); inversion = recession signal
        fred('BAMLH0A0HYM2', 2520), // high yield OAS (daily)
      ]);
      m2Monthly = m2Raw;
      fedMonthly = fedRaw;
      tenYMonthly = tenYRaw;

      // Yield curve spread: use daily, aggregate to monthly for consistency
      if (t10y2yRaw.length > 40) {
        out.yieldCurveSpread = dailyToMonthlyByLastDay(
          t10y2yRaw as { date: string; value: number }[],
          'value'
        );
      }

      // M2 year-over-year % change
      if (m2Raw.length >= 13) {
        out.m2YoY = m2Raw
          .slice(12)
          .map((_: { date: string; value: number }, i: number) => {
            const current = m2Raw[i + 12].value;
            const yearAgo = m2Raw[i].value;
            return {
              date: m2Raw[i + 12].date,
              value: yearAgo > 0 ? ((current - yearAgo) / yearAgo) * 100 : 0,
            };
          });
      }

      // High yield spread: aggregate daily to monthly
      if (hyRaw.length > 40) {
        out.highYieldSpread = dailyToMonthlyByLastDay(
          hyRaw as { date: string; value: number }[],
          'value'
        );
      }
    }

    // ---- BTC vs M2 (indexed to 100) ----
    if (btcDaily.length && m2Monthly.length) {
      const btcMonthly = dailyToMonthlyByLastDay(
        btcDaily as { date: string; value: number }[],
        'value'
      );
      const btcIndexed = indexTo100(btcMonthly);
      const m2Indexed = indexTo100(m2Monthly);
      const monthSet = new Set(btcIndexed.map((x) => x.date));
      const m2ByMonth = new Map(m2Indexed.map((x) => [x.date, x.value]));
      out.btcVsM2 = btcIndexed
        .filter((x) => m2ByMonth.has(x.date))
        .map((x) => ({
          date: x.date,
          btcIndex: x.value,
          m2Index: m2ByMonth.get(x.date)!,
        }));
    }

    // ---- S&P 500 (FMP SPY historical) ----
    let spyMonthly: { date: string; value: number }[] = [];
    if (FMP_API_KEY && FMP_API_KEY !== 'your_api_key_here') {
      try {
        const spyRes = await fetch(
          `${FMP_BASE}/historical-price-eod/full?symbol=SPY&apikey=${FMP_API_KEY}`,
          { next: { revalidate: 3600 } }
        );
        if (spyRes.ok) {
          const spyData = await spyRes.json();
          const values = Array.isArray(spyData) ? spyData : spyData.historical || [];
          if (values.length) {
            const daily = values
              .slice(0, 1260)
              .map((v: any) => ({
                date: (v.date || v.datetime || '').toString().slice(0, 10),
                close: parseFloat(v.close ?? v.adjClose ?? v.price ?? 0)
              }))
              .filter((x: any) => x.date)
              .sort((a: any, b: any) => a.date.localeCompare(b.date));
            spyMonthly = dailyToMonthlyByLastDay(
              daily as { date: string; close: number }[],
              'close'
            );
          }
        }
      } catch (e) {
        console.warn('Macro charts: SPY fetch failed', e);
      }
    }

    // ---- S&P 500 vs Fed Funds ----
    if (spyMonthly.length && fedMonthly.length) {
      const fedByMonth = new Map(fedMonthly.map((x) => [x.date.slice(0, 7), x.value]));
      out.sp500VsRates = spyMonthly
        .map((p) => {
          const ym = p.date.slice(0, 7);
          const fed = fedByMonth.get(ym);
          if (fed == null) return null;
          return { date: p.date, sp500: p.value, fedFunds: fed };
        })
        .filter((x): x is { date: string; sp500: number; fedFunds: number } => x != null);
    }

    // ---- 10Y Treasury vs Fed Funds (aggregate daily 10Y to monthly) ----
    if (tenYMonthly.length && fedMonthly.length) {
      // tenY from FRED may be daily; aggregate to last-of-month
      const tenYAsMonthly =
        tenYMonthly.length > 40
          ? dailyToMonthlyByLastDay(
              tenYMonthly as { date: string; value: number }[],
              'value'
            )
          : tenYMonthly;
      const fedByMonth = new Map(fedMonthly.map((x) => [x.date.slice(0, 7), x.value]));
      out.tenYVsFed = tenYAsMonthly
        .map((p) => {
          const ym = p.date.slice(0, 7);
          const fed = fedByMonth.get(ym);
          if (fed == null) return null;
          return { date: p.date, tenY: p.value, fedFunds: fed };
        })
        .filter((x): x is { date: string; tenY: number; fedFunds: number } => x != null);
    }

    return NextResponse.json(out);
  } catch (error) {
    console.error('Macro charts API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load macro charts' },
      { status: 500 }
    );
  }
}
