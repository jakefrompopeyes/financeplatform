# Individual Stock Pages - Feature Documentation

## Overview
This update introduces dedicated individual stock pages with shareable URLs, enhanced navigation, and additional contextual information including related stocks and stock-specific news.

## New Features

### 1. Dynamic Stock Pages (`/stock/[symbol]`)
Individual stock pages are now accessible via URLs like `/stock/AAPL`, `/stock/TSLA`, etc.

**Key Features:**
- Full-page layout with enhanced visual design
- Real-time stock price and historical charts
- Multiple timeframe selection (1D, 1W, 1M, 3M, 1Y)
- Comprehensive stock metrics and statistics
- Shareable URLs for easy bookmarking and sharing
- Browser back/forward navigation support
- AI assistant integration for stock analysis

**Location:** `app/stock/[symbol]/page.tsx`

### 2. Stock-Specific News Feed
Displays recent news articles specifically related to the selected stock.

**Features:**
- Fetches news articles filtered by stock symbol
- Shows article thumbnails, titles, and descriptions
- Links to full articles on source websites
- Time-ago formatting for article timestamps
- Powered by Alpha Vantage NEWS_SENTIMENT API

**Location:** `components/dashboard/StockNews.tsx`

### 3. Related Stocks Section
Shows related stocks from the same sector or industry.

**Features:**
- Displays 4 related stocks with real-time prices
- Smart sector-based stock grouping
- Shows price change indicators
- Click to navigate to related stock pages
- Covers major sectors: Technology, Finance, Healthcare, Consumer, Energy

**Location:** `components/dashboard/RelatedStocks.tsx`

### 4. Enhanced Navigation

#### Stock Search
- Now navigates directly to stock pages instead of opening modal
- Maintains backward compatibility with optional callback
- Uses Next.js router for seamless navigation
- Updated to support new URL structure

**Location:** `components/dashboard/StockSearch.tsx`

#### Watchlist
- Click on any stock in watchlist to navigate to its page
- Uses Next.js router for navigation
- Maintains recently viewed tracking
- Shows real-time prices and changes

**Location:** `components/dashboard/Watchlist.tsx`

### 5. Updated Financial News API
Enhanced to support stock symbol filtering.

**New Parameters:**
- `symbol` - Filter news by stock ticker (e.g., `?symbol=AAPL`)
- Supports all existing parameters (`category`, `limit`)

**Example Usage:**
```javascript
// General financial news
fetch('/api/financial-news')

// Stock-specific news
fetch('/api/financial-news?symbol=AAPL')
```

**Location:** `app/api/financial-news/route.ts`

## URL Structure

### Stock Pages
- Format: `/stock/[SYMBOL]`
- Examples:
  - `/stock/AAPL` - Apple Inc.
  - `/stock/MSFT` - Microsoft
  - `/stock/GOOGL` - Alphabet Inc.
  - `/stock/TSLA` - Tesla

### Benefits
1. **SEO Friendly** - Each stock has its own indexable page
2. **Shareable** - Easy to share specific stock pages
3. **Bookmarkable** - Users can bookmark their favorite stocks
4. **Navigation** - Browser back/forward works naturally

## User Flow

### From Dashboard
1. User types stock symbol in search bar
2. Selects stock from dropdown results
3. **Automatically navigated** to `/stock/[SYMBOL]` page

### From Watchlist
1. User clicks on any stock in the watchlist
2. **Automatically navigated** to `/stock/[SYMBOL]` page

### From Related Stocks
1. User views a stock page
2. Sees related stocks section
3. Clicks on a related stock
4. **Navigates** to that stock's page

### Back to Dashboard
- Click "Back to Dashboard" button on any stock page
- Returns to main dashboard at `/`

## Recently Viewed Tracking

Stock pages automatically track recently viewed stocks:
- Stores last 10 viewed stocks in localStorage
- Includes timestamp of when stock was viewed
- Accessible via Watchlist component (Recent tab)
- Persists across browser sessions

## Technical Details

### Technologies Used
- **Next.js 14** - App Router with dynamic routes
- **React 18** - Client-side components
- **Recharts** - Interactive price charts
- **Twelve Data API** - Real-time stock data
- **Alpha Vantage API** - Stock-specific news
- **Tailwind CSS** - Modern styling

### Performance Optimizations
- API responses cached for 5 minutes
- Client-side navigation (no full page reloads)
- Optimized chart rendering
- Lazy loading of news images
- Efficient state management

### Data Sources

#### Stock Data
- **Provider:** Twelve Data API
- **Endpoints:** `/api/stock-details`, `/api/stock-search`
- **Update Frequency:** Real-time with 1-minute polling in watchlist

#### News Data
- **Provider:** Alpha Vantage API
- **Endpoint:** `/api/financial-news?symbol=[SYMBOL]`
- **Update Frequency:** Cached for 5 minutes

### Error Handling
- Graceful fallbacks for API failures
- User-friendly error messages
- Demo data for missing API keys
- Network error recovery

## File Structure

```
app/
├── stock/
│   └── [symbol]/
│       └── page.tsx          # Dynamic stock page route
├── api/
│   └── financial-news/
│       └── route.ts          # Updated with symbol filtering
└── page.tsx                  # Main dashboard (updated)

components/
└── dashboard/
    ├── StockNews.tsx         # New: Stock-specific news
    ├── RelatedStocks.tsx     # New: Related stocks section
    ├── StockSearch.tsx       # Updated: Navigation support
    ├── Watchlist.tsx         # Updated: Navigation support
    └── StockDetailModal.tsx  # Kept for backward compatibility
```

## Migration Notes

### Breaking Changes
None! The implementation maintains backward compatibility.

### Deprecated Features
- `StockDetailModal` is still available but no longer used by default
- Modal-based navigation can be restored by using the optional callbacks

### Configuration Required

#### Alpha Vantage API Key (Optional)
For stock-specific news, add to `.env`:
```env
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

If not configured, no news will be shown for individual stocks (general news still works).

## Future Enhancements

Potential improvements for future versions:

1. **Technical Indicators**
   - RSI, MACD, Bollinger Bands
   - Support for `/api/technical-indicators` endpoint

2. **Company Information**
   - Detailed company profile
   - Executive team information
   - Company description and sector details

3. **Analyst Ratings**
   - Buy/Sell/Hold recommendations
   - Price targets
   - Analyst consensus

4. **Options Data**
   - Options chain
   - Put/Call ratio
   - Implied volatility

5. **Social Sentiment**
   - Twitter/Reddit sentiment analysis
   - Trending discussions
   - Community insights

6. **Comparison Tool**
   - Side-by-side stock comparison
   - Relative performance charts
   - Metric comparisons

7. **Alerts & Notifications**
   - Price alerts
   - News alerts
   - Earnings announcements

8. **Portfolio Tracking**
   - Add to virtual portfolio
   - Track performance
   - P&L calculations

## Testing

### Manual Testing Checklist
- [ ] Navigate to stock page via search
- [ ] Navigate to stock page via watchlist
- [ ] View related stocks and click through
- [ ] Check news feed loads correctly
- [ ] Verify chart updates with time range changes
- [ ] Test browser back/forward navigation
- [ ] Verify recently viewed tracking
- [ ] Check responsive design on mobile
- [ ] Test with/without API keys configured
- [ ] Verify error handling for invalid symbols

### Test URLs
- http://localhost:3000/stock/AAPL
- http://localhost:3000/stock/MSFT
- http://localhost:3000/stock/GOOGL
- http://localhost:3000/stock/INVALID (error case)

## Support

For issues or questions about the stock pages feature:
1. Check that all required API keys are configured
2. Verify network connectivity to API endpoints
3. Check browser console for error messages
4. Review API rate limits (Twelve Data: 8 requests/min free tier)

## License
Part of the Stonkscan project (stonkscan.com).



