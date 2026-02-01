import { NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const BASE_URL = 'https://api.coingecko.com/api/v3';

// Map common crypto symbols to CoinGecko IDs
const CRYPTO_ID_MAP: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'ETC': 'ethereum-classic',
  'ALGO': 'algorand',
  'FIL': 'filecoin',
  'TRX': 'tron',
  'XLM': 'stellar',
  'VET': 'vechain',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolOrId = searchParams.get('symbol') || searchParams.get('id');
    
    if (!symbolOrId) {
      return NextResponse.json(
        { error: 'Symbol or ID parameter is required' },
        { status: 400 }
      );
    }

    // Determine CoinGecko ID
    const symbolUpper = symbolOrId.toUpperCase();
    let coinId = CRYPTO_ID_MAP[symbolUpper] || symbolOrId.toLowerCase();
    
    // If it's already a valid ID format (lowercase with hyphens), use it directly
    if (symbolOrId.includes('-') || symbolOrId === symbolOrId.toLowerCase()) {
      coinId = symbolOrId.toLowerCase();
    }

    const apiKeyParam = COINGECKO_API_KEY ? `&x_cg_demo_api_key=${COINGECKO_API_KEY}` : '';

    // Fetch detailed coin data (include community_data and links for extra sections)
    const coinResponse = await fetch(
      `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false${apiKeyParam ? `&${apiKeyParam.slice(1)}` : ''}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!coinResponse.ok) {
      if (coinResponse.status === 404) {
        return NextResponse.json(
          { error: `Cryptocurrency "${symbolOrId}" not found` },
          { status: 404 }
        );
      }
      throw new Error(`CoinGecko API error: ${coinResponse.status}`);
    }

    const coinData = await coinResponse.json();

    // Fetch market chart data for different time ranges
    const [chart1d, chart7d, chart30d, chart1y] = await Promise.all([
      fetch(`${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=1${apiKeyParam ? `&${apiKeyParam.slice(1)}` : ''}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=7${apiKeyParam ? `&${apiKeyParam.slice(1)}` : ''}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=30${apiKeyParam ? `&${apiKeyParam.slice(1)}` : ''}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=365${apiKeyParam ? `&${apiKeyParam.slice(1)}` : ''}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    const marketData = coinData.market_data;

    // Format historical data
    const formatHistorical = (chartData: any) => {
      if (!chartData || !chartData.prices) return [];
      return chartData.prices.map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toISOString(),
        price: price,
      }));
    };

    const links = coinData.links || {};
    const communityData = coinData.community_data || {};

    const result = {
      id: coinData.id,
      symbol: coinData.symbol.toUpperCase(),
      name: coinData.name,
      image: coinData.image?.large || coinData.image?.small || '',
      description: coinData.description?.en || '',
      currentPrice: marketData.current_price?.usd || 0,
      priceChange24h: marketData.price_change_24h || 0,
      priceChangePercentage24h: marketData.price_change_percentage_24h || 0,
      marketCap: marketData.market_cap?.usd || 0,
      fullyDilutedValuation: marketData.fully_diluted_valuation?.usd || null,
      totalVolume: marketData.total_volume?.usd || 0,
      high24h: marketData.high_24h?.usd || null,
      low24h: marketData.low_24h?.usd || null,
      priceChangePercentage7d: marketData.price_change_percentage_7d || null,
      priceChangePercentage30d: marketData.price_change_percentage_30d || null,
      priceChangePercentage1y: marketData.price_change_percentage_1y || null,
      circulatingSupply: marketData.circulating_supply || null,
      totalSupply: marketData.total_supply || null,
      maxSupply: marketData.max_supply || null,
      ath: marketData.ath?.usd || null,
      athDate: marketData.ath_date?.usd || null,
      athChangePercentage: marketData.ath_change_percentage?.usd || null,
      atl: marketData.atl?.usd || null,
      atlDate: marketData.atl_date?.usd || null,
      atlChangePercentage: marketData.atl_change_percentage?.usd || null,
      historical1d: formatHistorical(chart1d),
      historical7d: formatHistorical(chart7d),
      historical30d: formatHistorical(chart30d),
      historical1y: formatHistorical(chart1y),
      timestamp: Date.now(),
      marketCapRank: coinData.market_cap_rank ?? marketData.market_cap_rank ?? null,
      links: {
        homepage: (links.homepage && links.homepage.filter(Boolean)) || [],
        blockchainSite: (links.blockchain_site && links.blockchain_site.filter(Boolean)) || [],
        subredditUrl: links.subreddit_url || null,
        twitterScreenName: links.twitter_screen_name || null,
        reposUrl: links.repos_url?.github?.filter(Boolean) || [],
      },
      communityData: {
        twitterFollowers: communityData.twitter_followers ?? null,
        redditSubscribers: communityData.reddit_subscribers ?? null,
        redditAccountsActive48h: communityData.reddit_accounts_active_48h ?? null,
      },
      genesisDate: coinData.genesis_date || null,
      categories: coinData.categories || [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching crypto details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch crypto details' },
      { status: 500 }
    );
  }
}
