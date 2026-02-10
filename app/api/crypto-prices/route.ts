import { NextResponse } from 'next/server';

// Prevent Next.js from caching this route so prices stay fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const BASE_URL = 'https://api.coingecko.com/api/v3';

function normalizeImage(coin: { image?: string | { small?: string; large?: string } }): string {
  const img = coin.image;
  return typeof img === 'string' ? img : (img?.small || img?.large || '');
}

export async function GET() {
  try {
    const cryptoIds = ['bitcoin', 'ethereum', 'solana'];
    
    // Build API URL with or without API key
    const apiKeyParam = COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : '';
    
    // Fetch market data (without sparkline first to get basic info)
    const marketsResponse = await fetch(
      `${BASE_URL}/coins/markets?vs_currency=usd&ids=${cryptoIds.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h${apiKeyParam}`,
      {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store', // Always get fresh prices from CoinGecko
      }
    );

    if (!marketsResponse.ok) {
      throw new Error(`CoinGecko API error: ${marketsResponse.status}`);
    }

    const marketsData = await marketsResponse.json();

    // Fetch both 24-hour and 7-day chart data for each crypto
    const result = await Promise.all(
      marketsData.map(async (coin: any) => {
        try {
          // Fetch 24-hour price chart data
          const chart24hResponse = await fetch(
            `${BASE_URL}/coins/${coin.id}/market_chart?vs_currency=usd&days=1${apiKeyParam ? `&${apiKeyParam.slice(1)}` : ''}`,
            {
              headers: { 'Accept': 'application/json' },
              cache: 'no-store',
            }
          );

          // Fetch 7-day price chart data
          const chart7dResponse = await fetch(
            `${BASE_URL}/coins/${coin.id}/market_chart?vs_currency=usd&days=7${apiKeyParam ? `&${apiKeyParam.slice(1)}` : ''}`,
            {
              headers: { 'Accept': 'application/json' },
              cache: 'no-store',
            }
          );

          let sparkline24h: number[] = [];
          let sparkline7d: number[] = [];
          
          if (chart24hResponse.ok) {
            const chartData = await chart24hResponse.json();
            // Extract prices from the chart data (returns array of [timestamp, price])
            sparkline24h = chartData.prices?.map((p: [number, number]) => p[1]) || [];
          }

          if (chart7dResponse.ok) {
            const chartData = await chart7dResponse.json();
            sparkline7d = chartData.prices?.map((p: [number, number]) => p[1]) || [];
          }

          return {
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            image: normalizeImage(coin),
            currentPrice: coin.current_price,
            priceChange24h: coin.price_change_24h || 0,
            priceChangePercentage24h: coin.price_change_percentage_24h || 0,
            marketCap: coin.market_cap,
            volume24h: coin.total_volume,
            sparkline24h: sparkline24h,
            sparkline7d: sparkline7d,
            high24h: coin.high_24h,
            low24h: coin.low_24h,
            ath: coin.ath ?? null,
            atl: coin.atl ?? null,
          };
        } catch (error) {
          console.error(`Error fetching chart for ${coin.id}:`, error);
          // Return coin data without sparkline if chart fetch fails
          return {
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            image: normalizeImage(coin),
            currentPrice: coin.current_price,
            priceChange24h: coin.price_change_24h || 0,
            priceChangePercentage24h: coin.price_change_percentage_24h || 0,
            marketCap: coin.market_cap,
            volume24h: coin.total_volume,
            sparkline24h: [],
            sparkline7d: [],
            high24h: coin.high_24h,
            low24h: coin.low_24h,
            ath: coin.ath ?? null,
            atl: coin.atl ?? null,
          };
        }
      })
    );

    console.log(`Fetched ${result.length} cryptocurrencies from CoinGecko with 24h charts`);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, max-age=0', // Don't cache in browser
      },
    });
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch crypto prices' },
      { status: 500 }
    );
  }
}

