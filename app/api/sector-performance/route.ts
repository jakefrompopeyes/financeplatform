import { NextRequest, NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'pe-comparison'; // 'pe-comparison' or 'historical-pe'
  const symbol = searchParams.get('symbol'); // For stock-specific comparison
  const sector = searchParams.get('sector'); // For direct sector lookup

  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'FMP API key not configured' }, { status: 500 });
  }

  try {
    // If symbol provided, first get the company profile to find its sector
    let stockSector = sector;
    let stockIndustry: string | null = null;
    let stockPE: number | null = null;
    let companyName: string | null = null;

    if (symbol && !sector) {
      // Try multiple endpoints to get company profile/sector information
      const profileEndpoints = [
        `${FMP_BASE}/profile?symbol=${symbol}&apikey=${FMP_API_KEY}`,
        `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_API_KEY}`,
        `${FMP_BASE}/quote?symbol=${symbol}&apikey=${FMP_API_KEY}`,
      ];
      
      for (const endpoint of profileEndpoints) {
        try {
          const profileResponse = await fetch(endpoint);
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log(`Profile endpoint succeeded: ${endpoint.split('apikey')[0]}`);
            const profile = Array.isArray(profileData) ? profileData[0] : profileData;
            
            if (profile && profile.sector) {
              stockSector = profile.sector;
              stockIndustry = profile.industry || null;
              companyName = profile.companyName || profile.name || null;
              // Try to get P/E from profile if available
              if (profile.pe || profile.peRatio) {
                stockPE = parseFloat(profile.pe || profile.peRatio) || null;
              }
              console.log(`Extracted - sector: ${stockSector}, industry: ${stockIndustry}, PE: ${stockPE}`);
              break;
            }
          }
        } catch (e) {
          console.log(`Profile endpoint failed: ${endpoint.split('apikey')[0]}`);
        }
      }
    }

    if (!stockSector) {
      console.error(`Could not determine sector for ${symbol} - returning partial data`);
      // Return partial response with just the symbol instead of an error
      return NextResponse.json({
        symbol,
        companyName: null,
        sector: null,
        industry: null,
        stockPE: null,
        sectorPE: null,
        premium: null,
        premiumPercent: null,
        isAboveAverage: null,
        allSectors: [],
        type: 'pe-comparison',
        message: 'Could not determine sector for this stock',
        timestamp: Date.now(),
      });
    }

    if (type === 'historical-pe') {
      // Fetch historical P/E for the sector
      const response = await fetch(
        `${FMP_BASE}/historical-sector-pe?sector=${encodeURIComponent(stockSector)}&apikey=${FMP_API_KEY}`
      );

      if (!response.ok) {
        console.error(`Historical sector PE API error: ${response.status} for sector ${stockSector}`);
        return NextResponse.json(
          { error: 'Failed to fetch historical sector P/E data' },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      // Transform and sort by date
      const historicalData = Array.isArray(data) 
        ? data.map((item: any) => ({
            date: item.date,
            sector: item.sector || stockSector,
            pe: item.pe ?? item.averagePE ?? item.peRatio ?? null,
            exchange: item.exchange || null,
          })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];

      return NextResponse.json({
        symbol,
        sector: stockSector,
        industry: stockIndustry,
        companyName,
        stockPE,
        type: 'historical-pe',
        data: historicalData.slice(0, 365), // Last year of data
        timestamp: Date.now(),
      });
    } else {
      // Default: Fetch current sector P/E snapshot for comparison
      // Try multiple endpoint variations
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      
      let data: any[] = [];
      let response: Response | null = null;
      
      // Try multiple endpoint variations (different API versions and parameter combinations)
      const endpoints = [
        // v3 API (often more widely available)
        `https://financialmodelingprep.com/api/v3/sector_price_earning_ratio?date=${dateStr}&apikey=${FMP_API_KEY}`,
        `https://financialmodelingprep.com/api/v3/sector_price_earning_ratio?apikey=${FMP_API_KEY}`,
        // v4 API
        `https://financialmodelingprep.com/api/v4/sector_price_earning_ratio?date=${dateStr}&exchange=NYSE&apikey=${FMP_API_KEY}`,
        `https://financialmodelingprep.com/api/v4/sector_price_earning_ratio?apikey=${FMP_API_KEY}`,
        // stable API variations
        `${FMP_BASE}/sector-pe-snapshot?exchange=NYSE&apikey=${FMP_API_KEY}`,
        `${FMP_BASE}/sector-pe-snapshot?apikey=${FMP_API_KEY}`,
      ];

      for (const endpoint of endpoints) {
        try {
          response = await fetch(endpoint);
          if (response.ok) {
            const rawData = await response.json();
            data = Array.isArray(rawData) ? rawData : [rawData];
            if (data.length > 0) {
              console.log(`Sector PE snapshot succeeded with endpoint: ${endpoint.split('apikey')[0]}`);
              break;
            }
          } else {
            console.log(`Sector PE endpoint failed (${response.status}): ${endpoint.split('apikey')[0]}`);
          }
        } catch (e) {
          console.log(`Sector PE endpoint error: ${endpoint.split('apikey')[0]}`);
        }
      }
      
      if (data.length === 0) {
        console.error(`All sector PE endpoints failed, returning partial data with sector info only`);
      }

      const dataArray = data;

      // Find the matching sector's P/E
      let sectorPE: number | null = null;
      let sectorData = null;
      
      for (const item of dataArray) {
        if (item.sector && item.sector.toLowerCase() === stockSector.toLowerCase()) {
          sectorPE = item.pe ?? item.averagePE ?? item.peRatio ?? null;
          sectorData = item;
          break;
        }
      }

      // Calculate comparison metrics
      let premium: number | null = null;
      let premiumPercent: number | null = null;
      let isAboveAverage: boolean | null = null;

      if (stockPE !== null && sectorPE !== null && sectorPE > 0) {
        premium = stockPE - sectorPE;
        premiumPercent = ((stockPE - sectorPE) / sectorPE) * 100;
        isAboveAverage = stockPE > sectorPE;
      }

      // Get all sectors for context
      const allSectors = dataArray
        .filter((item: any) => item.sector && item.pe)
        .map((item: any) => ({
          sector: item.sector,
          pe: item.pe ?? item.averagePE ?? item.peRatio,
          date: item.date || null,
        }))
        .sort((a: any, b: any) => (b.pe || 0) - (a.pe || 0));

      return NextResponse.json({
        symbol,
        companyName,
        sector: stockSector,
        industry: stockIndustry,
        stockPE,
        sectorPE,
        sectorData,
        premium,
        premiumPercent,
        isAboveAverage,
        allSectors,
        type: 'pe-comparison',
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error('Error fetching sector performance:', error);
    return NextResponse.json({ error: 'Failed to fetch sector performance' }, { status: 500 });
  }
}
