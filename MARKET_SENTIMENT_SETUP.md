# Market Sentiment Dashboard Setup

## Overview

The Market Sentiment section now includes comprehensive indicators to help you gauge market conditions:

1. **Crypto Fear & Greed Index** - Measures crypto market sentiment
2. **VIX (Volatility Index)** - Measures market volatility and investor fear
3. **Put/Call Ratio** - Indicates bearish vs bullish sentiment through options trading

## Features

### VIX (Volatility Index)
The VIX, often called the "fear index," measures the market's expectation of volatility over the next 30 days.

**Interpretation:**
- **< 15**: Low Volatility - Market is calm, investors are confident
- **15-25**: Normal - Typical market conditions
- **> 25**: High Volatility - Market uncertainty, investors are fearful

The VIX chart includes:
- Current VIX value with 24-hour change
- 30-day historical trend
- Reference lines at key levels (15 and 25)
- Color-coded interpretation guide

### Put/Call Ratio
The Put/Call ratio shows the volume of put options (bearish bets) vs call options (bullish bets).

**Interpretation:**
- **< 0.7**: Bullish - More calls than puts, investors expect upward movement
- **0.7-1.0**: Neutral - Balanced sentiment
- **> 1.0**: Bearish - More puts than calls, investors expect downward movement

The Put/Call chart includes:
- Current ratio with 24-hour change
- 30-day historical trend
- Reference lines at key levels (0.7 and 1.0)
- Color-coded interpretation guide

### Crypto Fear & Greed Index
Measures sentiment in the cryptocurrency market from 0-100.

**Interpretation:**
- **0-25**: Extreme Fear - Good time to buy
- **25-45**: Fear - Market is worried
- **45-55**: Neutral - Balanced sentiment
- **55-75**: Greed - Market is optimistic
- **75-100**: Extreme Greed - Correction may be coming

## API Configuration

The VIX and Put/Call data use the **Twelve Data API** (same as your stock data).

### Already Configured?
If you've already set up Twelve Data for stock market data, you're all set! No additional configuration needed.

### First Time Setup

1. **Get Your API Key** (if you don't have one):
   - Visit: https://twelvedata.com/
   - Sign up for a free account
   - Get your API key from the dashboard

2. **Add to Environment Variables**:
   Open `.env.local` and add:
   ```
   TWELVE_DATA_API_KEY=your_api_key_here
   ```

3. **Restart Your Development Server**:
   ```bash
   npm run dev
   ```

## Data Refresh

- All market sentiment indicators refresh **every hour**
- Data is cached to minimize API calls
- Real-time updates during market hours

## Demo Mode

If the API is unavailable or you haven't configured your API key:
- The dashboard will show demo data with a warning badge
- Demo data is randomly generated but realistic
- Great for testing and development

## Understanding the Indicators Together

Using all three indicators provides a comprehensive view of market sentiment:

1. **Bullish Market**:
   - Fear & Greed: 55-100 (Greed)
   - VIX: < 15 (Low volatility)
   - Put/Call: < 0.7 (More calls)

2. **Bearish Market**:
   - Fear & Greed: 0-45 (Fear)
   - VIX: > 25 (High volatility)
   - Put/Call: > 1.0 (More puts)

3. **Neutral/Uncertain Market**:
   - Fear & Greed: 45-55 (Neutral)
   - VIX: 15-25 (Normal)
   - Put/Call: 0.7-1.0 (Balanced)

## Troubleshooting

### No Data Showing
1. Check your API key in `.env.local`
2. Verify your API key is active at https://twelvedata.com/
3. Check if you've exceeded your API rate limits
4. Restart your development server

### Rate Limits
- Free tier: 800 API calls per day
- VIX and Put/Call data use ~2 API calls per hour
- Combined with other features, monitor your usage

### API Errors
- Check browser console for specific error messages
- Verify your internet connection
- Ensure API key has necessary permissions

## Additional Resources

- [Twelve Data API Documentation](https://twelvedata.com/docs)
- [VIX Explained](https://www.cboe.com/tradable_products/vix/)
- [Put/Call Ratio Guide](https://www.investopedia.com/terms/p/putcallratio.asp)
- [Fear & Greed Index](https://alternative.me/crypto/fear-and-greed-index/)

## Next Steps

Consider adding:
- Custom alerts when indicators reach extreme levels
- Historical correlation analysis
- Export data for further analysis
- Additional sentiment indicators (advance/decline ratio, etc.)

---

**Note:** Market sentiment indicators are tools to help inform your decisions, not absolute predictors. Always do your own research and consider multiple factors when making investment decisions.



