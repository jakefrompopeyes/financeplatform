import { NextResponse } from 'next/server';

const FRED_API_KEY = process.env.FRED_API_KEY;
const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

interface SeriesConfig {
  seriesId: string;
  units?: string;
  limit: string;
  transform?: (value: number) => number;
}

export async function GET() {
  try {
    if (!FRED_API_KEY || FRED_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'FRED API key not configured. Please add FRED_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // FRED Series configurations
    // Limits tuned per data frequency: monthly ~36 (~3yr), weekly ~156 (~3yr), quarterly ~12 (~3yr)
    const seriesConfigs: Record<string, SeriesConfig> = {
      cpi:              { seriesId: 'CPIAUCSL',        units: 'pc1', limit: '36' },
      corePCE:          { seriesId: 'PCEPILFE',        units: 'pc1', limit: '36' },
      gdp:              { seriesId: 'A191RL1Q225SBEA',                limit: '12' },
      unemployment:     { seriesId: 'UNRATE',                         limit: '36' },
      joblessClaims:    { seriesId: 'ICSA',                           limit: '156', transform: (v) => v / 1000 },
      federalFundsRate: { seriesId: 'FEDFUNDS',                       limit: '36' },
      mortgageRate:     { seriesId: 'MORTGAGE30US',                   limit: '156' },
      nfci:             { seriesId: 'NFCI',                           limit: '156' },
      fedBalanceSheet:  { seriesId: 'WALCL',                          limit: '156', transform: (v) => v / 1000000 },
    };

    const fetchSeries = async (config: SeriesConfig) => {
      const params = new URLSearchParams({
        series_id: config.seriesId,
        api_key: FRED_API_KEY!,
        file_type: 'json',
        sort_order: 'desc',
        limit: config.limit,
      });
      if (config.units) params.set('units', config.units);

      const response = await fetch(`${BASE_URL}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`FRED API error for ${config.seriesId}: ${response.status}`);
      }
      return response.json();
    };

    const keys = Object.keys(seriesConfigs);
    const responses = await Promise.all(keys.map((key) => fetchSeries(seriesConfigs[key])));

    const transformData = (data: any, transform?: (v: number) => number) => {
      if (!data.observations || !Array.isArray(data.observations)) {
        return { current: 0, historical: [] };
      }

      const observations = data.observations
        .filter((obs: any) => obs.value !== '.')
        .map((obs: any) => {
          const raw = parseFloat(obs.value);
          return {
            date: obs.date,
            value: transform ? transform(raw) : raw,
          };
        })
        .reverse(); // Oldest to newest for charts

      return {
        current: observations[observations.length - 1]?.value ?? 0,
        historical: observations,
      };
    };

    const result: Record<string, any> = {};
    keys.forEach((key, i) => {
      result[key] = transformData(responses[i], seriesConfigs[key].transform);
    });

    console.log('FRED Economic Data fetched successfully (9 indicators)');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching FRED economic indicators:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch economic indicators' },
      { status: 500 }
    );
  }
}
