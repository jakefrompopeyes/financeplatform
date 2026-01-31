import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error:
        'CME FedWatch does not provide a free public API. This endpoint is not configured for real data.',
      note:
        'To enable real data, integrate a paid market data provider (or compute from Fed Funds futures).'
    },
    { status: 501 }
  );
}



