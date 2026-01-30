# CME FedWatch Tool Integration

## Overview

This dashboard now displays Fed rate probabilities based on the **CME FedWatch Tool**, which calculates implied probabilities from 30-Day Fed Funds futures contracts traded on CME Group.

## What is CME FedWatch?

The [CME FedWatch Tool](https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html) is the industry-standard tool used by traders, economists, and financial professionals to gauge market expectations for Federal Reserve interest rate decisions.

### How It Works

- **Data Source**: 30-Day Fed Funds futures prices
- **Calculation**: Market-implied probabilities based on futures pricing
- **Updates**: Real-time during market hours
- **Reliability**: Widely trusted by Wall Street and financial institutions

## Current Display

The dashboard shows probabilities for the **December 2025 FOMC meeting** with four possible outcomes:

### Example Output (Demo Data)

| Target Rate | Description | Probability |
|-------------|-------------|-------------|
| 4.25% - 4.50% | 25 bps cut | **64.5%** 🟢 |
| 4.50% - 4.75% | No change | 32.8% 🟡 |
| 4.00% - 4.25% | 50 bps cut | 2.2% 🟢 |
| 4.75% - 5.00% | 25 bps hike | 0.5% 🔴 |

### Color Coding

- 🟢 **Green** - Rate cuts/decreases
- 🟡 **Amber** - No change/pause
- 🔴 **Red** - Rate hikes/increases

## Important Limitation: No Free Public API

⚠️ **CME Group does not provide a free public API for FedWatch data.**

### Current Implementation

The dashboard currently displays **demo data** that represents typical market expectations. This is because:

1. CME FedWatch data requires professional market data subscriptions
2. Real-time futures data is not freely available
3. Scraping the CME website would violate their Terms of Service

## Options for Real Data

To get **live CME FedWatch data**, you have several options:

### Option 1: Professional Data Services (Recommended)

Subscribe to a market data provider that includes CME futures data:

- **Bloomberg Terminal** ($2,000+/month)
  - Full access to CME data
  - Industry standard for financial professionals
  
- **Refinitiv Eikon** ($1,000+/month)
  - Comprehensive market data
  - Includes Fed Funds futures pricing

- **FactSet** ($1,000+/month)
  - Professional financial data
  - Includes interest rate futures

### Option 2: Financial Data APIs

Use a financial data API service:

- **Polygon.io** ($199+/month)
  - Futures data available on higher tiers
  - REST and WebSocket APIs
  - Good for developers

- **Quandl/Nasdaq Data Link** ($50+/month)
  - Some CME futures data available
  - Programmatic access

- **Alpha Vantage** (Free tier available)
  - Limited futures data
  - May not include Fed Funds futures

- **Intrinio** ($99+/month)
  - Financial data APIs
  - Options for futures data

### Option 3: Manual Calculation

You could:
1. Subscribe to Fed Funds futures prices from a data provider
2. Implement the probability calculation algorithm yourself
3. Update the API route with real pricing data

The calculation formula is:
```
Probability = 100 × (100 - futures_price) / target_rate_change
```

### Option 4: Alternative Free Sources

Some alternatives (though not as authoritative as CME):

- **Polymarket** - Prediction markets (we previously used this)
- **Kalshi** - CFTC-regulated prediction exchange
- **Federal Reserve's own projections** - Published quarterly
- **Market surveys** - Bloomberg, Reuters surveys

## Integration Code Structure

### API Route
`app/api/cme-fedwatch/route.ts` - Returns demo data with structure for real data

### Component
`components/dashboard/RatePredictions.tsx` - Displays probability bars and meeting info

### Data Format

```typescript
{
  meeting: {
    date: "2025-12-17",
    type: "FOMC Meeting"
  },
  currentTarget: "4.50% - 4.75%",
  outcomes: [
    {
      target: "4.25% - 4.50%",
      probability: 64.5,
      description: "25 bps cut from current"
    }
  ],
  lastUpdated: "2024-11-19T...",
  source: "CME FedWatch Tool",
  note: "Demo data - requires paid subscription"
}
```

## Implementing Real Data

When you're ready to integrate real data:

1. **Sign up** for a market data service (see options above)
2. **Get API credentials** from your provider
3. **Update the API route** (`app/api/cme-fedwatch/route.ts`):
   ```typescript
   // Replace demo data with real API calls
   const response = await fetch('YOUR_DATA_PROVIDER_API', {
     headers: {
       'Authorization': `Bearer ${process.env.MARKET_DATA_API_KEY}`
     }
   });
   ```
4. **Add environment variable**:
   ```bash
   MARKET_DATA_API_KEY=your_api_key_here
   ```
5. **Parse and format** the futures data into probabilities
6. **Remove demo warning** from the component

## Why Demo Data?

We're using demo data because:

✅ Shows the **UI/UX design** and layout  
✅ Demonstrates **how the feature works**  
✅ Provides **realistic examples** of probabilities  
✅ No cost to run the dashboard  
✅ Ready to plug in real data when available

## Comparison with Polymarket

| Feature | CME FedWatch | Polymarket |
|---------|--------------|------------|
| **Data Source** | Fed Funds futures | Prediction markets |
| **Authority** | Industry standard | Decentralized betting |
| **Cost** | Requires subscription | Free public API |
| **Accuracy** | Very high | Generally reliable |
| **Real-time** | Yes (with subscription) | Yes |
| **Professional Use** | Widely used on Wall Street | Emerging |

## Recommendation

For a **production dashboard**:

1. **Free/Demo Version**: Keep current implementation with demo data + disclaimer
2. **Paid Version**: Integrate Polygon.io or similar API ($200/month)
3. **Enterprise Version**: Use Bloomberg/Refinitiv if budget allows ($2000+/month)

For **hobbyist/learning purposes**:
- Current demo implementation is sufficient
- Consider switching back to Polymarket for free real-time data

## Resources

- **CME FedWatch Tool**: https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html
- **CME Fed Funds Futures**: https://www.cmegroup.com/markets/interest-rates/stirs/30-day-federal-fund.html
- **FOMC Calendar**: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm

---

**Current Status**: Demo data with full UI/UX implementation, ready for real data integration when budget allows.



