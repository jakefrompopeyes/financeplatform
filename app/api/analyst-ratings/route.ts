import { NextRequest, NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'FMP API key not configured' }, { status: 500 });
  }

  try {
    // Fetch analyst ratings and price targets
    const [ratingsRes, estimatesRes] = await Promise.all([
      fetch(`${FMP_BASE}/rating/${symbol}?apikey=${FMP_API_KEY}`),
      fetch(`${FMP_BASE}/analyst-estimates/${symbol}?limit=4&apikey=${FMP_API_KEY}`)
    ]);

    if (!ratingsRes.ok || !estimatesRes.ok) {
      const status = !ratingsRes.ok ? ratingsRes.status : estimatesRes.status;
      const errorMsg = status === 403 
        ? 'Analyst ratings not available with current FMP plan'
        : 'Failed to fetch analyst data';
      console.error(`Analyst ratings API error: ${status}`, {
        ratingsStatus: ratingsRes.status,
        estimatesStatus: estimatesRes.status,
      });
      return NextResponse.json({ error: errorMsg, planUpgradeRequired: status === 403 }, { status });
    }

    const ratings = await ratingsRes.json();
    const estimates = await estimatesRes.json();

    // Get the most recent rating
    const latestRating = ratings && ratings.length > 0 ? ratings[0] : null;

    return NextResponse.json({
      symbol,
      rating: latestRating ? {
        rating: latestRating.rating || null,
        ratingScore: latestRating.ratingScore || null,
        ratingRecommendation: latestRating.ratingRecommendation || null,
        ratingDetailsDCFScore: latestRating.ratingDetailsDCFScore || null,
        ratingDetailsDCFRecommendation: latestRating.ratingDetailsDCFRecommendation || null,
        ratingDetailsROEScore: latestRating.ratingDetailsROEScore || null,
        ratingDetailsROERecommendation: latestRating.ratingDetailsROERecommendation || null,
        ratingDetailsDEScore: latestRating.ratingDetailsDEScore || null,
        ratingDetailsDERecommendation: latestRating.ratingDetailsDERecommendation || null,
        ratingDetailsPEScore: latestRating.ratingDetailsPEScore || null,
        ratingDetailsPERecommendation: latestRating.ratingDetailsPERecommendation || null,
        ratingDetailsPBScore: latestRating.ratingDetailsPBScore || null,
        ratingDetailsPBRecommendation: latestRating.ratingDetailsPBRecommendation || null,
        date: latestRating.date || null,
      } : null,
      estimates: estimates && estimates.length > 0 ? estimates.map((est: any) => ({
        date: est.date || null,
        symbol: est.symbol || null,
        estimatedRevenueLow: est.estimatedRevenueLow || null,
        estimatedRevenueHigh: est.estimatedRevenueHigh || null,
        estimatedRevenueAvg: est.estimatedRevenueAvg || null,
        estimatedEbitdaLow: est.estimatedEbitdaLow || null,
        estimatedEbitdaHigh: est.estimatedEbitdaHigh || null,
        estimatedEbitdaAvg: est.estimatedEbitdaAvg || null,
        estimatedEbitLow: est.estimatedEbitLow || null,
        estimatedEbitHigh: est.estimatedEbitHigh || null,
        estimatedEbitAvg: est.estimatedEbitAvg || null,
        estimatedNetIncomeLow: est.estimatedNetIncomeLow || null,
        estimatedNetIncomeHigh: est.estimatedNetIncomeHigh || null,
        estimatedNetIncomeAvg: est.estimatedNetIncomeAvg || null,
        estimatedSgaExpenseLow: est.estimatedSgaExpenseLow || null,
        estimatedSgaExpenseHigh: est.estimatedSgaExpenseHigh || null,
        estimatedSgaExpenseAvg: est.estimatedSgaExpenseAvg || null,
        estimatedEpsAvg: est.estimatedEpsAvg || null,
        estimatedEpsHigh: est.estimatedEpsHigh || null,
        estimatedEpsLow: est.estimatedEpsLow || null,
        numberAnalystEstimatedRevenue: est.numberAnalystEstimatedRevenue || null,
        numberAnalystsEstimatedEps: est.numberAnalystsEstimatedEps || null,
      })) : [],
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching analyst data:', error);
    return NextResponse.json({ error: 'Failed to fetch analyst data' }, { status: 500 });
  }
}
