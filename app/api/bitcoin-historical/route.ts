import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const BASE_URL = 'https://api.coingecko.com/api/v3';

export async function GET() {
  try {
    // Build API URL with or without API key
    const apiKeyParam = COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : '';
    
    // Fetch Bitcoin market chart for 30 days
    const response = await fetch(
      `${BASE_URL}/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily${apiKeyParam}`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.prices || data.prices.length === 0) {
      throw new Error('No Bitcoin price data received');
    }

    // Transform data to our format
    // data.prices is an array of [timestamp, price]
    const historical = data.prices.map((item: [number, number]) => ({
      date: new Date(item[0]).toISOString().split('T')[0],
      price: item[1]
    }));

    // Calculate percentage change from first day
    const basePrice = historical[0].price;
    const historicalWithPercentage = historical.map((item: any) => ({
      date: item.date,
      price: item.price,
      percentChange: ((item.price - basePrice) / basePrice) * 100
    }));

    console.log(`Fetched ${historicalWithPercentage.length} days of Bitcoin historical data`);

    return NextResponse.json({
      historical: historicalWithPercentage,
      basePrice: basePrice,
      currentPrice: historical[historical.length - 1].price,
      source: 'CoinGecko'
    });
  } catch (error) {
    console.error('Error fetching Bitcoin historical data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Bitcoin data' },
      { status: 500 }
    );
  }
}



