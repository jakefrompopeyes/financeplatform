# Crypto Fear & Greed Index Integration

## Overview

The Crypto Fear & Greed Index is a market sentiment indicator that measures investor emotions and attitudes toward the cryptocurrency market. The index ranges from 0 (Extreme Fear) to 100 (Extreme Greed) and provides valuable insights into market psychology.

The index analyzes multiple crypto market factors including:
- Volatility (25%)
- Market Momentum/Volume (25%)
- Social Media sentiment (15%)
- Surveys (15%)
- Bitcoin Dominance (10%)
- Google Trends (10%)

## Features Implemented

### 1. **API Route** (`/api/fear-greed-index`)
- Fetches real-time Fear & Greed Index data from Alternative.me's public API
- Caches data for 1 hour to reduce API calls
- Returns current value, rating, and 30-day historical data

### 2. **Dashboard Component** (`components/dashboard/FearGreedIndex.tsx`)
The component displays two cards:

#### Gauge Card
- **Visual gauge** with color-coded zones:
  - 🔴 **0-25**: Extreme Fear (Red)
  - 🟠 **25-45**: Fear (Orange)
  - 🟡 **45-55**: Neutral (Yellow)
  - 🟢 **55-75**: Greed (Light Green)
  - 🔵 **75-100**: Extreme Greed (Teal)
- Current value and rating
- Day-over-day change with percentage
- Color-coded legend

#### Historical Trend Card
- 30-day line chart showing sentiment evolution
- Reference lines marking sentiment zones
- Interactive tooltips with date and rating

### 3. **Auto-refresh**
- Data refreshes automatically every hour
- Loading states with skeleton UI
- Error handling with user-friendly messages

## API Details

**Endpoint Used:** `https://api.alternative.me/fng/?limit=30`

**No API Key Required** ✅
- This is a public API from Alternative.me
- No authentication needed
- Free to use with reasonable rate limits
- Updates daily

## Data Update Frequency

- **Alternative.me Updates**: Daily (typically updates once per day)
- **Dashboard Cache**: 1 hour
- **Component Refresh**: Automatic hourly refresh

## How to Use

1. **No Setup Required** - The feature works out of the box since it uses a public API
2. Navigate to your dashboard at `http://localhost:3000`
3. Scroll to the "Market Sentiment" section
4. View the current Fear & Greed Index with gauge visualization
5. Check the 30-day trend chart to see sentiment evolution

## Interpreting the Index

### Extreme Fear (0-25)
- Investors are very worried
- Markets may be oversold
- Potential buying opportunity (contrarian indicator)

### Fear (25-45)
- Investors are cautious
- Markets show signs of weakness
- Monitor for further decline

### Neutral (45-55)
- Balanced market sentiment
- Neither fear nor greed dominates
- Market in equilibrium

### Greed (55-75)
- Investors are optimistic
- Markets may be overheating
- Watch for reversal signals

### Extreme Greed (75-100)
- Investors are euphoric
- Markets may be overbought
- Potential selling opportunity (contrarian indicator)

## Trading Strategy Considerations

The Fear & Greed Index is often used as a **contrarian indicator**:
- When fear is high, it may indicate a buying opportunity
- When greed is high, it may signal a market top
- Best used in combination with other technical and fundamental analysis

## Technical Implementation

### Color Coding
```typescript
const getColorFromValue = (value: number) => {
  if (value <= 25) return '#EA3943'; // Extreme Fear - Red
  if (value <= 45) return '#F5A623'; // Fear - Orange
  if (value <= 55) return '#F8E71C'; // Neutral - Yellow
  if (value <= 75) return '#7ED321'; // Greed - Light Green
  return '#50E3C2'; // Extreme Greed - Teal
};
```

### Data Structure
```typescript
interface FearGreedData {
  current: {
    value: number;        // 0-100
    rating: string;       // "Extreme Fear", "Fear", etc.
    timestamp: number;    // Unix timestamp
  };
  previousClose: number;  // Previous day's value
  historical: Array<{
    date: string;         // ISO date string
    value: number;        // 0-100
    rating: string;       // Sentiment label
  }>;
}
```

## Troubleshooting

### Data Not Loading
- Check browser console for error messages
- Verify internet connection
- Alternative.me API may be temporarily unavailable
- Try refreshing the page

### Outdated Data
- Data updates hourly (cached for performance)
- Alternative.me typically updates once per day
- If you need fresher data, clear your browser cache

## Additional Resources

- [Alternative.me Crypto Fear & Greed Index](https://alternative.me/crypto/fear-and-greed-index/)
- [API Documentation](https://alternative.me/crypto/fear-and-greed-index/#api)
- [Understanding Market Sentiment Indicators](https://www.investopedia.com/terms/m/marketsentiment.asp)
- [Contrarian Investing](https://www.investopedia.com/terms/c/contrarian.asp)

## Integration with Other Dashboard Features

The Fear & Greed Index complements your other dashboard components:
- **Market Overview**: Current stock prices and performance
- **Economic Indicators**: CPI, unemployment, Fed rates
- **Crypto Prices**: Cryptocurrency market data
- **Rate Predictions**: Polymarket betting odds on Fed decisions

Together, these provide a comprehensive view of market conditions and investor sentiment.

## Next Steps

Consider adding:
- **Alerts**: Notify when index reaches extreme levels
- **Historical Comparison**: Compare current reading to historical averages
- **Component Breakdown**: Show which of the 7 indicators are driving sentiment
- **Mobile Optimization**: Responsive design for smaller screens
- **Data Export**: Download historical data as CSV

## Support

If you encounter any issues with the Fear & Greed Index integration, check:
1. Browser console for error messages
2. Network tab to verify API requests
3. Component loading states and error handling

The feature is designed to gracefully handle errors and display user-friendly messages when data is unavailable.

