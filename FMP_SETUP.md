# FMP (Financial Modeling Prep) API Setup

Stock market data (market overview, quotes, search, top movers, heatmap, macro charts) now uses **Financial Modeling Prep (FMP)** instead of Twelve Data.

## Quick Setup

### 1. Get an API key

- Sign up at [Financial Modeling Prep](https://site.financialmodelingprep.com/register).
- Copy your API key from the [Dashboard](https://site.financialmodelingprep.com/developer/docs/dashboard) under **API Keys**.

### 2. Configure environment

In your project root, create or edit `.env.local`:

```env
FMP_API_KEY=your_fmp_api_key_here
```

Replace `your_fmp_api_key_here` with your actual key.

### 3. Restart the dev server

If the server is running, stop it (`Ctrl+C`) and start again:

```bash
npm run dev
```

## What uses FMP

| Feature           | Endpoint / usage                          |
|-------------------|-------------------------------------------|
| Market Overview   | SPY, QQQ, DIA quotes + historical         |
| Price Ticker      | Batch quote for popular stocks            |
| Stock Search      | Symbol/company search                     |
| Stock Details     | Quote + optional historical EOD           |
| Top Movers        | Batch quote for tracked symbols           |
| Market Heatmap    | Batch quote for sector ETFs + stocks      |
| Macro Charts      | SPY historical for S&P 500 vs Fed         |
| Insider Trading   | Search insider trades by symbol (stock page) |

## Benefits of FMP

- **Batch quotes**: One request for many symbols (e.g. `batch-quote?symbols=AAPL,MSFT,...`), so fewer calls and no need for long delays between requests.
- **Economics & fundamentals**: FMP provides economic indicators and company data, so you can extend the app without adding another provider for those.
- **Historical EOD**: Full historical price/volume via `historical-price-eod/full`.
- **Search**: Symbol and company search with `search-symbol` and related endpoints.

## API base and auth

- **Base URL**: `https://financialmodelingprep.com/stable`
- **Auth**: Add `apikey=YOUR_FMP_API_KEY` to each request.

Example:

```
https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=YOUR_KEY
```

## Troubleshooting

- **"API key not configured"**  
  Ensure `FMP_API_KEY` is set in `.env.local` and you’ve restarted the dev server.

- **403 / invalid key**  
  Check the key in the [FMP Dashboard](https://site.financialmodelingprep.com/developer/docs/dashboard) and that there are no extra spaces in `.env.local`.

- **429 rate limit**  
  FMP has rate limits per plan. The app uses batch endpoints to reduce calls; if you hit limits, add caching or reduce refresh frequency.

## Docs and resources

- [FMP API Documentation](https://site.financialmodelingprep.com/developer/docs)
- [Quickstart](https://site.financialmodelingprep.com/developer/docs/quickstart)
- [Pricing](https://site.financialmodelingprep.com/developer/docs/pricing)
