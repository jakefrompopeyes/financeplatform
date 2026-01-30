# AI Assistant Setup Guide

The AI Assistant feature allows users to ask questions about stock valuations, metrics, and market trends. It uses OpenAI's GPT-4 to provide intelligent, context-aware explanations.

## Features

- 💬 Interactive chat interface for stock questions
- 🧠 Context-aware responses based on current stock data
- 📊 Explains valuations, metrics (P/E, EPS, Market Cap, etc.)
- 💡 Provides educational insights without specific investment advice
- 🔄 Maintains conversation history for follow-up questions

## Setup Instructions

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy your API key (starts with `sk-...`)

**Important:** Keep your API key secure and never commit it to version control!

### Step 2: Add API Key to Your Project

#### Option A: Using PowerShell Script (Windows - Recommended)

Run this command in PowerShell:

```powershell
.\setup-api-key.ps1
```

When prompted, enter your OpenAI API key.

#### Option B: Manual Setup

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

3. Restart your development server

### Step 3: Verify Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:3000`

3. Search for a stock and open its details

4. Click the **"Ask AI"** button (with sparkles icon ✨)

5. Try asking a question like:
   - "What does the P/E ratio tell me about this stock?"
   - "Is this stock overvalued or undervalued?"
   - "Explain the current price trend"

## Using the AI Assistant

### Opening the AI Assistant

1. Click on any stock to open the Stock Detail Modal
2. Click the **"Ask AI"** button in the top-right corner
3. The AI Assistant window will open with suggested questions

### Suggested Questions

The AI can help with:

- **Valuation Questions**: "Is this stock overvalued based on its P/E ratio?"
- **Metric Explanations**: "What does EPS mean and why is it important?"
- **Trend Analysis**: "What does the recent price movement suggest?"
- **Volume Analysis**: "What does high trading volume indicate?"
- **Comparison Questions**: "How does this compare to industry averages?"

### Tips for Better Responses

- Be specific with your questions
- Ask about one topic at a time
- Use follow-up questions to dive deeper
- Reference specific metrics when asking (e.g., "Explain the P/E ratio")

## Cost Management

The AI Assistant uses OpenAI's `gpt-4o-mini` model, which is cost-effective:

- **Cost**: ~$0.15 per 1 million input tokens, ~$0.60 per 1 million output tokens
- **Typical Query**: Costs less than $0.01
- **Daily Usage**: For personal use, expect $1-5/month depending on usage

### Monitoring Usage

1. Check your usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)
2. Set up usage limits in your OpenAI account settings
3. Consider setting up billing alerts

## Troubleshooting

### "OpenAI API key not configured"

**Solution**: Make sure you've added `OPENAI_API_KEY` to your `.env.local` file and restarted the dev server.

### "Invalid OpenAI API key"

**Solution**: 
- Verify your API key is correct
- Make sure it starts with `sk-`
- Check that your OpenAI account is active
- Ensure you have credits/billing set up

### AI responses are slow

**Solution**: 
- This is normal for complex questions
- OpenAI API typically responds in 2-5 seconds
- Check your internet connection

### Rate limit errors

**Solution**:
- You've hit OpenAI's rate limits
- Wait a few minutes before trying again
- Consider upgrading your OpenAI plan for higher limits

## Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Don't share your API key** with others
3. **Rotate your key** if accidentally exposed
4. **Set spending limits** in your OpenAI account
5. **Use environment variables** for all sensitive data

## Model Information

- **Model**: `gpt-4o-mini`
- **Temperature**: 0.7 (balanced creativity and accuracy)
- **Max Tokens**: 800 (sufficient for detailed responses)
- **Context**: Includes current stock data in every request

## Privacy & Disclaimers

- Stock data is sent to OpenAI for processing
- Responses are for educational purposes only
- Not financial advice - always do your own research
- Consult a licensed financial advisor for investment decisions

## Support

If you encounter issues:

1. Check this guide first
2. Verify your API key setup
3. Check OpenAI status at [status.openai.com](https://status.openai.com/)
4. Review the browser console for error messages

## Future Enhancements

Potential future features:

- 📈 Chart analysis and pattern recognition
- 📊 Comparative analysis with other stocks
- 🔔 Custom alerts based on AI insights
- 📝 Export conversation history
- 🌐 Multi-language support

---

**Note**: This feature requires an active OpenAI API key with available credits. New accounts typically receive free trial credits.

