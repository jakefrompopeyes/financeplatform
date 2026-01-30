# 🚀 Getting Started with Stonkscan

## What You've Got

A fully functional financial dashboard with:

### ✅ Complete Features
- **Real-time Market Data**: S&P 500, NASDAQ, Dow Jones with live updates
- **Economic Indicators**: CPI, Unemployment Rate, Federal Funds Rate
- **Technical Analysis**: Full suite of indicators for any stock symbol
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Easy on the eyes with your custom color scheme

### ✅ Modern Tech Stack
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for beautiful components
- Recharts for interactive charts

## 🏃 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Add Your API Key
1. Get a free API key from https://financialmodelingprep.com/
2. Copy `.env.example` to `.env.local`
3. Add your key: `FMP_API_KEY=your_key_here`

### Step 3: Run It!
```bash
npm run dev
```

Open http://localhost:3000 and you're done! 🎉

## 📖 What Each File Does

### Core Pages
- `app/page.tsx` - Main dashboard page (combines all sections)
- `app/layout.tsx` - Root layout with fonts and metadata
- `app/globals.css` - Your custom dark theme colors

### Components
- `components/dashboard/MarketOverview.tsx` - Stock market indices with sparklines
- `components/dashboard/EconomicIndicators.tsx` - Economic data with 24-month charts
- `components/dashboard/TechnicalIndicators.tsx` - Technical analysis with search

### API Routes (Server-Side)
- `app/api/market-overview/route.ts` - Fetches S&P, NASDAQ, Dow data
- `app/api/economic-indicators/route.ts` - Fetches CPI, unemployment, Fed rate
- `app/api/technical-indicators/route.ts` - Fetches technical indicators for stocks

### UI Components (shadcn/ui)
- `components/ui/button.tsx` - Button component
- `components/ui/card.tsx` - Card container component
- `components/ui/input.tsx` - Input field component
- `components/ui/label.tsx` - Label component

## 🎨 Your Custom Theme

The design follows your specifications:
- **Background**: #1E1E1E (dark grey)
- **Cards**: #2A2A2A (slightly lighter)
- **Text**: #EDEDED (soft white)
- **Accent**: #4A90E2 (sharp blue)
- **Font**: Inter, light weight (300-400)

## 🔧 Customization Ideas

### Change Auto-Refresh Interval
In `components/dashboard/MarketOverview.tsx`, line 31:
```typescript
const interval = setInterval(fetchData, 60000); // Change 60000 to desired milliseconds
```

### Add More Market Indices
In `app/api/market-overview/route.ts`, line 7:
```typescript
const symbols = ['^GSPC', '^IXIC', '^DJI', '^RUT']; // Add Russell 2000
```

### Change Default Stock Symbol
In `components/dashboard/TechnicalIndicators.tsx`, line 38:
```typescript
const [symbol, setSymbol] = useState('TSLA'); // Change from 'AAPL'
```

### Modify Chart Colors
In any component file, find the Recharts `<Line>` components:
```typescript
<Line stroke="#YOUR_COLOR" />
```

## 📊 Dashboard Sections Explained

### 1. Stock Market Overview
- Shows 3 major indices
- Auto-refreshes every minute
- 7-day sparklines show quick trends
- Green/red indicators for gains/losses

### 2. Economic Indicators
- Historical data: 24 months of trends
- CPI: Inflation rate (year-over-year)
- Unemployment: Current jobless rate
- Fed Rate: Federal Reserve's interest rate

### 3. Technical Indicators
- Search any stock ticker (AAPL, TSLA, MSFT, etc.)
- **SMA**: Simple Moving Averages (20 & 50 day)
- **EMA**: Exponential Moving Averages (12 & 26 day)
- **RSI**: Relative Strength Index (overbought/oversold)
- **MACD**: Momentum indicator
- **Bollinger Bands**: Volatility bands around price

## 🚢 Deploying to Production

### Option 1: Vercel (Easiest)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variable in Vercel dashboard:
# FMP_API_KEY = your_key_here
```

### Option 2: Build Locally
```bash
npm run build
npm start
```

## 📈 API Usage Tips

Free tier limits: **250 requests/day**

Your dashboard uses:
- ~3 requests on page load
- 1 request/minute for market refresh
- 1 request per stock symbol search

**Daily usage estimate**: ~100-150 requests (well within limits!)

## 🆘 Common Issues

**Dashboard shows "Failed to fetch"**
→ Check your API key in `.env.local` and restart the dev server

**Charts not showing**
→ API might be rate-limited. Wait a few minutes and refresh

**TypeScript errors**
→ Run `npm install` again to ensure all dependencies are installed

**Styles look wrong**
→ Make sure `app/globals.css` is imported in `app/layout.tsx`

## 🎯 Next Steps

1. **Run it locally**: Follow the Quick Start above
2. **Explore the code**: Check out the component files
3. **Customize it**: Change colors, add features, make it yours!
4. **Deploy it**: Put it online with Vercel
5. **Share it**: Show off your financial dashboard!

## 📚 Learn More

- **Next.js**: https://nextjs.org/docs
- **FMP API**: https://financialmodelingprep.com/developer/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Recharts**: https://recharts.org/

---

**You're all set!** Run `npm install && npm run dev` and start tracking markets! 📈

Questions? Check SETUP.md for detailed troubleshooting.




