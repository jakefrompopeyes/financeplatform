import { NextResponse } from 'next/server';

const FRED_API_KEY = process.env.FRED_API_KEY;
const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

interface SeriesConfig {
  seriesId: string;
  units?: string;
  limit: string;
  transform?: (value: number) => number;
}

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

    // Extended view configs: ~4 years of data per frequency
    const seriesConfigs: Record<string, SeriesConfig> = {
      cpi:              { seriesId: 'CPIAUCSL',        units: 'pc1', limit: '48' },
      corePCE:          { seriesId: 'PCEPILFE',        units: 'pc1', limit: '48' },
      gdp:              { seriesId: 'A191RL1Q225SBEA',                limit: '16' },
      unemployment:     { seriesId: 'UNRATE',                         limit: '48' },
      joblessClaims:    { seriesId: 'ICSA',                           limit: '208', transform: (v) => v / 1000 },
      fedFunds:         { seriesId: 'FEDFUNDS',                       limit: '48' },
      mortgageRate:     { seriesId: 'MORTGAGE30US',                   limit: '208' },
      nfci:             { seriesId: 'NFCI',                           limit: '208' },
      fedBalanceSheet:  { seriesId: 'WALCL',                          limit: '208', transform: (v) => v / 1000000 },
    };

    const config = seriesConfigs[series || 'cpi'];
    if (!config) {
      return NextResponse.json({ error: `Unknown series: ${series}` }, { status: 400 });
    }

    const params = new URLSearchParams({
      series_id: config.seriesId,
      api_key: FRED_API_KEY,
      file_type: 'json',
      sort_order: 'desc',
      limit: config.limit,
    });
    if (config.units) params.set('units', config.units);

    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();

    const observations = data.observations
      .filter((obs: any) => obs.value !== '.')
      .map((obs: any) => {
        const raw = parseFloat(obs.value);
        return {
          date: obs.date,
          value: config.transform ? config.transform(raw) : raw,
        };
      })
      .reverse();

    return NextResponse.json({
      current: observations[observations.length - 1]?.value ?? 0,
      historical: observations,
    });
  } catch (error) {
    console.error('Error fetching extended FRED data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
