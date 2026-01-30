# Stock Pages - Quick Start Guide

## What's New? 🎉

Individual stock pages are now live! Instead of viewing stocks in a modal, you now get dedicated pages with richer information and shareable URLs.

## How to Use

### View a Stock
1. **From Search Bar**: Type a stock symbol (e.g., "AAPL") and select from results
2. **From Watchlist**: Click any stock in your watchlist (right sidebar)
3. **Direct URL**: Visit `/stock/AAPL` (or any symbol) directly

### Stock Page Features

Each stock page includes:

#### 📊 Price Information
- Current price with live updates
- Change amount and percentage
- Open, High, Low, Previous Close
- 52-week high/low

#### 📈 Interactive Chart
- Multiple timeframes: 1D, 1W, 1M, 3M, 1Y
- Click any timeframe to update the chart
- Hover over chart for detailed data points

#### 🤖 AI Assistant
- Click "Ask AI About [SYMBOL]" button
- Get intelligent analysis and insights
- Ask questions about the stock

#### 📰 Latest News
- Stock-specific news articles
- Recent updates and announcements
- Click any article to read more

#### 🔗 Related Stocks
- See similar companies in the same sector
- Quick navigation to related stocks
- Compare prices and changes

#### 📊 Detailed Metrics
- **Trading Info**: Volume, Average Volume
- **Company Metrics**: Market Cap, P/E Ratio, EPS

## Examples

### Tech Stocks
- Apple: `/stock/AAPL`
- Microsoft: `/stock/MSFT`
- Google: `/stock/GOOGL`
- Tesla: `/stock/TSLA`
- NVIDIA: `/stock/NVDA`

### Finance Stocks
- JPMorgan: `/stock/JPM`
- Bank of America: `/stock/BAC`
- Goldman Sachs: `/stock/GS`

### Consumer Stocks
- Amazon: `/stock/AMZN`
- Walmart: `/stock/WMT`
- Nike: `/stock/NKE`

## Tips & Tricks

### 💡 Bookmarking
- Bookmark your favorite stocks for quick access
- URLs are permanent and shareable

### 💡 Recently Viewed
- Switch to "Recent" tab in watchlist
- See your browsing history
- Quick access to previously viewed stocks

### 💡 Navigation
- Use browser back/forward buttons
- "Back to Dashboard" button returns to home
- Related stocks section for exploring similar companies

### 💡 Sharing
- Copy URL from browser address bar
- Share with colleagues or friends
- URLs work across devices and sessions

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Focus search bar (when on dashboard)
- `Escape`: Close dropdowns and modals
- `Arrow Keys`: Navigate search results
- `Enter`: Select highlighted result

## API Configuration

### Required APIs
- **Twelve Data**: Stock prices and data ✅ (Required)

### Optional APIs
- **Alpha Vantage**: Stock-specific news 📰 (Recommended)
- **News API**: General financial news 📄 (Optional)

### Setup
Add to your `.env` file:
```env
TWELVE_DATA_API_KEY=your_key_here
ALPHA_VANTAGE_API_KEY=your_key_here
NEWS_API_KEY=your_key_here
```

## Troubleshooting

### No News Showing?
- Check if `ALPHA_VANTAGE_API_KEY` is configured
- News may not be available for all stocks
- Try popular stocks like AAPL, MSFT first

### Stock Not Found?
- Verify the symbol is correct (use search)
- Check that the stock is listed on major US exchanges
- Some international stocks may not be available

### Slow Loading?
- Initial load fetches real-time data
- Subsequent views use cached data
- Chart updates may take a moment

### Price Not Updating?
- Prices update based on market hours
- After-hours prices may be delayed
- Refresh the page for latest data

## What Changed from Modal View?

### Before (Modal)
- ❌ No shareable URLs
- ❌ Limited space for information
- ❌ No browser navigation
- ❌ No news or related stocks

### Now (Full Page)
- ✅ Shareable URLs (`/stock/AAPL`)
- ✅ More space for rich content
- ✅ Browser back/forward works
- ✅ Related stocks section
- ✅ Stock-specific news feed
- ✅ Better mobile experience
- ✅ Bookmarkable pages

## Questions?

### How do I add stocks to my watchlist?
Currently managed via localStorage. Feature enhancement coming soon for easy adding from stock pages.

### Can I compare multiple stocks?
Not yet! This is planned for a future update. You can open multiple tabs for now.

### Are prices real-time?
Prices are real-time but may have slight delays based on API provider. Free tier typically has 1-minute delay.

### What exchanges are supported?
Major US exchanges: NYSE, NASDAQ, AMEX. Support for international exchanges varies.

## Feedback

Have suggestions or found a bug? The stock pages feature is brand new and we'd love your feedback!

---

**Happy Trading! 📈**



