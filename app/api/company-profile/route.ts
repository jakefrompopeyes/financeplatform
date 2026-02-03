import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour - profile data rarely changes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!FMP_API_KEY || FMP_API_KEY === 'your_api_key_here') {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const cacheKey = symbol.toUpperCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    }

    const profileRes = await fetch(
      `${BASE_URL}/profile?symbol=${symbol}&apikey=${FMP_API_KEY}`
    );

    if (!profileRes.ok) {
      const status = profileRes.status;
      const errorMsg = status === 403 
        ? 'Company profile not available with current FMP plan'
        : 'Failed to fetch company profile';
      return NextResponse.json({ error: errorMsg }, { status });
    }

    const profileData = await profileRes.json();
    
    // Handle both array and object responses from FMP
    const profile = Array.isArray(profileData) 
      ? profileData[0] 
      : profileData?.data?.[0] ?? profileData;

    if (!profile) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Treat known placeholder/invalid website values as missing (abc.xyz is real only for Alphabet)
    const rawWebsite = (profile.website ?? '').trim();
    const sym = (profile.symbol ?? symbol ?? '').toUpperCase();
    const isAlphabet = ['GOOG', 'GOOGL'].includes(sym);
    const placeholderDomains = ['example.com', 'example.org', 'website.com', 'company.com', 'placeholder.com', 'example.net'];
    if (!isAlphabet) placeholderDomains.push('abc.xyz', 'www.abc.xyz');
    const websiteDomain = rawWebsite.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase();
    const website = !rawWebsite || placeholderDomains.some(d => websiteDomain === d || websiteDomain.endsWith('.' + d))
      ? null
      : rawWebsite;

    const result = {
      symbol: profile.symbol ?? symbol.toUpperCase(),
      companyName: profile.companyName ?? profile.name ?? null,
      description: profile.description ?? null,
      industry: profile.industry ?? null,
      sector: profile.sector ?? null,
      ceo: profile.ceo ?? null,
      employees: profile.fullTimeEmployees ?? profile.employees ?? null,
      headquarters: profile.city && profile.state 
        ? `${profile.city}, ${profile.state}${profile.country ? `, ${profile.country}` : ''}`
        : profile.country ?? null,
      website,
      ipoDate: profile.ipoDate ?? null,
      exchange: profile.exchangeShortName ?? profile.exchange ?? null,
      currency: profile.currency ?? 'USD',
      country: profile.country ?? null,
      phone: profile.phone ?? null,
      address: profile.address ?? null,
      city: profile.city ?? null,
      state: profile.state ?? null,
      zip: profile.zip ?? null,
      image: profile.image ?? null,
      isEtf: profile.isEtf ?? false,
      isActivelyTrading: profile.isActivelyTrading ?? true,
      isFund: profile.isFund ?? false,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (error) {
    console.error('Error fetching company profile:', error);
    return NextResponse.json({ error: 'Failed to fetch company profile' }, { status: 500 });
  }
}
