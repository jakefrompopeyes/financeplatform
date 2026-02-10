import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_V3 = 'https://financialmodelingprep.com/api/v3';
const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const FMP_LOGO_BASE = 'https://financialmodelingprep.com/image-stock';

export type LeaderboardAsset = {
  rank: number;
  id: string;
  symbol: string;
  name: string;
  image: string;
  type: 'crypto' | 'stock';
  currentPrice: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
};

function normalizeCryptoImage(coin: { image?: string | { small?: string; large?: string } }): string {
  const img = coin.image;
  return typeof img === 'string' ? img : (img?.small || img?.large || '');
}

function toNum(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  const combined: LeaderboardAsset[] = [];

  try {
    // ─── 1. Top stocks/ETFs by market cap (FMP) ───
    // Includes Apple, Nvidia, GLD (gold), SLV (silver), etc.
    if (FMP_API_KEY && FMP_API_KEY !== 'your_api_key_here') {
      // 15B+ gets mega-cap stocks (AAPL, NVDA, etc.) and GLD/SLV (gold/silver ETFs)
      const screenerUrl = `${FMP_V3}/stock-screener?marketCapMoreThan=15000000000&limit=80&country=US&isActivelyTrading=true&apikey=${FMP_API_KEY}`;
      const screenerRes = await fetch(screenerUrl, { cache: 'no-store' });
      let screenerData: any[] = [];

      if (screenerRes.ok) {
        const raw = await screenerRes.json();
        screenerData = Array.isArray(raw) ? raw : [];
      }

      // If we got few results, try lower market cap threshold
      if (screenerData.length < 20) {
        const fallbackUrl = `${FMP_V3}/stock-screener?marketCapMoreThan=5000000000&limit=80&country=US&isActivelyTrading=true&apikey=${FMP_API_KEY}`;
        const fallbackRes = await fetch(fallbackUrl, { cache: 'no-store' });
        if (fallbackRes.ok) {
          const raw = await fallbackRes.json();
          screenerData = Array.isArray(raw) ? raw : [];
        }
      }

      // Sort by market cap desc and take top 40
      const byMcap = [...screenerData].sort((a, b) => (toNum(b.marketCap) || 0) - (toNum(a.marketCap) || 0)).slice(0, 40);
      const symbols = byMcap.map((s: any) => s.symbol).filter(Boolean);
      if (symbols.length > 0) {
        const symbolStr = symbols.join(',');
        const quoteUrl = `${FMP_STABLE}/batch-quote?symbols=${symbolStr}&apikey=${FMP_API_KEY}`;
        const quoteRes = await fetch(quoteUrl, { cache: 'no-store' });
        let quotes: Record<string, any> = {};
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          const arr = Array.isArray(quoteData) ? quoteData : quoteData?.data ?? quoteData?.quotes ?? [];
          arr.forEach((q: any) => {
            if (q?.symbol) quotes[(q.symbol as string).toUpperCase()] = q;
          });
        }

        for (const s of byMcap) {
          const sym = (s.symbol || '').toUpperCase();
          const q = quotes[sym];
          const marketCap = toNum(s.marketCap ?? q?.marketCap);
          const price = toNum(q?.price ?? q?.last ?? q?.close ?? s.price);
          const changePct = toNum(q?.changesPercentage ?? q?.changes ?? 0);
          const volume = toNum(q?.volume ?? s.volume);
          combined.push({
            rank: 0,
            id: sym,
            symbol: sym,
            name: (q?.name ?? q?.shortName ?? s.companyName ?? sym) || sym,
            image: `${FMP_LOGO_BASE}/${sym}.png`,
            type: 'stock',
            currentPrice: price,
            priceChangePercentage24h: changePct,
            marketCap,
            volume24h: volume,
          });
        }
      }
    }

    // ─── 2. Top 50 crypto by market cap (CoinGecko) ───
    const cgParam = COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : '';
    const cgUrl = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h${cgParam}`;
    const cgRes = await fetch(cgUrl, { headers: { Accept: 'application/json' }, cache: 'no-store' });

    if (cgRes.ok) {
      const cgData = await cgRes.json();
      for (const coin of cgData) {
        combined.push({
          rank: 0,
          id: coin.id,
          symbol: (coin.symbol || '').toUpperCase(),
          name: coin.name || '',
          image: normalizeCryptoImage(coin),
          type: 'crypto',
          currentPrice: toNum(coin.current_price),
          priceChangePercentage24h: toNum(coin.price_change_percentage_24h),
          marketCap: toNum(coin.market_cap),
          volume24h: toNum(coin.total_volume),
        });
      }
    }

    // ─── 3. Sort by market cap desc and take top 50, assign rank ───
    const sorted = combined
      .filter((a) => a.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 50)
      .map((a, i) => ({ ...a, rank: i + 1 }));

    return NextResponse.json(sorted, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
