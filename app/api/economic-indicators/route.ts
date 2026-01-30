import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;

export async function GET() {
  try {
    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'API key not configured. Please add FMP_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Economic indicators (CPI, unemployment, Fed Funds) are provided by the FRED API.
    // Use the economic-indicators-fred endpoint and FRED_API_KEY.
    // For now, returning placeholder data with a message
    
    return NextResponse.json({
      error: 'Economic indicators (CPI, Unemployment, Fed Funds Rate) are not provided by this endpoint. Use the FRED API (economic-indicators-fred) or configure FRED_API_KEY for economic data.',
      note: 'Consider using https://fred.stlouisfed.org/docs/api/fred/ for economic data'
    });

  } catch (error) {
    console.error('Error fetching economic indicators:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch economic indicators' },
      { status: 500 }
    );
  }
}
