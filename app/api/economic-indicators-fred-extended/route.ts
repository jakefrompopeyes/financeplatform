import { NextResponse } from 'next/server';

const FRED_API_KEY = process.env.FRED_API_KEY;
const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const series = searchParams.get('series');
    
    if (!FRED_API_KEY || FRED_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'FRED API key not configured. Please add FRED_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Map series parameter to FRED series IDs
    const seriesMap: { [key: string]: string } = {
      'cpi': 'CPIAUCSL',
      'unemployment': 'UNRATE',
      'fedFunds': 'FEDFUNDS'
    };

    const seriesId = seriesMap[series || 'cpi'] || 'CPIAUCSL';
    // For CPI use FRED's "Percent Change from Year Ago" (pc1) for official YoY inflation
    const units = series === 'cpi' ? 'pc1' : undefined;
    const limit = series === 'cpi' ? '48' : '48';
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: FRED_API_KEY,
      file_type: 'json',
      sort_order: 'desc',
      limit
    });
    if (units) params.set('units', units);

    const response = await fetch(
      `${BASE_URL}?${params.toString()}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();

    if (series === 'cpi') {
      // CPI observations are already YoY % (units=pc1)
      const observations = data.observations
        .filter((obs: any) => obs.value !== '.')
        .map((obs: any) => ({
          date: obs.date,
          value: parseFloat(obs.value)
        }))
        .reverse();

      return NextResponse.json({
        current: observations[observations.length - 1]?.value ?? 0,
        historical: observations
      });
    } else {
      // For unemployment and fed funds, return data directly
      const observations = data.observations
        .filter((obs: any) => obs.value !== '.')
        .map((obs: any) => ({
          date: obs.date,
          value: parseFloat(obs.value)
        }))
        .reverse();

      return NextResponse.json({
        current: observations[observations.length - 1]?.value || 0,
        historical: observations
      });
    }
  } catch (error) {
    console.error('Error fetching extended FRED data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

