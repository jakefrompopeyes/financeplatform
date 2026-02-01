import { NextRequest, NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const limit = searchParams.get('limit') || '20';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'FMP API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `${FMP_BASE}/sec_filings/${symbol}?limit=${limit}&apikey=${FMP_API_KEY}`
    );

    if (!response.ok) {
      const errorMsg = response.status === 403
        ? 'SEC filings not available with current FMP plan'
        : 'Failed to fetch SEC filings';
      console.error(`SEC filings API error: ${response.status} for symbol ${symbol}`);
      return NextResponse.json({ 
        error: errorMsg, 
        planUpgradeRequired: response.status === 403 
      }, { status: response.status });
    }

    const filings = await response.json();

    // Transform and categorize filings
    const transformedFilings = filings.map((filing: any) => ({
      symbol: filing.symbol || null,
      cik: filing.cik || null,
      acceptedDate: filing.acceptedDate || filing.fillingDate || null,
      filingDate: filing.fillingDate || null,
      type: filing.type || null,
      title: filing.title || null,
      link: filing.link || filing.finalLink || null,
      description: getFilingDescription(filing.type),
    }));

    return NextResponse.json({
      symbol,
      filings: transformedFilings,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching SEC filings:', error);
    return NextResponse.json({ error: 'Failed to fetch SEC filings' }, { status: 500 });
  }
}

function getFilingDescription(type: string | null): string {
  if (!type) return 'SEC Filing';
  
  const descriptions: { [key: string]: string } = {
    '10-K': 'Annual Report',
    '10-Q': 'Quarterly Report',
    '8-K': 'Current Report (Material Events)',
    'DEF 14A': 'Proxy Statement',
    '4': 'Insider Trading Report',
    'S-1': 'IPO Registration',
    'S-3': 'Securities Registration',
    '13F-HR': 'Institutional Holdings',
    '13D': 'Beneficial Ownership Report',
    '13G': 'Beneficial Ownership Report (Passive)',
    'SC 13G': 'Beneficial Ownership Report',
    '11-K': 'Annual Report of Employee Stock Plans',
    '20-F': 'Annual Report (Foreign)',
    '6-K': 'Current Report (Foreign)',
    'S-8': 'Employee Benefit Plans Registration',
    '3': 'Initial Statement of Beneficial Ownership',
    '5': 'Annual Statement of Beneficial Ownership',
    '424B2': 'Prospectus Supplement',
    '424B5': 'Prospectus Supplement',
    'FWP': 'Free Writing Prospectus',
  };

  return descriptions[type] || type;
}
