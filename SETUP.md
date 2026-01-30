# Quick Setup Guide for Stonkscan

## Step-by-Step Installation

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts
- Lucide React icons

### 2. Get Your API Key

1. Visit [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. The free tier includes:
   - 250 requests per day
   - Access to all endpoints used in this project

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp .env.example .env.local
```

Then edit `.env.local` and add your API key:

```env
FMP_API_KEY=your_actual_api_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000)

### 5. Verify Everything Works

You should see:
1. ✅ Market indices (S&P 500, NASDAQ, Dow Jones) loading at the top
2. ✅ Economic indicators (CPI, Unemployment, Fed Rate) in the middle
3. ✅ Technical indicators for AAPL (you can change the symbol)

## Troubleshooting

### API Key Issues

**Error**: `Failed to fetch market data`

**Solution**: 
- Check that your `.env.local` file exists in the root directory
- Verify your API key is correct
- Restart the development server after adding the API key

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**: 
```bash
# Use a different port
npm run dev -- -p 3001
```

### Missing Dependencies

**Error**: Module not found errors

**Solution**: 
```bash
# Delete node_modules and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

### TypeScript Errors

**Solution**: 
```bash
# Check for type errors
npm run build
```

## API Rate Limits

The free FMP API tier has these limits:
- **250 requests per day**
- **5 requests per minute**

The dashboard makes approximately:
- 3 requests on initial load (market overview, economic indicators, technical indicators)
- 1 request per minute for auto-refresh (market overview only)

This means you can use the dashboard for several hours each day without hitting limits.

### Tips to Reduce API Usage:
1. The market overview auto-refreshes every minute - you can increase this interval by editing `components/dashboard/MarketOverview.tsx` (change `60000` to a higher value in milliseconds)
2. Economic indicators and technical data only load once per page load
3. Technical indicators only fetch new data when you search for a different symbol

## Production Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add the `FMP_API_KEY` environment variable in Vercel settings
4. Deploy!

### Other Platforms

For other hosting platforms, ensure:
- Node.js 18+ is available
- Environment variables are configured
- The build command is `npm run build`
- The start command is `npm start`

## Customization

### Change Colors

Edit `app/globals.css` to modify the color scheme:

```css
:root {
  --background: 0 0% 11.8%; /* #1E1E1E */
  --primary: 211 71% 58%; /* #4A90E2 */
  /* ... other colors */
}
```

### Add More Indicators

To add new market indices or economic indicators:
1. Update the API routes in `app/api/`
2. Modify the respective components in `components/dashboard/`

### Change Default Stock Symbol

Edit `components/dashboard/TechnicalIndicators.tsx`:
- Line 38: Change `'AAPL'` to your preferred symbol

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FMP API Documentation](https://financialmodelingprep.com/developer/docs/)
- [Recharts Documentation](https://recharts.org/en-US/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Review the terminal output where the dev server is running
3. Verify your API key is valid and has remaining quota
4. Ensure all environment variables are properly set

---

Happy tracking! 📈




