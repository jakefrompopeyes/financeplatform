# AI Stock Assistant - Quick Start

Get up and running with the AI Stock Assistant in 3 simple steps!

## Step 1: Get Your OpenAI API Key (2 minutes)

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy your API key (starts with `sk-...`)

## Step 2: Add to Your Project (1 minute)

Add your API key to `.env.local`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**Windows PowerShell:**
```powershell
echo "OPENAI_API_KEY=sk-your-key-here" >> .env.local
```

## Step 3: Start Using! (30 seconds)

1. Restart your dev server: `npm run dev`
2. Search for any stock
3. Click the **"Ask AI"** button (✨ sparkles icon)
4. Start asking questions!

## Example Questions to Try

- "What does the P/E ratio tell me about this stock?"
- "Is this stock overvalued or undervalued?"  
- "Explain the current price trend"
- "What does high volume indicate?"
- "How does the EPS compare to industry standards?"

## That's It!

The AI Assistant will provide educational insights based on the current stock data. It's like having a financial analyst explain everything to you in plain English!

---

**Need More Help?** See the full [AI_SETUP.md](AI_SETUP.md) guide for detailed information, troubleshooting, and cost management.

