# 🚀 QUICKSTART - Get Running in 3 Steps

Your Twelve Data API key is ready: `85cae53013c54d9d892031c93fc7e310`

## Fastest Setup (Windows)

### Option 1: Double-click the setup file
1. Double-click `setup-api-key.bat` in the project folder
2. Done! The `.env.local` file is created

### Option 2: Run PowerShell script
```powershell
.\setup-api-key.ps1
```

### Option 3: Manual (if scripts don't work)
Create a file named `.env.local` in the project root with this content:
```
TWELVE_DATA_API_KEY=85cae53013c54d9d892031c93fc7e310
```

## Then Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and you're done! 🎉

## What You'll See

✅ **Working:**
- Stock Market Overview (S&P 500, NASDAQ, Dow Jones)
- Technical Indicators (all stocks: AAPL, TSLA, GOOGL, etc.)
- Beautiful charts and real-time data

⚠️ **Note:**
- Economic Indicators section will show a message (not available with Twelve Data)
- Everything else works perfectly!

## Having Issues?

1. Make sure `.env.local` exists in the project root
2. Restart the dev server after creating `.env.local`
3. Check the browser console for errors
4. See [TWELVE_DATA_SETUP.md](TWELVE_DATA_SETUP.md) for detailed troubleshooting

---

**That's it!** Enjoy Stonkscan! 📈




