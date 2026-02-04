import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export interface ProductSegment {
  segment: string;
  revenue: number;
}

export interface GeoSegment {
  region: string;
  revenue: number;
}

export interface YearData {
  year: number;
  date: string;
  productSegments: ProductSegment[];
  geoSegments: GeoSegment[];
}

export interface RevenueSegmentationResponse {
  symbol: string;
  years: YearData[];
  error?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '5', 10), 1), 10);

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const cacheKey = `rev-seg-${symbol.toUpperCase()}-${limit}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    }

    // Fetch both product and geographic segmentation in parallel
    const [productRes, geoRes] = await Promise.all([
      fetch(`${BASE_URL}/revenue-product-segmentation?symbol=${encodeURIComponent(symbol.toUpperCase())}&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/revenue-geographic-segmentation?symbol=${encodeURIComponent(symbol.toUpperCase())}&apikey=${FMP_API_KEY}`),
    ]);

    let productData: Record<string, unknown>[] = [];
    let geoData: Record<string, unknown>[] = [];

    if (productRes.ok) {
      const json = await productRes.json();
      productData = Array.isArray(json) ? json : [];
    }

    if (geoRes.ok) {
      const json = await geoRes.json();
      geoData = Array.isArray(json) ? json : [];
    }

    /** Parse year from API item: prefer calendarYear/year field, else YYYY from date string (ISO) to avoid timezone bugs. */
    function parseYear(item: Record<string, unknown>): number | null {
      const cal = item.calendarYear ?? item.year ?? item.fiscalYear;
      if (typeof cal === 'number' && cal >= 1990 && cal <= 2030) return cal;
      const date = item.date as string | undefined;
      if (!date || typeof date !== 'string') return null;
      // ISO date YYYY-MM-DD: use first 4 chars to avoid timezone/locale issues with new Date()
      const isoMatch = date.match(/^(\d{4})-\d{2}-\d{2}/);
      if (isoMatch) return parseInt(isoMatch[1], 10);
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) return d.getFullYear();
      return null;
    }

    // Group product data by year
    const productByYear = new Map<number, { date: string; segments: ProductSegment[] }>();
    
    for (const item of productData) {
      const year = parseYear(item);
      if (year == null) continue;
      
      const date = (item.date as string) || `${year}-12-31`;
      
      if (!productByYear.has(year)) {
        productByYear.set(year, { date, segments: [] });
      }
      
      const yearData = productByYear.get(year)!;
      
      for (const [key, value] of Object.entries(item)) {
        if (key !== 'date' && key !== 'symbol' && key !== 'calendarYear' && key !== 'year' && key !== 'fiscalYear' && typeof value === 'object' && value !== null) {
          for (const [segmentName, revenue] of Object.entries(value as Record<string, unknown>)) {
            if (typeof revenue === 'number' && revenue > 0) {
              const existing = yearData.segments.find(s => s.segment === segmentName);
              if (existing) {
                existing.revenue += revenue;
              } else {
                yearData.segments.push({ segment: segmentName, revenue });
              }
            }
          }
        }
      }
    }

    // Group geo data by year
    const geoByYear = new Map<number, { date: string; segments: GeoSegment[] }>();
    
    for (const item of geoData) {
      const year = parseYear(item);
      if (year == null) continue;
      
      const date = (item.date as string) || `${year}-12-31`;
      
      if (!geoByYear.has(year)) {
        geoByYear.set(year, { date, segments: [] });
      }
      
      const yearData = geoByYear.get(year)!;
      
      for (const [key, value] of Object.entries(item)) {
        if (key !== 'date' && key !== 'symbol' && key !== 'calendarYear' && key !== 'year' && key !== 'fiscalYear' && typeof value === 'object' && value !== null) {
          for (const [regionName, revenue] of Object.entries(value as Record<string, unknown>)) {
            if (typeof revenue === 'number' && revenue > 0) {
              const existing = yearData.segments.find(s => s.region === regionName);
              if (existing) {
                existing.revenue += revenue;
              } else {
                yearData.segments.push({ region: regionName, revenue });
              }
            }
          }
        }
      }
    }

    // Get all unique years and sort descending
    const allYears = new Set([...productByYear.keys(), ...geoByYear.keys()]);
    const sortedYears = Array.from(allYears).sort((a, b) => b - a).slice(0, limit);

    // Build result
    const years: YearData[] = sortedYears.map(year => {
      const productYearData = productByYear.get(year);
      const geoYearData = geoByYear.get(year);
      
      const productSegments = productYearData?.segments || [];
      const geoSegments = geoYearData?.segments || [];
      
      // Sort by revenue descending
      productSegments.sort((a, b) => b.revenue - a.revenue);
      geoSegments.sort((a, b) => b.revenue - a.revenue);
      
      return {
        year,
        date: productYearData?.date || geoYearData?.date || `${year}-12-31`,
        productSegments,
        geoSegments,
      };
    });

    const result: RevenueSegmentationResponse = {
      symbol: symbol.toUpperCase(),
      years,
    };

    // Only cache if we have data
    if (years.length > 0) {
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (error) {
    console.error('Revenue segmentation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch revenue segmentation' },
      { status: 500 }
    );
  }
}
