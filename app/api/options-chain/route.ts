import { NextRequest, NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export interface OptionContract {
  symbol: string;
  underlying: string;
  expiration: string;
  strike: number;
  type: 'call' | 'put';
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  inTheMoney: boolean;
  change: number;
  changePercent: number;
}

export interface OptionsChainData {
  symbol: string;
  underlyingPrice: number;
  expirationDates: string[];
  calls: OptionContract[];
  puts: OptionContract[];
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch options chain data from FMP
    const [optionsResponse, quoteResponse] = await Promise.all([
      fetch(
        `${BASE_URL}/stock_option_chain?symbol=${symbol}&apikey=${FMP_API_KEY}`,
        { next: { revalidate: 60 } }
      ),
      fetch(
        `${BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`,
        { next: { revalidate: 60 } }
      )
    ]);

    // Get underlying stock price
    let underlyingPrice = 0;
    try {
      const quoteData = await quoteResponse.json();
      if (Array.isArray(quoteData) && quoteData.length > 0) {
        underlyingPrice = quoteData[0].price || 0;
      }
    } catch {
      // Continue without underlying price
    }

    const optionsText = await optionsResponse.text();
    let optionsData: any;

    try {
      optionsData = optionsText ? JSON.parse(optionsText) : null;
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse options data from FMP' },
        { status: 500 }
      );
    }

    if (!optionsResponse.ok) {
      const msg = optionsData?.['Error Message'] ?? optionsData?.message ?? optionsData?.error;
      return NextResponse.json(
        { error: typeof msg === 'string' ? msg : `FMP error: HTTP ${optionsResponse.status}` },
        { status: optionsResponse.status === 403 ? 403 : 500 }
      );
    }

    // FMP returns options data - transform it
    if (!Array.isArray(optionsData) || optionsData.length === 0) {
      return NextResponse.json({
        symbol,
        underlyingPrice,
        expirationDates: [],
        calls: [],
        puts: [],
        lastUpdated: new Date().toISOString(),
        message: 'No options data available for this symbol. Options may not be available or require a premium FMP plan.'
      });
    }

    // Group by expiration date and type
    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];
    const expirationSet = new Set<string>();

    for (const option of optionsData) {
      const expiration = option.expirationDate || option.expiration;
      if (expiration) {
        expirationSet.add(expiration);
      }

      const contract: OptionContract = {
        symbol: option.symbol || `${symbol}${expiration}${option.strike}${option.type?.[0]?.toUpperCase() || 'X'}`,
        underlying: symbol,
        expiration: expiration || '',
        strike: parseFloat(option.strike) || 0,
        type: (option.type?.toLowerCase() === 'put' || option.optionType?.toLowerCase() === 'put') ? 'put' : 'call',
        lastPrice: parseFloat(option.lastPrice || option.last || option.price) || 0,
        bid: parseFloat(option.bid) || 0,
        ask: parseFloat(option.ask) || 0,
        volume: parseInt(option.volume) || 0,
        openInterest: parseInt(option.openInterest || option.oi) || 0,
        impliedVolatility: parseFloat(option.impliedVolatility || option.iv) || 0,
        delta: parseFloat(option.delta) || 0,
        gamma: parseFloat(option.gamma) || 0,
        theta: parseFloat(option.theta) || 0,
        vega: parseFloat(option.vega) || 0,
        inTheMoney: option.inTheMoney ?? (
          option.type?.toLowerCase() === 'call'
            ? underlyingPrice > (parseFloat(option.strike) || 0)
            : underlyingPrice < (parseFloat(option.strike) || 0)
        ),
        change: parseFloat(option.change) || 0,
        changePercent: parseFloat(option.changePercent || option.percentChange) || 0,
      };

      if (contract.type === 'put') {
        puts.push(contract);
      } else {
        calls.push(contract);
      }
    }

    // Sort expiration dates
    const expirationDates = Array.from(expirationSet).sort();

    // Sort contracts by expiration then strike
    const sortContracts = (contracts: OptionContract[]) => {
      return contracts.sort((a, b) => {
        if (a.expiration !== b.expiration) {
          return a.expiration.localeCompare(b.expiration);
        }
        return a.strike - b.strike;
      });
    };

    return NextResponse.json(
      {
        symbol,
        underlyingPrice,
        expirationDates,
        calls: sortContracts(calls),
        puts: sortContracts(puts),
        lastUpdated: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching options chain:', error);
    return NextResponse.json(
      { error: 'Failed to fetch options chain data' },
      { status: 500 }
    );
  }
}
