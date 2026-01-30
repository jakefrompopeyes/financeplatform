import { NextResponse } from 'next/server';

// Polymarket's public API endpoint
const POLYMARKET_API_BASE = 'https://clob.polymarket.com';
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

interface PolymarketMarket {
  id: string;
  question: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  active: boolean;
}

export async function GET() {
  try {
    // Fetch the specific "Fed decision in December?" market
    // This market has slug: fed-decision-in-december
    const searchResponse = await fetch(
      `${GAMMA_API_BASE}/markets?limit=100&closed=false`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Polymarket API error: ${searchResponse.status}`);
    }

    const marketsData = await searchResponse.json();
    // The response might be an object with a data field or an array directly
    const markets = Array.isArray(marketsData) ? marketsData : (marketsData.data || []);
    
    // Look for the specific "Fed decision in December?" market
    const rateMarkets = markets.filter((market: any) => {
      const question = market.question?.toLowerCase() || '';
      const slug = market.slug?.toLowerCase() || '';
      
      // Match the exact market by question or slug
      return question === 'fed decision in december?' || 
             slug === 'fed-decision-in-december' ||
             (question.includes('fed decision') && question.includes('december'));
    }).slice(0, 1); // Get only this specific market

    console.log(`Found ${rateMarkets.length} December Fed decision market out of ${markets.length} total markets`);
    
    // Debug: log the market question to help troubleshoot
    if (rateMarkets.length > 0) {
      console.log('Market found:', rateMarkets[0].question);
      console.log('Market slug:', rateMarkets[0].slug);
    }

    const formattedMarkets = rateMarkets.map((market: any) => {
      // Handle different possible outcome formats
      let outcomes: string[] = ['Yes', 'No'];
      let prices: string[] = ['0.5', '0.5'];
      
      if (Array.isArray(market.outcomes)) {
        outcomes = market.outcomes;
      } else if (market.tokens && Array.isArray(market.tokens)) {
        outcomes = market.tokens.map((t: any) => t.outcome || 'Unknown');
      }
      
      if (market.outcomePrices) {
        prices = typeof market.outcomePrices === 'string' 
          ? market.outcomePrices.split(',') 
          : market.outcomePrices;
      } else if (market.tokens && Array.isArray(market.tokens)) {
        prices = market.tokens.map((t: any) => t.price || '0.5');
      }
      
      // Convert prices to probabilities (they're typically in decimal form 0-1)
      const probabilities = prices.map((price: string, index: number) => {
        const parsedPrice = parseFloat(price);
        const probability = !isNaN(parsedPrice) ? parsedPrice * 100 : 50; // Convert to percentage, default to 50%
        
        return {
          outcome: outcomes[index] || 'Unknown',
          probability: Math.max(0, Math.min(100, probability)) // Clamp between 0-100
        };
      }).filter(p => p.probability != null && !isNaN(p.probability)); // Filter out invalid probabilities

      return {
        id: market.conditionId || market.id || `market-${Date.now()}`,
        question: market.question || 'Unknown Market',
        probabilities,
        volume: parseFloat(market.volume || '0'),
        liquidity: parseFloat(market.liquidity || '0'),
        endDate: market.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        active: market.active ?? true,
        url: market.slug ? `https://polymarket.com/event/${market.slug}` : `https://polymarket.com`
      };
    }).filter((market: { probabilities: unknown[] }) => market.probabilities.length > 0); // Only include markets with valid probabilities

    // If no rate-related markets found, return demo data
    if (formattedMarkets.length === 0) {
      return NextResponse.json({
        markets: [
          {
            id: 'demo-fed-dec',
            question: 'Fed decision in December?',
            probabilities: [
              { outcome: '25 bps decrease', probability: 52 },
              { outcome: 'No change', probability: 47 },
              { outcome: '50+ bps decrease', probability: 2.3 },
              { outcome: '25+ bps increase', probability: 0.6 }
            ],
            volume: 113675185,
            liquidity: 0,
            endDate: new Date('2025-12-10').toISOString(),
            active: true,
            url: 'https://polymarket.com/event/fed-decision-in-december',
            demo: true
          }
        ],
        lastUpdated: new Date().toISOString(),
        source: 'Polymarket',
        note: 'No active December Fed decision market found on Polymarket. Showing demo data. Real markets typically become available closer to the FOMC meeting date.'
      });
    }

    return NextResponse.json({
      markets: formattedMarkets,
      lastUpdated: new Date().toISOString(),
      source: 'Polymarket'
    });

  } catch (error) {
    console.error('Error fetching Polymarket data:', error);
    
    // Return sample data for demonstration if API fails
    return NextResponse.json({
      markets: [
        {
          id: 'error-fed-dec',
          question: 'Fed decision in December?',
          probabilities: [
            { outcome: '25 bps decrease', probability: 52 },
            { outcome: 'No change', probability: 47 },
            { outcome: '50+ bps decrease', probability: 2.3 },
            { outcome: '25+ bps increase', probability: 0.6 }
          ],
          volume: 0,
          liquidity: 0,
          endDate: new Date('2025-12-10').toISOString(),
          active: true,
          url: 'https://polymarket.com/event/fed-decision-in-december',
          demo: true
        }
      ],
      lastUpdated: new Date().toISOString(),
      source: 'Polymarket',
      note: 'Unable to connect to Polymarket API. Showing demo data for December Fed decision market.'
    });
  }
}

