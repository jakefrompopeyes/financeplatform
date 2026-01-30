# 📊 FRED API Setup - Economic Indicators

## What is FRED?

**FRED** (Federal Reserve Economic Data) is a database maintained by the Federal Reserve Bank of St. Louis with over 800,000 economic time series from 100+ sources.

It's the **gold standard** for economic data - free, reliable, and comprehensive!

## 🎯 What You'll Get

### Economic Indicators Available:
1. **Inflation (CPI)** - Consumer Price Index, Year-over-Year %
2. **Unemployment Rate** - U.S. Unemployment Rate %
3. **Federal Funds Rate** - Fed's interest rate %

### Each Indicator Shows:
- ✅ Current value
- ✅ 24 months of historical data
- ✅ Interactive line charts
- ✅ Month-by-month trends

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Your Free FRED API Key

1. **Go to**: https://fred.stlouisfed.org/
2. **Click**: "My Account" (top right)
3. **Sign up** for a free account (takes 2 minutes)
4. **Get API Key**: After logging in, go to "API Keys" → "Request API Key"
5. **Name it**: "Stonkscan" (or anything)
6. **Copy** your API key

**Example API Key**: `abcd1234efgh5678ijkl90mnop123456`

### Step 2: Add to .env.local

Open your `.env.local` file and add:

```env
TWELVE_DATA_API_KEY=85cae53013c54d9d892031c93fc7e310
FRED_API_KEY=your_fred_api_key_here
```

Replace `your_fred_api_key_here` with the key you just copied.

**Windows PowerShell Quick Command:**
```powershell
Add-Content .env.local "`nFRED_API_KEY=your_fred_api_key_here"
```

### Step 3: Restart Your Server

```bash
# Press Ctrl+C to stop
npm run dev
```

**That's it!** The Economic Indicators section will now show real data! 🎉

## 📊 What You'll See

### Economic Indicators Section

```
┌────────────────────────────────┐
│ Inflation (CPI)                │
│ 3.24%                          │
│ [24-month trend chart]         │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Unemployment Rate              │
│ 3.7%                           │
│ [24-month trend chart]         │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Federal Funds Rate             │
│ 5.33%                          │
│ [24-month trend chart]         │
└────────────────────────────────┘
```

## 📈 Data Details

### Inflation (CPI)
- **What it is**: Year-over-year inflation rate
- **Source**: Bureau of Labor Statistics
- **Updates**: Monthly (released ~mid-month)
- **Series ID**: CPIAUCSL (Consumer Price Index for All Urban Consumers)

### Unemployment Rate
- **What it is**: Percentage of labor force unemployed
- **Source**: Bureau of Labor Statistics
- **Updates**: Monthly (released first Friday of month)
- **Series ID**: UNRATE

### Federal Funds Rate
- **What it is**: Target interest rate set by Federal Reserve
- **Source**: Federal Reserve
- **Updates**: After FOMC meetings (~8 times per year)
- **Series ID**: FEDFUNDS

## 🔄 Update Frequency

- **Data Freshness**: FRED updates within hours of official releases
- **Dashboard Refresh**: Data loads on page refresh
- **Historical Data**: Last 24 months displayed
- **No Rate Limits**: FRED is very generous with free tier

## 💡 Why FRED?

### Advantages:
- ✅ **Free Forever**: No paid tiers, always free
- ✅ **Authoritative**: Direct from Federal Reserve
- ✅ **Reliable**: 99.9%+ uptime
- ✅ **Comprehensive**: 800,000+ economic series
- ✅ **Well-Documented**: Excellent API docs
- ✅ **No Rate Limits**: (for reasonable use)

### vs Other Options:
- **Twelve Data**: Doesn't have economic indicators
- **Alpha Vantage**: Has some, but limited
- **Financial Modeling Prep**: Requires paid plan for economics
- **FRED**: ✅ Best option for economic data!

## 🛠️ Customization

### Add More Indicators

Edit `app/api/economic-indicators-fred/route.ts`:

```typescript
const seriesIds = {
  cpi: 'CPIAUCSL',
  unemployment: 'UNRATE',
  fedFunds: 'FEDFUNDS',
  // Add more:
  gdp: 'GDP',              // Gross Domestic Product
  pce: 'PCEPI',            // Personal Consumption Expenditures
  retail: 'RSXFS',         // Retail Sales
  housing: 'HOUST',        // Housing Starts
};
```

**Find Series IDs**: https://fred.stlouisfed.org/

### Change Historical Range

Edit line 22 in `app/api/economic-indicators-fred/route.ts`:

```typescript
// Current: Last 24 months
&limit=24

// Change to:
&limit=36  // 36 months (3 years)
&limit=60  // 60 months (5 years)
&limit=120 // 120 months (10 years)
```

## 🔍 Troubleshooting

### Issue: "FRED API key not configured"
**Solution:**
1. Check `.env.local` exists in project root
2. Verify line says: `FRED_API_KEY=your_actual_key`
3. No spaces around the `=`
4. Restart dev server

### Issue: "Failed to fetch economic indicators"
**Solution:**
1. Check API key is valid at fred.stlouisfed.org
2. Check internet connection
3. Look at browser console (F12) for specific error
4. Verify FRED API is up: https://fred.stlouisfed.org/

### Issue: Charts not showing
**Solution:**
1. Data loads on page refresh (not auto-refresh)
2. Hard refresh: `Ctrl + Shift + R`
3. Check browser console for errors
4. Verify data is being received

### Issue: Old data showing
**Solution:**
- Economic data updates monthly
- CPI: Mid-month (around 15th)
- Unemployment: First Friday of month
- Fed Funds: After FOMC meetings
- This is normal - not all data updates daily!

## 📊 Data Interpretation

### Inflation (CPI)
- **< 2%**: Low inflation (Fed's target)
- **2-3%**: Normal, healthy
- **> 4%**: High inflation
- **> 7%**: Very high inflation

### Unemployment
- **< 4%**: Very low (tight labor market)
- **4-6%**: Normal range
- **> 7%**: High unemployment
- **> 10%**: Economic crisis levels

### Fed Funds Rate
- **0-1%**: Ultra-low (stimulus mode)
- **2-4%**: Normal range
- **> 5%**: High rates (fighting inflation)
- **> 7%**: Very high (like early 1980s)

## 🎯 Dashboard Integration

### Where It Appears:
```
1. Stock Market Overview
2. Cryptocurrency Prices
3. 📊 Economic Indicators ← HERE
4. Technical Indicators
```

### What Changed:
- **Before**: "Not Available" message
- **After**: Real economic data with charts!

## 📱 Responsive Design

- **Desktop**: 3 cards side-by-side
- **Tablet**: 2-3 cards per row
- **Mobile**: Stacked vertically

## ✅ Summary

You now have:
- ✅ Real inflation data from Federal Reserve
- ✅ Current unemployment rate
- ✅ Federal Funds Rate (Fed's interest rate)
- ✅ 24 months of historical charts for each
- ✅ Free forever (no paid tiers)
- ✅ Authoritative government data
- ✅ Beautiful visualization

## 🔗 Useful Links

- **FRED Homepage**: https://fred.stlouisfed.org/
- **API Documentation**: https://fred.stlouisfed.org/docs/api/
- **Series Search**: https://fred.stlouisfed.org/tags/series
- **API Key Management**: https://fred.stlouisfed.org/docs/api/api_key.html

---

**Ready!** Get your FRED API key, add it to `.env.local`, restart the server, and enjoy real economic data! 📊📈




