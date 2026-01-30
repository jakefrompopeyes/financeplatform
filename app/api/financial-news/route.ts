import { NextResponse } from 'next/server';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
  };
  category?: string;
}

// Fallback demo news for when API is not configured or has issues
const DEMO_NEWS: NewsArticle[] = [
  {
    title: "S&P 500 Reaches New Heights Amid Tech Rally",
    description: "Major technology stocks led the market higher today as investors showed renewed confidence in growth stocks.",
    url: "https://www.marketwatch.com",
    urlToImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
    publishedAt: new Date().toISOString(),
    source: { name: "MarketWatch" },
    category: "markets"
  },
  {
    title: "Federal Reserve Signals Continued Monetary Policy Support",
    description: "Fed officials indicated they will maintain current interest rate levels to support economic recovery.",
    url: "https://www.cnbc.com",
    urlToImage: "https://images.unsplash.com/photo-1633158829875-e5316a358c6f?w=400",
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    source: { name: "CNBC" },
    category: "economy"
  },
  {
    title: "Tesla Announces Expansion Plans for New Manufacturing Facility",
    description: "Electric vehicle maker Tesla revealed plans to build a new manufacturing plant, expanding production capacity.",
    url: "https://www.reuters.com",
    urlToImage: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400",
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    source: { name: "Reuters" },
    category: "technology"
  },
  {
    title: "Oil Prices Surge on Supply Concerns",
    description: "Crude oil prices jumped as geopolitical tensions raised concerns about potential supply disruptions.",
    url: "https://www.bloomberg.com",
    urlToImage: "https://images.unsplash.com/photo-1564419434461-9c2069c93440?w=400",
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    source: { name: "Bloomberg" },
    category: "commodities"
  },
  {
    title: "Major Banks Report Strong Quarterly Earnings",
    description: "Leading financial institutions exceeded analyst expectations with robust quarterly results driven by trading revenues.",
    url: "https://www.wsj.com",
    urlToImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
    source: { name: "Wall Street Journal" },
    category: "earnings"
  }
];

async function fetchNewsAPI() {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    console.log('NEWS_API_KEY not configured, using demo data');
    return DEMO_NEWS;
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?category=business&country=us&pageSize=20&apiKey=${apiKey}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!response.ok) {
      console.error('NewsAPI error:', response.status);
      return DEMO_NEWS;
    }

    const data = await response.json();
    
    if (data.status !== 'ok' || !data.articles) {
      console.error('NewsAPI returned error:', data);
      return DEMO_NEWS;
    }

    return data.articles.map((article: any) => ({
      title: article.title,
      description: article.description || article.content?.substring(0, 200) + '...',
      url: article.url,
      urlToImage: article.urlToImage || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
      publishedAt: article.publishedAt,
      source: { name: article.source.name },
      category: 'business'
    }));
  } catch (error) {
    console.error('Error fetching from NewsAPI:', error);
    return DEMO_NEWS;
  }
}

async function fetchAlphaVantageNews(symbol?: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.FMP_API_KEY;
  
  if (!apiKey) {
    return [];
  }

  try {
    let url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&limit=20&apikey=${apiKey}`;
    if (symbol) {
      url += `&tickers=${symbol}`;
    }
    
    const response = await fetch(url, { next: { revalidate: 300 } });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (!data.feed) {
      return [];
    }

    return data.feed.map((article: any) => ({
      title: article.title,
      description: article.summary?.substring(0, 200) + '...',
      url: article.url,
      urlToImage: article.banner_image || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
      publishedAt: article.time_published,
      source: { name: article.source },
      category: article.category_within_source
    }));
  } catch (error) {
    console.error('Error fetching from Alpha Vantage:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  const limit = parseInt(searchParams.get('limit') || '10');
  const symbol = searchParams.get('symbol'); // Support filtering by stock symbol

  try {
    let allArticles: NewsArticle[] = [];
    
    if (symbol) {
      // If a symbol is specified, only fetch from Alpha Vantage (supports ticker filtering)
      const alphaVantageArticles = await fetchAlphaVantageNews(symbol);
      allArticles = alphaVantageArticles;
      
      // If no results from Alpha Vantage, return empty array (no generic news for specific stocks)
      if (allArticles.length === 0) {
        return NextResponse.json({
          articles: [],
          totalResults: 0,
          lastUpdated: new Date().toISOString(),
          note: `No news found for ${symbol}`
        });
      }
    } else {
      // Try multiple sources and combine results
      const [newsApiArticles, alphaVantageArticles] = await Promise.all([
        fetchNewsAPI(),
        fetchAlphaVantageNews()
      ]);

      allArticles = [...newsApiArticles, ...alphaVantageArticles];
    }

    // Remove duplicates based on title
    allArticles = allArticles.filter((article, index, self) =>
      index === self.findIndex(a => a.title === article.title)
    );

    // Filter by category if specified
    if (category !== 'all') {
      allArticles = allArticles.filter(article => 
        article.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Sort by date (newest first)
    allArticles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    // Limit results
    allArticles = allArticles.slice(0, limit);

    return NextResponse.json({
      articles: allArticles,
      totalResults: allArticles.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in news API:', error);
    return NextResponse.json({
      articles: symbol ? [] : DEMO_NEWS.slice(0, limit),
      totalResults: symbol ? 0 : DEMO_NEWS.length,
      lastUpdated: new Date().toISOString(),
      note: symbol ? `No news found for ${symbol}` : 'Using demo data'
    });
  }
}

