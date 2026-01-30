# Polymarket Integration - Fed Decision in December

## Overview

This integration displays real-time prediction market data from the specific Polymarket market: **["Fed decision in December?"](https://polymarket.com/event/fed-decision-in-december)**

## Market Details

### What This Market Tracks

The market asks what the Federal Reserve will do at their **December 9-10, 2025 FOMC meeting** regarding interest rates.

### Four Possible Outcomes

Based on the current live market data:

1. **25 bps decrease** - 52% probability 🟢
2. **No change** - 47% probability 🟡  
3. **50+ bps decrease** - 2.3% probability 🟢
4. **25+ bps increase** - 0.6% probability 🔴

### Market Stats

- **Total Volume**: $113.7M+ in trading volume
- **End Date**: December 10, 2025
- **Market URL**: https://polymarket.com/event/fed-decision-in-december

## How It Works

### API Integration

The integration fetches data from Polymarket's public Gamma API:

```
https://gamma-api.polymarket.com/markets
```

The API searches for markets with:
- **Exact question match**: "Fed decision in December?"
- **Slug match**: "fed-decision-in-december"
- **Content match**: Markets containing "fed decision" and "december"

### Data Display

The component displays:

1. **Market Question** - The exact question from Polymarket
2. **Sorted Outcomes** - All outcomes sorted by probability (highest first)
3. **Visual Probability Bars** - Color-coded:
   - 🟢 **Green** for rate decreases/cuts
   - 🔴 **Red** for rate increases/hikes  
   - 🟡 **Amber** for "no change"
4. **Market Metadata**:
   - Trading volume
   - Market close date
   - Direct link to view on Polymarket

### Auto-Refresh

- Data refreshes every **5 minutes**
- API responses are cached for 5 minutes server-side
- Real-time updates as market sentiment changes

## Color Coding Logic

```typescript
if (outcome includes "decrease" or "cut") → Green bar
else if (outcome includes "increase" or "hike") → Red bar
else if (outcome includes "no change" or "pause") → Amber bar
else → Blue bar (default)
```

## Demo Data Fallback

If the API can't find the market or is unavailable, demo data is shown with:
- The 4 outcomes and their approximate probabilities
- A warning banner indicating it's demo data
- The actual Polymarket URL for reference

## Technical Details

### Files

- **API Route**: `app/api/polymarket-rates/route.ts`
- **Component**: `components/dashboard/RatePredictions.tsx`
- **Main Page**: `app/page.tsx`

### API Response Format

```typescript
{
  markets: [{
    id: string,
    question: string,
    probabilities: [
      { outcome: string, probability: number }
    ],
    volume: number,
    liquidity: number,
    endDate: string,
    active: boolean,
    url: string,
    demo?: boolean
  }],
  lastUpdated: string,
  source: "Polymarket",
  note?: string
}
```

## Why This Market?

This specific market is ideal because:

1. **High Volume** - Over $113M in trading volume shows strong market interest
2. **Multiple Outcomes** - Shows nuanced expectations (not just yes/no)
3. **Near-Term** - December 2025 is close enough to be relevant
4. **Official Source** - Resolves based on official Fed statements
5. **Clear Question** - Unambiguous outcomes based on basis points

## Understanding the Probabilities

The market shows that as of now:
- **52%** chance of a 25 basis point cut (most likely)
- **47%** chance the Fed keeps rates unchanged (almost equally likely)
- **2.3%** chance of a larger 50+ basis point cut (unlikely)
- **<1%** chance of a rate increase (very unlikely)

This gives your users a clear view of market expectations for the Fed's next move!

## No API Key Required

Unlike other data sources, Polymarket's public API is **completely free** and requires no authentication. The integration works out of the box.

## Future Enhancements

Potential additions:
- Show historical probability changes over time
- Add charts showing how probabilities shifted
- Include analysis of why probabilities might be changing
- Show related Fed decision markets for future meetings

---

**Live Market**: [View on Polymarket →](https://polymarket.com/event/fed-decision-in-december)



