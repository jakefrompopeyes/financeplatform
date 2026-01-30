import { NextResponse } from 'next/server';

const FRED_API_KEY = process.env.FRED_API_KEY;
const BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

export async function GET() {
  try {
    if (!FRED_API_KEY || FRED_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'FRED API key not configured. Please add FRED_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // FRED Series IDs for economic indicators
    const seriesIds = {
      cpi: 'CPIAUCSL',           // Consumer Price Index for All Urban Consumers
      unemployment: 'UNRATE',     // Unemployment Rate
      fedFunds: 'FEDFUNDS'        // Federal Funds Effective Rate
    };

    // Fetch data for all three indicators
    const fetchSeries = async (seriesId: string) => {
      const response = await fetch(
        `${BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=24`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`FRED API error for ${seriesId}: ${response.status}`);
      }

      return response.json();
    };

    const [cpiData, unemploymentData, fedFundsData] = await Promise.all([
      fetchSeries(seriesIds.cpi),
      fetchSeries(seriesIds.unemployment),
      fetchSeries(seriesIds.fedFunds)
    ]);

    // Transform data to our format
    const transformData = (data: any) => {
      if (!data.observations || !Array.isArray(data.observations)) {
        return { current: 0, historical: [] };
      }

      const observations = data.observations
        .filter((obs: any) => obs.value !== '.')
        .map((obs: any) => ({
          date: obs.date,
          value: parseFloat(obs.value)
        }))
        .reverse(); // Oldest to newest

      return {
        current: observations[observations.length - 1]?.value || 0,
        historical: observations
      };
    };

    // Calculate YoY inflation rate from CPI
    const cpiObservations = cpiData.observations
      .filter((obs: any) => obs.value !== '.')
      .map((obs: any) => ({
        date: obs.date,
        value: parseFloat(obs.value)
      }))
      .reverse();

    const calculateInflationRate = () => {
      if (cpiObservations.length < 13) return [];
      
      return cpiObservations.slice(12).map((obs: { date: string; value: number }, index: number) => {
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

    const result = {
      cpi: {
        current: inflationRates[inflationRates.length - 1]?.value || 0,
        historical: inflationRates
      },
      unemployment: transformData(unemploymentData),
      federalFundsRate: transformData(fedFundsData)
    };

    console.log('FRED Economic Data fetched successfully');
    console.log(`CPI (Inflation): ${result.cpi.current.toFixed(2)}%`);
    console.log(`Unemployment: ${result.unemployment.current.toFixed(2)}%`);
    console.log(`Fed Funds: ${result.federalFundsRate.current.toFixed(2)}%`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching FRED economic indicators:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch economic indicators' },
      { status: 500 }
    );
  }
}




