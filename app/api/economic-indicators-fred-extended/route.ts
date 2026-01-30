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
    
    // Fetch 3 years of data (36 months + 12 for YoY calculation if needed = 48 months)
    const response = await fetch(
      `${BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=48`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();

    if (series === 'cpi') {
      // Calculate YoY inflation rate from CPI
      const cpiObservations = data.observations
        .filter((obs: any) => obs.value !== '.')
        .map((obs: any) => ({
          date: obs.date,
          value: parseFloat(obs.value)
        }))
        .reverse();

      const calculateInflationRate = () => {
        if (cpiObservations.length < 13) return [];
        
        return cpiObservations.slice(12).map((obs, index) => {
          const currentCPI = obs.value;
          const yearAgoCPI = cpiObservations[index].value;
          const inflationRate = ((currentCPI - yearAgoCPI) / yearAgoCPI) * 100;
          
          return {
            date: obs.date,
            value: inflationRate
          };
        });
      };

      const inflationRates = calculateInflationRate();

      return NextResponse.json({
        current: inflationRates[inflationRates.length - 1]?.value || 0,
        historical: inflationRates
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

