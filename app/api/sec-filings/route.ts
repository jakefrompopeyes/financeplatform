import { NextRequest, NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
// Use the stable API endpoint
const FMP_BASE = 'https://financialmodelingprep.com/stable';

// Note: FMP Starter plan only supports SEC filings for a limited set of ~87 symbols
// See: https://site.financialmodelingprep.com/developer/docs/pricing
const STARTER_PLAN_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.A', 'BRK.B',
  'UNH', 'XOM', 'JNJ', 'JPM', 'V', 'PG', 'MA', 'HD', 'CVX', 'MRK',
  'ABBV', 'LLY', 'PEP', 'KO', 'COST', 'AVGO', 'TMO', 'MCD', 'WMT', 'CSCO',
  'ACN', 'ABT', 'DHR', 'VZ', 'NEE', 'ADBE', 'TXN', 'PM', 'CRM', 'NKE',
  'BMY', 'UPS', 'RTX', 'CMCSA', 'ORCL', 'AMD', 'COP', 'HON', 'INTC', 'T',
  'LOW', 'UNP', 'IBM', 'GS', 'ELV', 'SPGI', 'QCOM', 'BA', 'CAT', 'DE',
  'SBUX', 'INTU', 'PLD', 'MS', 'GE', 'GILD', 'MDLZ', 'AXP', 'BLK', 'LMT',
  'ISRG', 'AMT', 'CVS', 'ADI', 'REGN', 'TJX', 'SYK', 'VRTX', 'ADP', 'NOW',
  'BKNG', 'MMC', 'CI', 'SCHW', 'ZTS', 'CB'
]);

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
    // Use the stable API endpoint for SEC filings by symbol
    const response = await fetch(
      `${FMP_BASE}/sec-filings-search/symbol?symbol=${symbol}&limit=${limit}&apikey=${FMP_API_KEY}`
    );

    if (!response.ok) {
      // Check if this might be a plan limitation issue
      const isLikelySampleSymbol = STARTER_PLAN_SYMBOLS.has(symbol.toUpperCase());
      let errorMsg = 'Failed to fetch SEC filings';
      let planUpgradeRequired = false;
      
      if (response.status === 403 || response.status === 401) {
        errorMsg = isLikelySampleSymbol 
          ? 'SEC filings not available - check your FMP API key and plan'
          : `SEC filings for ${symbol} may not be available on FMP Starter plan. Try major stocks like AAPL, MSFT, TSLA.`;
        planUpgradeRequired = true;
      }
      
      console.error(`SEC filings API error: ${response.status} for symbol ${symbol}`);
      return NextResponse.json({ 
        error: errorMsg, 
        planUpgradeRequired,
        supportedSymbolsHint: !isLikelySampleSymbol 
      }, { status: response.status });
    }

    const filings = await response.json();

    // Handle empty or error responses
    if (!Array.isArray(filings)) {
      // API might return an object with error info
      if (filings.error || filings['Error Message']) {
        const errorMsg = filings.error || filings['Error Message'] || 'No SEC filings data available';
        console.error(`SEC filings error response for ${symbol}:`, errorMsg);
        return NextResponse.json({ 
          error: errorMsg,
          planUpgradeRequired: errorMsg.toLowerCase().includes('upgrade') || errorMsg.toLowerCase().includes('plan')
        }, { status: 400 });
      }
      return NextResponse.json({
        symbol,
        filings: [],
        timestamp: Date.now(),
      });
    }

    // Transform and categorize filings
    const transformedFilings = filings.map((filing: any) => ({
      symbol: filing.symbol || symbol,
      cik: filing.cik || null,
      acceptedDate: filing.acceptedDate || filing.filedDate || filing.fillingDate || null,
      filingDate: filing.filedDate || filing.fillingDate || null,
      type: filing.type || filing.formType || null,
      title: filing.title || filing.description || null,
      link: filing.link || filing.finalLink || filing.filingLink || null,
      description: getFilingDescription(filing.type || filing.formType),
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
