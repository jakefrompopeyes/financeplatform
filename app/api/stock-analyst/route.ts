import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';
const BASE_V4 = 'https://financialmodelingprep.com/api/v4';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes - analyst data changes less frequently

/** Get first item from FMP response - handles both array and single-object formats */
function firstItem(data: any): any {
  if (data == null) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  const inner = data?.data;
  if (Array.isArray(inner)) return inner[0] ?? null;
  if (inner != null && typeof inner === 'object') return inner;
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const cacheKey = symbol.toUpperCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    const [
      priceTargetSummaryRes,
      priceTargetConsensusRes,
      gradesConsensusRes,
      gradesRes,
      analystEstimatesRes,
      analystEstimatesQuarterlyRes,
      ratingsSnapshotRes,
    ] = await Promise.all([
      fetch(`${BASE_URL}/price-target-summary?symbol=${symbol}&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/price-target-consensus?symbol=${symbol}&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/grades-consensus?symbol=${symbol}&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/grades?symbol=${symbol}&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/analyst-estimates?symbol=${symbol}&period=annual&page=0&limit=5&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/analyst-estimates?symbol=${symbol}&period=quarter&page=0&limit=4&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/ratings-snapshot?symbol=${symbol}&apikey=${FMP_API_KEY}`),
    ]);

    // Price Target Summary - average targets by period
    let priceTargetSummary: any = null;
    if (priceTargetSummaryRes.ok) {
      const data = await priceTargetSummaryRes.json();
      priceTargetSummary = firstItem(data);
    }

    // Price Target Consensus - high, low, median, consensus (stable API)
    let priceTargetConsensus: any = null;
    if (priceTargetConsensusRes.ok) {
      const data = await priceTargetConsensusRes.json();
      priceTargetConsensus = firstItem(data);
    }

    // Grades Consensus - strong buy, buy, hold, sell, strong sell counts
    let gradesConsensus: any = null;
    if (gradesConsensusRes.ok) {
      const data = await gradesConsensusRes.json();
      gradesConsensus = firstItem(data);
    }

    // Grades - latest analyst actions (upgrades, downgrades)
    let grades: any[] = [];
    if (gradesRes.ok) {
      const data = await gradesRes.json();
      const arr = Array.isArray(data) ? data : data?.data ?? [];
      grades = (arr as any[]).slice(0, 10);
    }

    // Analyst Estimates - forward revenue, EPS, etc. (annual)
    let analystEstimates: any[] = [];
    if (analystEstimatesRes.ok) {
      const data = await analystEstimatesRes.json();
      const arr = Array.isArray(data) ? data : data?.data ?? [];
      analystEstimates = (arr as any[]).slice(0, 5);
    }

    // Quarterly analyst estimates - for next earnings revenue
    let quarterlyEstimates: any[] = [];
    if (analystEstimatesQuarterlyRes.ok) {
      const data = await analystEstimatesQuarterlyRes.json();
      const arr = Array.isArray(data) ? data : data?.data ?? [];
      quarterlyEstimates = (arr as any[]).slice(0, 4);
    }

    // Ratings Snapshot - financial rating snapshot
    let ratingsSnapshot: any = null;
    if (ratingsSnapshotRes.ok) {
      const data = await ratingsSnapshotRes.json();
      ratingsSnapshot = firstItem(data);
    }

    const result = {
      symbol: symbol.toUpperCase(),
      priceTargetSummary: priceTargetSummary
        ? {
            symbol: priceTargetSummary.symbol ?? symbol,
            lastMonthAvg: priceTargetSummary.lastMonthAvg ?? priceTargetSummary.last_month_avg ?? null,
            lastQuarterAvg: priceTargetSummary.lastQuarterAvg ?? priceTargetSummary.last_quarter_avg ?? null,
            lastYearAvg: priceTargetSummary.lastYearAvg ?? priceTargetSummary.last_year_avg ?? null,
            allTimeAvg: priceTargetSummary.allTimeAvg ?? priceTargetSummary.all_time_avg ?? null,
            analystCount: priceTargetSummary.analystCount ?? priceTargetSummary.analyst_count ?? null,
          }
        : null,
      priceTargetConsensus: priceTargetConsensus
        ? {
            symbol: priceTargetConsensus.symbol ?? symbol,
            high: priceTargetConsensus.high ?? priceTargetConsensus.high_price_target ?? null,
            low: priceTargetConsensus.low ?? priceTargetConsensus.low_price_target ?? null,
            median: priceTargetConsensus.median ?? priceTargetConsensus.median_price_target ?? null,
            consensus: priceTargetConsensus.consensus ?? priceTargetConsensus.mean ?? priceTargetConsensus.consensus_price_target ?? priceTargetConsensus.average ?? null,
          }
        : null,
      gradesConsensus: gradesConsensus
        ? {
            symbol: gradesConsensus.symbol ?? symbol,
            strongBuy: gradesConsensus.strongBuy ?? gradesConsensus.strong_buy ?? 0,
            buy: gradesConsensus.buy ?? 0,
            hold: gradesConsensus.hold ?? 0,
            sell: gradesConsensus.sell ?? 0,
            strongSell: gradesConsensus.strongSell ?? gradesConsensus.strong_sell ?? 0,
          }
        : null,
      grades: grades.map((g: any) => ({
        date: g.date ?? g.publishedDate ?? null,
        analyst: g.analyst ?? g.analystName ?? null,
        action: g.action ?? g.grade ?? null,
        from: g.fromGrade ?? null,
        to: g.toGrade ?? g.newGrade ?? null,
        company: g.company ?? null,
      })),
      analystEstimates: analystEstimates.map((e: any) => ({
        date: e.date ?? e.period ?? null,
        symbol: e.symbol ?? symbol,
        revenueEst: e.revenueEst ?? e.revenue_est ?? null,
        revenueActual: e.revenueActual ?? e.revenue_actual ?? null,
        epsEst: e.epsEst ?? e.eps_est ?? e.eps ?? null,
        epsActual: e.epsActual ?? e.eps_actual ?? null,
        period: e.period ?? null,
      })),
      quarterlyEstimates: quarterlyEstimates.map((e: any) => ({
        date: e.date ?? e.period ?? null,
        symbol: e.symbol ?? symbol,
        revenueEst: e.revenueEst ?? e.revenue_est ?? null,
        epsEst: e.epsEst ?? e.eps_est ?? e.eps ?? null,
        period: e.period ?? null,
      })),
      ratingsSnapshot: ratingsSnapshot
        ? {
            symbol: ratingsSnapshot.symbol ?? symbol,
            rating: ratingsSnapshot.rating ?? ratingsSnapshot.recommendation ?? null,
            ratingScore: ratingsSnapshot.ratingScore ?? ratingsSnapshot.rating_score ?? null,
            ratingDetails: ratingsSnapshot.ratingDetails ?? ratingsSnapshot.rating_details ?? null,
          }
        : null,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Error fetching stock analyst data:', error);
    return NextResponse.json({ error: 'Failed to fetch analyst data' }, { status: 500 });
  }
}
