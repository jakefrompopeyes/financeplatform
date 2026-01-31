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

async function fetchNewsAPI() {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEWS_API_KEY not configured');
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?category=business&country=us&pageSize=20&apiKey=${apiKey}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`NewsAPI error: HTTP ${response.status} ${text}`.trim());
    }

    const data = await response.json();
    
    if (data.status !== 'ok' || !data.articles) {
      throw new Error('NewsAPI returned an unexpected response');
    }

    return data.articles.map((article: any) => ({
      title: article.title,
      description: article.description || article.content?.substring(0, 200) + '...',
      url: article.url,
      urlToImage: article.urlToImage || '',
      publishedAt: article.publishedAt,
      source: { name: article.source.name },
      category: 'business'
    }));
  } catch (error) {
    console.error('Error fetching from NewsAPI:', error);
    throw error;
  }
}

async function fetchAlphaVantageNews(symbol?: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
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
      urlToImage: article.banner_image || '',
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

